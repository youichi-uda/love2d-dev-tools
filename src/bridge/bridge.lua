--- Love2D Dev Tools — Bridge Module
--- Provides TCP communication between the running game and the VS Code extension.
---
--- Usage: require(".love2d-tools.bridge")
--- Or pass "bridge" as second arg: love . bridge

local socket = require("socket")

local Bridge = {}
Bridge._VERSION = "0.1.0"

local server = nil
local client = nil
local buffer = ""
local PORT = nil
local originalPrint = print

--- Find an available port and start listening.
local function startServer()
    server = socket.tcp()
    server:settimeout(0)

    -- Try configured port or find a free one
    local port = tonumber(os.getenv("LOVE2D_BRIDGE_PORT")) or 0
    local ok, err = server:bind("127.0.0.1", port)
    if not ok then
        originalPrint("[bridge] Failed to bind: " .. tostring(err))
        server:close()
        server = nil
        return
    end

    server:listen(1)
    local _, assignedPort = server:getsockname()
    PORT = assignedPort

    -- Write port to file so the extension can discover it
    local portFile = ".love2d-tools-port"
    local f = io.open(portFile, "w")
    if f then
        f:write(tostring(PORT))
        f:close()
    end

    originalPrint("[bridge] Listening on port " .. PORT)
end

--- Send a JSON message to the connected client.
local function send(data)
    if not client then return end
    local ok, err = client:send(require("json") and require("json").encode(data) .. "\n" or Bridge._encode(data) .. "\n")
    if not ok then
        originalPrint("[bridge] Send error: " .. tostring(err))
        client:close()
        client = nil
    end
end

--- Minimal JSON encoder (no external dependency).
function Bridge._encode(value)
    local t = type(value)
    if t == "string" then
        return '"' .. value:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t') .. '"'
    elseif t == "number" then
        return tostring(value)
    elseif t == "boolean" then
        return value and "true" or "false"
    elseif t == "nil" then
        return "null"
    elseif t == "table" then
        -- Check if array
        local isArray = #value > 0
        if isArray then
            local parts = {}
            for i = 1, #value do
                parts[i] = Bridge._encode(value[i])
            end
            return "[" .. table.concat(parts, ",") .. "]"
        else
            local parts = {}
            for k, v in pairs(value) do
                if type(k) == "string" then
                    parts[#parts + 1] = Bridge._encode(k) .. ":" .. Bridge._encode(v)
                end
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
    end
    return "null"
end

--- Minimal JSON decoder.
function Bridge._decode(str)
    -- Use load to parse JSON (safe subset)
    local fn, err = load("return " .. str:gsub('null', 'nil'):gsub('%[', '{'):gsub('%]', '}'):gsub('"([^"]-)":', '["%1"]='))
    if fn then
        local ok, result = pcall(fn)
        if ok then return result end
    end
    return nil
end

--- Process a single command from the extension.
local function handleCommand(line)
    local msg = Bridge._decode(line)
    if not msg or not msg.cmd then return end

    local id = msg.id
    local response = { id = id, type = "response" }

    if msg.cmd == "reload" then
        local moduleName = msg.module
        if moduleName and package.loaded[moduleName] then
            package.loaded[moduleName] = nil
            local ok, err = pcall(require, moduleName)
            if ok then
                response.success = true
            else
                response.success = false
                response.error = tostring(err)
            end
        else
            response.success = false
            response.error = "Module not loaded: " .. tostring(moduleName)
        end

    elseif msg.cmd == "screenshot" then
        love.graphics.captureScreenshot(function(imageData)
            local fileData = imageData:encode("png")
            local bytes = fileData:getString()
            -- Base64 encode
            local b64 = Bridge._base64(bytes)
            send({ id = id, type = "response", success = true, data = b64 })
        end)
        return -- Response sent asynchronously from callback

    elseif msg.cmd == "eval" then
        local code = msg.code
        if code then
            local fn, compileErr = load(code)
            if fn then
                local ok, result = pcall(fn)
                if ok then
                    response.success = true
                    response.data = tostring(result)
                else
                    response.success = false
                    response.error = tostring(result)
                end
            else
                response.success = false
                response.error = tostring(compileErr)
            end
        end

    elseif msg.cmd == "perf" then
        response.success = true
        response.data = {
            fps = love.timer.getFPS(),
            dt = love.timer.getDelta(),
            memory = collectgarbage("count"),
            drawCalls = love.graphics.getStats and love.graphics.getStats().drawcalls or 0,
            textureMemory = love.graphics.getStats and love.graphics.getStats().texturememory or 0,
        }

    elseif msg.cmd == "ping" then
        response.success = true
        response.data = "pong"
    else
        response.success = false
        response.error = "Unknown command: " .. tostring(msg.cmd)
    end

    send(response)
end

--- Base64 encoding.
function Bridge._base64(data)
    local b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    return (data:gsub(".", function(x)
        local r, byte = "", x:byte()
        for i = 8, 1, -1 do
            r = r .. (byte % 2^i - byte % 2^(i-1) > 0 and "1" or "0")
        end
        return r
    end) .. "0000"):gsub("%d%d%d?%d?%d?%d?", function(x)
        if #x < 6 then return "" end
        local c = 0
        for i = 1, 6 do
            c = c + (x:sub(i, i) == "1" and 2^(6-i) or 0)
        end
        return b:sub(c+1, c+1)
    end) .. ({"", "==", "="})[#data % 3 + 1]
end

--- Override print() to forward output to the extension.
function Bridge._hookPrint()
    print = function(...)
        local args = {...}
        local parts = {}
        for i = 1, select("#", ...) do
            parts[i] = tostring(args[i])
        end
        local message = table.concat(parts, "\t")

        -- Still print to console
        originalPrint(...)

        -- Forward to extension
        send({
            type = "log",
            data = {
                level = "info",
                message = message,
                args = args,
            },
        })
    end
end

--- Poll for new connections and data. Call from love.update().
function Bridge.update()
    if not server then return end

    -- Accept new connections
    if not client then
        local newClient = server:accept()
        if newClient then
            newClient:settimeout(0)
            client = newClient
            originalPrint("[bridge] Client connected")
        end
    end

    -- Read data from client
    if client then
        while true do
            local line, err = client:receive("*l")
            if line then
                handleCommand(line)
            else
                if err == "closed" then
                    originalPrint("[bridge] Client disconnected")
                    client = nil
                end
                break
            end
        end
    end
end

--- Clean up on exit.
function Bridge.quit()
    if client then client:close() end
    if server then server:close() end
    os.remove(".love2d-tools-port")
end

--- Initialize the bridge.
function Bridge.init()
    startServer()
    Bridge._hookPrint()

    -- Hook into love.update
    local originalUpdate = love.update or function() end
    love.update = function(dt)
        Bridge.update()
        originalUpdate(dt)
    end

    -- Hook into love.quit
    local originalQuit = love.quit or function() end
    love.quit = function()
        Bridge.quit()
        return originalQuit()
    end
end

-- Auto-initialize when required
Bridge.init()

return Bridge
