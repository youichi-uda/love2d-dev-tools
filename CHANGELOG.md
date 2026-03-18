# Changelog

## [0.1.0] - 2026-03-18

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
