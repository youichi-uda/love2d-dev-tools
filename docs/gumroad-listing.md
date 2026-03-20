# Gumroad登録内容 — Love2D Dev Tools Pro

各セクションの内容を、対応するGumroadフィールドにコピペしてください。
Description はプレーンテキストです（MD記法なし）。

---

## Product Name

```
Love2D Dev Tools Pro
```

## URL slug

```
love2d
```

→ 購入URL: https://y1uda.gumroad.com/l/love2d

## Price

```
$12+
```

（Pay what you want にチェック、$12 minimum）

## Summary

```
Pro upgrade for Love2D Dev Tools — the VS Code extension for LÖVE game development. 14 Pro features: hot reload, live REPL, game state inspector, profiler, shader live edit, sprite editor, and more.
```

## Tags

```
love2d, löve, lua, vscode, game development, gamedev, game engine, indie game, game jam, ludum dare
```

## Content delivery

「Digital product」を選択。

```
License key delivered after purchase. Activate within VS Code.
```

## Cover Image Alt Text

```
Love2D Dev Tools Pro — VS Code extension for LÖVE game development
```

---

## Description（以下すべてをGumroadのDescription欄にそのまま貼り付け）

```
Love2D Dev Tools Pro

Unlock the full power of Love2D Dev Tools — the VS Code extension purpose-built for Love2D (LÖVE) game development.

The free version gives you 18 features to get started: cross-platform game launch, IntelliSense, debugger setup, Go to Definition, Inlay Hints, Color Picker, diagnostics, code actions, snippets, and more. Pro adds 14 powerful features for serious game developers.


HOT RELOAD

Save your Lua file and see changes reflected in the running game instantly — without restarting. The bridge merges new module contents into the existing table, so all references throughout your code stay valid. No more stale pointers. Configurable debounce interval.


LIVE REPL

Execute Lua code directly in the running game from a VS Code webview panel. Type "return love.timer.getFPS()" and see the result immediately. Change background color, inspect variables, test functions — all without restarting. Command history with arrow keys.


GAME STATE INSPECTOR

Browse global variables and tables in a sidebar tree view. Expand nested tables on click. Auto-refresh keeps the view up to date as the game runs. See what's really happening inside your game at runtime.


LUA PROFILER

Start/stop profiling with debug.sethook. Results displayed as a sortable table showing function name, source file, call count, total time, and self time. Self-time heatmap highlights the hottest functions. Find your bottlenecks fast.


SCREENSHOT PREVIEW

A VS Code webview panel that periodically captures screenshots from your running game via the bridge. See your game without switching windows. Configurable capture interval (default 500ms).


PERFORMANCE MONITOR

Live FPS, frame time (ms), Lua memory usage (MB), draw call count, and texture memory in a dedicated webview panel. Color-coded FPS indicator (green/yellow/red). Updated every second via the bridge.


ASSET BROWSER

Sidebar tree view of all project assets — images, sounds, fonts, and shaders. Click an image to preview it. Detects unused assets (not referenced in any Lua file) and marks them. Keep your project clean.


DEPENDENCY GRAPH

Interactive Mermaid.js visualization of your require() dependency tree. Click any node to open the source file. Circular dependencies are highlighted with dotted lines. Understand your project structure at a glance.


SHADER LIVE EDIT

Save a .glsl file and the shader is compiled and applied to the running game instantly via the bridge. See your shader changes in real-time without restarting. Compilation errors are reported back to VS Code.


SPRITE/QUAD HELPER

Open a spritesheet image in a visual editor. Drag to select rectangular regions. Each selection generates a love.graphics.newQuad() call with the correct coordinates. Copy all quads to clipboard and paste into your code. No more manual pixel counting.


STRUCTURED CONSOLE

Enhanced console that receives structured log messages from the bridge. Log levels color-coded (INFO/WARN/ERROR/DEBUG), timestamped, and filterable. Table contents displayed as a tree. Goes beyond the free version's stdout/stderr pipe.


ASSET REFERENCE CHECKER

Scans your Lua code for asset-loading calls — love.graphics.newImage, love.audio.newSource, love.graphics.newFont, love.image.newImageData, love.video.newVideo, and more. Validates that every referenced file path actually exists on disk. Missing assets appear as VS Code diagnostics in real-time.


GAME JAM MODE

Built for 48-hour jams and hackathons:
- Countdown timer in the status bar (configurable hours)
- One-click .love file builder (zip your project with the correct structure)
- Submission checklist (runs without errors, correct title, screenshots, credits, etc.)


LIBRARY MANAGER

Add popular Love2D libraries to your project with one click. Downloads directly from GitHub:
- Lume (utility functions)
- Classic (class system)
- STI (Tiled map loader)
- HUMP (camera, gamestates, timer, vector)
- Windfield (physics)
- Anim8 (sprite animation)
- Bump (collision detection)

Files are installed to lib/ with the correct directory structure.


HOW IT WORKS

1. Install Love2D Dev Tools from the VS Code Marketplace (free)
2. Purchase this Pro license
3. Open Command Palette and run: Love2D: Activate Pro License
4. Enter your license key — all 14 Pro features unlock immediately

One-time purchase. No subscription. Works offline after activation.


FREE VERSION (18 features included at no cost)

- Cross-platform game launch (Windows / Mac / Linux / Flatpak / Snap)
- Love2D API IntelliSense (lua-language-server + type definitions auto-setup)
- One-click debugger setup (launch.json generation for Local Lua Debugger)
- Go to Definition (require to file, local function definitions)
- Find All References (workspace-wide symbol search)
- Document Symbols (Ctrl+Shift+O outline)
- Inlay Hints (inline parameter names for Love2D API calls)
- Enhanced Diagnostics (unused require detection with gray-out)
- Code Actions (remove unused requires, generate functions)
- Color Picker (inline swatches for setColor and {r,g,b,a} tables, 0-1 range)
- Project template generator (Minimal / Game Jam / State Machine)
- 26 code snippets (loveload, loveupdate, lovedraw, lovegameloop, loveclass, and more)
- Console output (stdout/stderr piped to VS Code Output Channel on all platforms)
- Status bar (Love2D version display, game run state, one-click launch)
- Sidebar with Quick Actions panel
- Third-party library type definitions (Lume, Classic, STI, Windfield)
- Full i18n (English / Japanese)
- Hover documentation for Love2D API


BRIDGE ARCHITECTURE (for Pro features)

Pro features communicate with the running game via a TCP socket. The bridge module (bridge.lua) uses Love2D's built-in LuaSocket — no external dependencies. The bridge starts automatically when you launch the game through the extension. No manual configuration needed.


REQUIREMENTS

- VS Code 1.85.0+
- Love2D Dev Tools extension (free, from VS Code Marketplace)
- Love2D (LÖVE) 11.4 or 11.5 installed

Recommended:
- Lua Language Server (sumneko.lua) for IntelliSense
- Local Lua Debugger (tomblind) for breakpoint debugging


SUPPORT

GitHub Issues: https://github.com/youichi-uda/love2d-dev-tools/issues
Discord: https://discord.gg/WraE9PMGj6
```

---

## 登録後の作業

Gumroadで商品作成後、ダッシュボードから Product ID を取得し、以下を更新する:

ファイル: src/license/gumroad.ts

```
const GUMROAD_PRODUCT_ID = '<ここにGumroadのProduct IDを貼る>';
const PURCHASE_URL = 'https://y1uda.gumroad.com/l/love2d?wanted=true';
```

Product IDの取得方法:
- Gumroad Dashboard → Products → Love2D Dev Tools Pro → 「...」メニュー
- または Gumroad API: GET /v2/products → response.products[].id

---

## カバー画像の仕様メモ

- サイズ: 1280x720px推奨
- 背景: ダークテーマ (#1e1e1e)
- アクセントカラー: #e74a99（Love2Dのハートロゴに合わせたピンク/マゼンタ）
- テキスト: 「Love2D Dev Tools Pro」「18 Free + 14 Pro Features」
- モチーフ: ハートアイコン
- 内容: VS Code画面にLove2Dコード + スクリーンショットプレビュー + パフォーマンスモニターを表示
