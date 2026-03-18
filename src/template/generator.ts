import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface TemplateChoice {
  label: string;
  description: string;
  id: string;
}

/**
 * Generate a new Love2D project from a template.
 */
export async function generateProject(): Promise<void> {
  // Step 1: Pick template
  const templates: TemplateChoice[] = [
    {
      id: 'minimal',
      label: vscode.l10n.t('Minimal — main.lua + conf.lua only'),
      description: 'main.lua, conf.lua',
    },
    {
      id: 'gamejam',
      label: vscode.l10n.t('Game Jam — organized structure with states'),
      description: 'main.lua, conf.lua, states/, assets/',
    },
    {
      id: 'state-machine',
      label: vscode.l10n.t('State Machine — full state management pattern'),
      description: 'main.lua, conf.lua, states/, lib/, assets/',
    },
  ];

  const selected = await vscode.window.showQuickPick(templates, {
    placeHolder: vscode.l10n.t('Select project template'),
  });
  if (!selected) return;

  // Step 2: Pick folder
  const folders = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: vscode.l10n.t('Select folder for new project'),
  });
  if (!folders || folders.length === 0) return;

  const targetDir = folders[0].fsPath;

  // Get version from settings or detection
  const config = vscode.workspace.getConfiguration('love2d-tools');
  const version = config.get<string>('loveVersion', '11.5');

  // Generate files based on template
  switch (selected.id) {
    case 'minimal':
      generateMinimal(targetDir, version);
      break;
    case 'gamejam':
      generateGameJam(targetDir, version);
      break;
    case 'state-machine':
      generateStateMachine(targetDir, version);
      break;
  }

  // Generate .vscode/extensions.json
  generateExtensionsJson(targetDir);

  vscode.window
    .showInformationMessage(
      vscode.l10n.t('Project created successfully at {0}.', targetDir),
      vscode.l10n.t('Open Project'),
    )
    .then((choice) => {
      if (choice === vscode.l10n.t('Open Project')) {
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetDir));
      }
    });
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function generateConfLua(version: string, title: string = 'My Game'): string {
  return `function love.conf(t)
    t.title = "${title}"
    t.version = "${version}"
    t.window.width = 800
    t.window.height = 600
    t.console = false
end
`;
}

function generateMinimal(dir: string, version: string): void {
  writeFile(path.join(dir, 'conf.lua'), generateConfLua(version));

  writeFile(path.join(dir, 'main.lua'), `function love.load()
    -- Initialize your game here
end

function love.update(dt)
    -- Update game logic here
end

function love.draw()
    love.graphics.print("Hello, Love2D!", 400, 300)
end
`);
}

function generateGameJam(dir: string, version: string): void {
  writeFile(path.join(dir, 'conf.lua'), generateConfLua(version, 'Game Jam Entry'));

  writeFile(path.join(dir, 'main.lua'), `-- Game Jam Template
-- Organized structure for rapid game development

local currentState = nil

function love.load()
    -- Load initial state
    currentState = require("states.game")
    if currentState.load then currentState.load() end
end

function love.update(dt)
    if currentState and currentState.update then
        currentState.update(dt)
    end
end

function love.draw()
    if currentState and currentState.draw then
        currentState.draw()
    end
end

function love.keypressed(key)
    if key == "escape" then
        love.event.quit()
    end
    if currentState and currentState.keypressed then
        currentState.keypressed(key)
    end
end

-- Switch to a new state
function switchState(stateName)
    if currentState and currentState.unload then
        currentState.unload()
    end
    currentState = require("states." .. stateName)
    if currentState.load then currentState.load() end
end
`);

  writeFile(path.join(dir, 'states', 'game.lua'), `local game = {}

function game.load()
    -- Load game resources
end

function game.update(dt)
    -- Update game logic
end

function game.draw()
    love.graphics.print("Game State", 400, 300)
end

function game.keypressed(key)
    -- Handle input
end

return game
`);

  // Create asset directories
  ensureDir(path.join(dir, 'assets', 'images'));
  ensureDir(path.join(dir, 'assets', 'sounds'));
  ensureDir(path.join(dir, 'assets', 'fonts'));
}

function generateStateMachine(dir: string, version: string): void {
  writeFile(path.join(dir, 'conf.lua'), generateConfLua(version, 'My Game'));

  writeFile(path.join(dir, 'lib', 'state.lua'), `--- Simple state machine manager.
local StateManager = {}
StateManager.__index = StateManager

function StateManager.new()
    return setmetatable({
        states = {},
        current = nil,
    }, StateManager)
end

function StateManager:add(name, state)
    self.states[name] = state
end

function StateManager:switch(name, ...)
    if self.current and self.current.exit then
        self.current:exit()
    end
    self.current = self.states[name]
    if self.current and self.current.enter then
        self.current:enter(...)
    end
end

function StateManager:update(dt)
    if self.current and self.current.update then
        self.current:update(dt)
    end
end

function StateManager:draw()
    if self.current and self.current.draw then
        self.current:draw()
    end
end

function StateManager:keypressed(key)
    if self.current and self.current.keypressed then
        self.current:keypressed(key)
    end
end

function StateManager:mousepressed(x, y, button)
    if self.current and self.current.mousepressed then
        self.current:mousepressed(x, y, button)
    end
end

return StateManager
`);

  writeFile(path.join(dir, 'main.lua'), `local StateManager = require("lib.state")

local sm = StateManager.new()

function love.load()
    sm:add("menu", require("states.menu"))
    sm:add("game", require("states.game"))
    sm:switch("menu")
end

function love.update(dt)
    sm:update(dt)
end

function love.draw()
    sm:draw()
end

function love.keypressed(key)
    if key == "escape" then
        love.event.quit()
    end
    sm:keypressed(key)
end

function love.mousepressed(x, y, button)
    sm:mousepressed(x, y, button)
end

-- Expose globally so states can switch
function switchState(name, ...)
    sm:switch(name, ...)
end
`);

  writeFile(path.join(dir, 'states', 'menu.lua'), `local menu = {}

function menu:enter()
    -- Called when entering this state
end

function menu:update(dt)
    -- Update menu logic
end

function menu:draw()
    love.graphics.printf("Press ENTER to start", 0, 280, love.graphics.getWidth(), "center")
end

function menu:keypressed(key)
    if key == "return" then
        switchState("game")
    end
end

function menu:exit()
    -- Cleanup when leaving this state
end

return menu
`);

  writeFile(path.join(dir, 'states', 'game.lua'), `local game = {}

function game:enter()
    self.x = 400
    self.y = 300
    self.speed = 200
end

function game:update(dt)
    if love.keyboard.isDown("left") then self.x = self.x - self.speed * dt end
    if love.keyboard.isDown("right") then self.x = self.x + self.speed * dt end
    if love.keyboard.isDown("up") then self.y = self.y - self.speed * dt end
    if love.keyboard.isDown("down") then self.y = self.y + self.speed * dt end
end

function game:draw()
    love.graphics.circle("fill", self.x, self.y, 20)
    love.graphics.print("Arrow keys to move, ESC to quit", 10, 10)
end

function game:keypressed(key)
    -- Handle game input
end

function game:exit()
    -- Cleanup
end

return game
`);

  ensureDir(path.join(dir, 'assets', 'images'));
  ensureDir(path.join(dir, 'assets', 'sounds'));
  ensureDir(path.join(dir, 'assets', 'fonts'));
}

function generateExtensionsJson(dir: string): void {
  const vscodeDir = path.join(dir, '.vscode');
  ensureDir(vscodeDir);

  const extensionsJson = {
    recommendations: [
      'abyo-software.love2d-dev-tools',
      'sumneko.lua',
      'tomblind.local-lua-debugger-vscode',
    ],
  };

  writeFile(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensionsJson, null, 2),
  );
}
