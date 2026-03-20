# Love2D Dev Tools — VS Code Extension for LÖVE Game Development

The first comprehensive VS Code extension built specifically for Love2D (LÖVE) game developers. 22 free features + 10 Pro features covering IntelliSense, language features, hot reload, profiling, and more.

> Stop juggling separate tools for launching, debugging, and coding your Love2D game. Get a complete development environment — purpose-built for LÖVE.

English | **[日本語](README.ja.md)**

## Why Love2D Dev Tools?

Love2D development in VS Code has been held together with tape. The two existing extensions are either Windows-only, outdated, or barely functional on Mac/Linux. This extension gives you a proper development environment:

- **Launch anywhere** — Windows, Mac, Linux, Flatpak, Snap — auto-detected
- **Write faster** — IntelliSense, Go to Definition, Find References, Inlay Hints, and 26 snippets
- **Debug with one click** — launch.json generation for Local Lua Debugger, just press F5
- **Iterate instantly** — hot reload pushes changes to the running game without restarting (Pro)
- **Inspect at runtime** — Live REPL, Game State Inspector, and Lua Profiler (Pro)
- **Ship on time** — game jam mode with countdown timer and .love file builder (Pro)

## Free Features (22)

### Core

| Feature | Description |
|---------|-------------|
| **Cross-Platform Launch** | Run your game on Windows, Mac, Linux, Flatpak, and Snap. `love` executable auto-detected. `Alt+L` / `Cmd+L` shortcut. |
| **Love2D API IntelliSense** | Full API completion via lua-language-server. One-click setup adds Love2D type definitions to your workspace. |
| **One-Click Debugger Setup** | Generates `launch.json` for Local Lua Debugger. F5 to debug with breakpoints and variable inspection. |
| **Project Templates** | Scaffold new projects: Minimal, Game Jam, or State Machine. Includes `main.lua`, `conf.lua`, folder structure, and `.vscode/extensions.json`. |
| **26 Code Snippets** | `loveload`, `loveupdate`, `lovedraw`, `lovegameloop`, `loveclass` (Classic), `loveaabb`, `lovestate`, `lovetimer`, and more. |
| **Console Output** | `love` process stdout/stderr piped to a VS Code Output Channel. Works on all platforms — no `--console` flag needed. |
| **Status Bar** | Love2D version display, game run state (Running/Stopped), one-click launch/stop. |
| **Sidebar Quick Actions** | Activity bar panel with buttons for launch, stop, IntelliSense setup, debugger setup, and new project. |
| **Third-Party Type Definitions** | Bundled type definitions for Lume, Classic, STI, and Windfield. |
| **Hover Documentation** | Love2D API documentation on hover, powered by lua-language-server. |
| **Full i18n** | English and Japanese localization. |

### Language Features

| Feature | Description |
|---------|-------------|
| **Go to Definition** | Ctrl+Click on `require("module")` to jump to the file. Also resolves local function definitions. |
| **Find All References** | Right-click any symbol to find all references across the workspace. |
| **Document Symbols** | Ctrl+Shift+O to browse functions, modules, and variables in the current file. Also powers the Outline view. |
| **Inlay Hints** | Inline parameter names for Love2D API calls — `rectangle(mode:, x:, y:, width:, height:)`. |
| **Enhanced Diagnostics** | Detects unused `require()` statements and grays them out with a hint diagnostic. |
| **Code Actions** | Quick Fix to remove unused requires. "Generate function" action for undefined function calls. Hex color and 0-255 to 0-1 color conversion. |
| **Color Picker** | Inline color swatches for `love.graphics.setColor()` and `{r, g, b, a}` table literals. Click to open the VS Code color picker. |
| **Color Palette** | Save named colors to `.love-palette.json`. Browse and insert from the sidebar. Version-controllable and team-shareable. |

### Productivity

| Feature | Description |
|---------|-------------|
| **Structured Console** | Enhanced console with timestamped, color-coded log levels (INFO/WARN/ERROR/DEBUG) and table tree display. |
| **Asset Reference Checker** | Scans `love.graphics.newImage()`, `love.audio.newSource()`, etc. and flags missing file paths as VS Code diagnostics. |
| **Dependency Graph** | Interactive Mermaid.js visualization of `require()` dependencies. Click nodes to open files. Circular dependency detection. |
| **Library Manager** | Add Lume, Classic, STI, HUMP, Windfield, Anim8, or Bump to your project with one click. Downloads from GitHub. |

## Pro Features (10) — $12 one-time

Activate with a [Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) license key. No subscription. Works offline.

### Runtime & Debugging

| Feature | Description |
|---------|-------------|
| **Hot Reload** | Save a Lua file and the bridge merges changes into the running game. Existing references stay valid. Configurable debounce. |
| **Live REPL** | Execute Lua code in the running game from a VS Code Webview panel. Command history with arrow keys. |
| **Game State Inspector** | Browse global variables and tables in a sidebar tree view. Auto-refresh. Click to inspect nested tables. |
| **Lua Profiler** | Start/stop profiling with `debug.sethook`. Results displayed as a sortable table with self-time heatmap. |

### Visual Tools

| Feature | Description |
|---------|-------------|
| **Screenshot Preview** | Webview panel showing periodic screenshots from the running game. Configurable interval. |
| **Performance Monitor** | Live FPS, frame time, Lua memory, draw calls, and texture memory in a dedicated webview panel. |
| **Asset Browser** | Sidebar tree view of project images, sounds, fonts, and shaders. Click to preview. Detects unused assets. |
| **Shader Live Edit** | Save a `.glsl` file and the shader is compiled and applied to the running game instantly. |
| **Sprite/Quad Helper** | Open a spritesheet image, drag to select regions, and generate `love.graphics.newQuad()` code. |

### Productivity

| Feature | Description |
|---------|-------------|
| **Game Jam Mode** | Countdown timer in the status bar, one-click `.love` file builder, submission checklist. |

### Bridge Architecture

Pro features communicate with the running game over a TCP socket. The bridge module (`bridge.lua`) uses Love2D's built-in LuaSocket — no external dependencies. It starts automatically when you launch the game through the extension.

## Getting Started

1. Install from the VS Code Marketplace
2. Open a folder containing `main.lua`
3. The extension activates automatically

### Quick Start Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `Love2D: Run Game` | `Alt+L` / `Cmd+L` | Launch the game |
| `Love2D: Setup IntelliSense` | — | Configure lua-language-server + type definitions |
| `Love2D: Setup Debugger` | — | Generate launch.json for F5 debugging |
| `Love2D: New Project` | — | Scaffold a new project from a template |
| `Love2D: Activate Pro License` | — | Enter your Gumroad license key |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `love2d-tools.lovePath` | `""` | Path to `love` executable (empty = auto-detect) |
| `love2d-tools.loveVersion` | `"11.5"` | Love2D version for template generation |
| `love2d-tools.hotReload.debounce` | `300` | Hot reload debounce interval (ms) |
| `love2d-tools.bridge.port` | `0` | Bridge TCP port (0 = auto) |
| `love2d-tools.screenshot.interval` | `500` | Screenshot capture interval (ms) |
| `love2d-tools.inlayHints.enabled` | `true` | Enable/disable Love2D API inlay hints |

## Requirements

- VS Code 1.85.0+
- Love2D (LÖVE) 11.4 or 11.5

Recommended:
- [Lua Language Server](https://marketplace.visualstudio.com/items?itemName=sumneko.lua) (sumneko.lua) for IntelliSense
- [Local Lua Debugger](https://marketplace.visualstudio.com/items?itemName=tomblind.local-lua-debugger-vscode) for breakpoint debugging

## Pro License

Purchase a one-time license on [Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) for $12+.

- One-time purchase, no subscription
- Works offline after activation
- 10 Pro features unlocked immediately

## Support

- [GitHub Issues](https://github.com/youichi-uda/love2d-dev-tools/issues)
- [Discord](https://discord.gg/WraE9PMGj6)

## License

Commercial license — see [LICENSE.md](LICENSE.md) for details.

Free-tier features are available at no cost for personal and commercial projects.
Pro features require a one-time $12 license key.

## Author

**abyo-software** — [abyo.net](https://abyo.net)
