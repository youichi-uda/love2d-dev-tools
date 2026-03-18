# Love2D Dev Tools — VS Code Extension for LÖVE Game Development

The first comprehensive VS Code extension built specifically for Love2D (LÖVE) game developers. 11 free features + 7 Pro features covering IntelliSense, debugging, hot reload, and more.

> Stop juggling separate tools for launching, debugging, and coding your Love2D game. Get a complete development environment — purpose-built for LÖVE.

English | **[日本語](README.ja.md)**

## Why Love2D Dev Tools?

Love2D development in VS Code has been held together with tape. The two existing extensions are either Windows-only, outdated, or barely functional on Mac/Linux. This extension gives you a proper development environment:

- **Launch anywhere** — Windows, Mac, Linux, Flatpak, Snap — auto-detected
- **Write faster** — IntelliSense powered by lua-language-server with Love2D type definitions
- **Debug with one click** — launch.json generation for Local Lua Debugger, just press F5
- **Iterate instantly** — hot reload pushes changes to the running game without restarting (Pro)
- **Ship on time** — game jam mode with countdown timer and .love file builder (Pro)

## Free Features (11)

| Feature | Description |
|---------|-------------|
| **Cross-Platform Launch** | Run your game on Windows, Mac, Linux, Flatpak, and Snap. `love` executable auto-detected. `Alt+L` / `Cmd+L` shortcut. |
| **Love2D API IntelliSense** | Full API completion via lua-language-server. One-click setup adds Love2D type definitions to your workspace. |
| **One-Click Debugger Setup** | Generates `launch.json` for Local Lua Debugger. F5 to debug with breakpoints and variable inspection. |
| **Project Templates** | Scaffold new projects: Minimal, Game Jam, or State Machine. Includes `main.lua`, `conf.lua`, folder structure, and `.vscode/extensions.json`. |
| **26 Code Snippets** | `love-load`, `love-update`, `love-draw`, `love-gameloop`, `love-class` (Classic), `love-aabb`, `love-state`, `love-timer`, and more. |
| **Console Output** | `love` process stdout/stderr piped to a VS Code Output Channel. Works on all platforms — no `--console` flag needed. |
| **Status Bar** | Love2D version display, game run state (Running/Stopped), one-click launch/stop. |
| **Sidebar Quick Actions** | Activity bar panel with buttons for launch, stop, IntelliSense setup, debugger setup, and new project. |
| **Third-Party Type Definitions** | Bundled type definitions for Lume, Classic, STI, and Windfield. |
| **Hover Documentation** | Love2D API documentation on hover, powered by lua-language-server. |
| **Full i18n** | English and Japanese localization. |

## Pro Features (7) — $12 one-time

Activate with a [Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) license key. No subscription. Works offline.

| Feature | Description |
|---------|-------------|
| **Hot Reload** | Save a Lua file → bridge clears `package.loaded` and re-requires the module. Game state preserved. Configurable debounce. |
| **Screenshot Preview** | Webview panel showing periodic screenshots from the running game via the bridge. Configurable interval. |
| **Structured Console** | Enhanced console with timestamped, color-coded log levels (INFO/WARN/ERROR/DEBUG) and table tree display. |
| **Asset Reference Checker** | Scans `love.graphics.newImage()`, `love.audio.newSource()`, etc. and flags missing file paths as VS Code diagnostics. |
| **Performance Monitor** | Live FPS, frame time, Lua memory, draw calls, and texture memory in a dedicated webview panel. |
| **Game Jam Mode** | Countdown timer in the status bar, one-click `.love` file builder, submission checklist. |
| **Library Manager** | Add Lume, Classic, STI, HUMP, Windfield, Anim8, or Bump to your project with one click. Downloads from GitHub. |

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
- 7 additional features unlocked immediately

## Support

- [GitHub Issues](https://github.com/youichi-uda/love2d-dev-tools/issues)
- [Discord](https://discord.gg/CDFmWGkfDC)

## License

Commercial license — see [LICENSE.md](LICENSE.md) for details.

Free-tier features are available at no cost for personal and commercial projects.
Pro features require a one-time $12 license key.

## Author

**abyo-software** (Youichi Uda) — [abyo.net](https://abyo.net)
