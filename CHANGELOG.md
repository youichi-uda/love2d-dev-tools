# Changelog

## [1.2.1] - 2026-06-08

### Fixed
- **Hot Reload not working on any platform** (#1) — `bridge.lua` was excluded from the packaged extension via `.vscodeignore`, so the bridge module was never deployed to the user's project. The injected `pcall(require, "_love2d_tools_bridge")` in `main.lua` silently failed, the bridge TCP server never started, no port file appeared, and file save events found `bridge.connected === false` and exited early. Added `!src/bridge/bridge.lua` exception to `.vscodeignore`. All bridge-based Pro features (Hot Reload, REPL, Screenshot Preview, Performance Monitor, Profiler, Shader Live Edit, Game State Inspector) were affected.

## [1.2.0] - 2026-03-23

### Added
- **Palette Autocomplete** — type a palette color name inside a string literal (e.g. `"sky_blue"`) and see completion suggestions with color preview; selecting one replaces the string with the `{r, g, b}` color table
- **Apply Palette Color** command — place cursor on any Love2D color, run "Love2D: Apply Palette Color" to pick from saved palette via QuickPick list with hex preview
- Right-click context menu: "Apply Palette Color" in Lua editor
- Quick Actions sidebar: "Apply Palette Color" button in Tools section

## [1.1.1] - 2026-03-20

### Fixed
- Update Discord invite URL

## [1.1.0] - 2026-03-20

### Added
- **Color Palette** — save named colors to `.love-palette.json`, browse and insert from the sidebar tree view. Version-controllable and team-shareable.
- **Hex Color Conversion** — code action to convert `"#RRGGBB"` / `"#RRGGBBAA"` to Love2D 0-1 float values or `{r, g, b}` table literals
- **0-255 to 0-1 Conversion** — code action to convert old-style `setColor(255, 128, 64)` and `{255, 128, 64}` to modern 0-1 range
- Right-click context menu: "Save Color to Palette" in Lua editor

### Changed
- **Structured Console** moved from Pro to Free
- **Asset Reference Checker** moved from Pro to Free
- **Dependency Graph** moved from Pro to Free
- **Library Manager** moved from Pro to Free
- Feature count updated: 22 Free / 10 Pro (was 18 Free / 14 Pro)
- Sidebar Quick Actions reorganized: new "Tools" section for free productivity features

## [1.0.0] - 2026-03-19

Initial public release.

### Added

#### Free Language Features (7 new)
- **Go to Definition** — Ctrl+Click on `require()` to jump to the file; resolves local function definitions
- **Find All References** — workspace-wide symbol reference search
- **Document Symbols** — Ctrl+Shift+O outline for functions, modules, and variables
- **Inlay Hints** — inline parameter names for Love2D API calls (e.g. `rectangle(mode:, x:, y:, ...)`)
- **Enhanced Diagnostics** — detects unused `require()` statements with gray-out hint
- **Code Actions** — Quick Fix to remove unused requires; "Generate function" for undefined calls
- **Color Picker** — inline color swatches for `setColor()` and `{r, g, b, a}` tables with VS Code picker

#### Pro Features (7 new)
- **Live REPL** — execute Lua in the running game from a Webview panel with command history
- **Game State Inspector** — sidebar tree view of global variables/tables with auto-refresh
- **Asset Browser** — sidebar tree of images, sounds, fonts, shaders with preview and unused detection
- **Dependency Graph** — interactive Mermaid.js `require()` dependency visualization with circular detection
- **Shader Live Edit** — save `.glsl` and the shader compiles and applies to the running game instantly
- **Lua Profiler** — `debug.sethook` profiling with self-time heatmap table
- **Sprite/Quad Helper** — drag-select regions on a spritesheet to generate `newQuad()` code

#### Bridge Enhancements
- `inspect` command for Game State Inspector table traversal
- `shader` command for live GLSL compilation
- `profile_start` / `profile_stop` commands for Lua Profiler
- `reload` improved to table-merge strategy preserving existing references and `__index` self-references
- JSON encoder: added control character (`\uXXXX`) escaping for robust cross-platform communication

#### Cross-Platform Improvements
- macOS: executable permission check (`fs.accessSync X_OK`), MacPorts path, Apple Silicon priority
- Linux: `zip` command availability check with OS-specific install hints for `.love` builds
- All platforms: `execFile` timeout (5s) on all detection subprocesses to prevent hangs
- All platforms: robust Flatpak command parsing (replaces naive `split(' ')`)
- All platforms: symlink-safe directory traversal in Asset Browser, Dependency Graph, and Game Jam
- All platforms: `path.relative()` for cross-platform path comparison (replaces `startsWith`)
- Bridge client: `localhost` instead of hardcoded `127.0.0.1` for IPv6 compatibility
- Process management: `proc.pid` null check before kill

### Changed
- Snippet prefixes changed from `love-xxx` to `lovexxx` (avoids lua-language-server completion conflicts)
- Hot Reload: upgraded from package.loaded clear to table-merge strategy
- Version bumped to 1.0.0 for initial public release

## [0.1.0] - 2026-03-18

Internal development release.

### Added

#### Free Features
- Cross-platform game launch (Windows / Mac / Linux / Flatpak / Snap)
- Love2D executable auto-detection (PATH, common locations, registry, Flatpak)
- Love2D API IntelliSense setup (lua-language-server + type definitions)
- One-click debugger setup (launch.json for Local Lua Debugger)
- Project template generator (Minimal / Game Jam / State Machine)
- 26 code snippets for Love2D callbacks, patterns, and resource loading
- Console output (stdout/stderr capture to VS Code Output Channel)
- Status bar (Love2D version, game run state)
- Sidebar Quick Actions panel
- Third-party type definitions (Lume, Classic, STI, Windfield)
- i18n (English / Japanese)

#### Pro Features
- Gumroad license activation/deactivation with 7-day cache
- Bridge architecture (TCP client + bridge.lua for game communication)
- Hot reload (file watcher + bridge-based module reload)
- Screenshot preview (periodic capture via bridge)
- Structured console (timestamped, color-coded log levels)
- Asset reference checker (diagnostics for missing files)
- Performance monitor (FPS, memory, draw calls in webview)
- Game jam mode (countdown timer, .love file builder, submission checklist)
- Library manager (Lume, Classic, STI, HUMP, Windfield, Anim8, Bump)
