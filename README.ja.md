# Love2D Dev Tools — Love2D (LÖVE) ゲーム開発用 VS Code 拡張機能

Love2D（LÖVE）ゲーム開発者のための、初の本格的なVS Code拡張機能です。無料22機能 + Pro 10機能で、IntelliSense、言語機能、ホットリロード、プロファイリングなどをカバーします。

> Love2Dの起動、デバッグ、コーディングにバラバラのツールを使い分けるのはもう終わり。LÖVE専用の統合開発環境を手に入れましょう。

**[English](README.md)** | 日本語

## なぜ Love2D Dev Tools？

VS CodeでのLove2D開発はこれまでまともなツールがありませんでした。既存の2つの拡張機能はWindows専用だったり、更新が止まっていたり、Mac/Linuxではまともに動きません。この拡張機能は本格的な開発環境を提供します：

- **どこでも起動** — Windows、Mac、Linux、Flatpak、Snap を自動検出
- **高速に書く** — IntelliSense、定義へ移動、参照検索、Inlay Hints、26個のスニペット
- **ワンクリックデバッグ** — launch.json自動生成、F5でブレークポイントデバッグ
- **即座に反映** — ホットリロードで再起動なしにゲームに変更を反映（Pro）
- **実行時に検査** — Live REPL、ゲーム状態インスペクター、Luaプロファイラー（Pro）
- **締切に間に合う** — ゲームジャムモードでタイマー表示 + .loveファイルビルド（Pro）

## 無料機能（22個）

### コア

| 機能 | 説明 |
|------|------|
| **クロスプラットフォーム起動** | Windows、Mac、Linux、Flatpak、Snapでゲームを実行。`love`実行ファイルを自動検出。`Alt+L` / `Cmd+L` ショートカット。 |
| **Love2D API IntelliSense** | lua-language-serverによる全API補完。ワンクリックでLove2D型定義をワークスペースに追加。 |
| **ワンクリックデバッガーセットアップ** | Local Lua Debugger用の`launch.json`を生成。F5でブレークポイント・変数検査付きデバッグ。 |
| **プロジェクトテンプレート** | 新規プロジェクトの雛形生成：ミニマル、ゲームジャム、ステートマシン。`main.lua`、`conf.lua`、フォルダ構成、`.vscode/extensions.json`を同時生成。 |
| **26個のスニペット** | `loveload`、`loveupdate`、`lovedraw`、`lovegameloop`、`loveclass`（Classic）、`loveaabb`、`lovestate`、`lovetimer`等。 |
| **コンソール出力** | `love`プロセスのstdout/stderrをVS Code Output Channelに表示。全プラットフォーム対応。`--console`フラグ不要。 |
| **ステータスバー** | Love2Dバージョン表示、実行状態（Running/Stopped）、ワンクリック起動/停止。 |
| **サイドバー クイックアクション** | アクティビティバーに起動、停止、IntelliSenseセットアップ、デバッガーセットアップ、新規プロジェクトのボタンを配置。 |
| **サードパーティ型定義** | Lume、Classic、STI、Windfieldの型定義をバンドル。 |
| **ホバードキュメント** | lua-language-serverによるLove2D APIのホバードキュメント。 |
| **日英対応 i18n** | 英語・日本語ローカライズ完全対応。 |

### 言語機能

| 機能 | 説明 |
|------|------|
| **定義へ移動** | `require("module")` をCtrl+Clickでファイルにジャンプ。ローカル関数定義も解決。 |
| **すべての参照を検索** | シンボルを右クリックしてワークスペース全体の参照を検索。 |
| **ドキュメントシンボル** | Ctrl+Shift+Oで関数・モジュール・変数を一覧表示。アウトラインビューにも対応。 |
| **Inlay Hints** | Love2D API呼び出しにインラインパラメータ名を表示 — `rectangle(mode:, x:, y:, width:, height:)`。 |
| **拡張診断** | 未使用の`require()`文を検出してグレーアウト表示。 |
| **コードアクション** | 未使用requireの削除クイックフィックス。未定義関数の「関数を生成」アクション。Hexカラーおよび0-255値の0-1変換。 |
| **カラーピッカー** | `love.graphics.setColor()`や`{r, g, b, a}`テーブルリテラルにカラースウォッチを表示。クリックでVS Codeカラーピッカーを起動。 |
| **カラーパレット** | `.love-palette.json`に名前付きカラーを保存。サイドバーから閲覧・挿入。バージョン管理・チーム共有に対応。 |

### 生産性

| 機能 | 説明 |
|------|------|
| **構造化コンソール** | タイムスタンプ付き、ログレベル色分け（INFO/WARN/ERROR/DEBUG）、テーブルのツリー表示に対応した強化版コンソール。 |
| **アセット参照チェッカー** | `love.graphics.newImage()`、`love.audio.newSource()`等をスキャンし、存在しないファイルパスをVS Code診断として表示。 |
| **依存関係グラフ** | `require()`の依存関係をMermaid.jsでインタラクティブに可視化。ノードクリックでファイルを開く。循環依存検出。 |
| **ライブラリマネージャー** | Lume、Classic、STI、HUMP、Windfield、Anim8、BumpをGitHubからワンクリックでプロジェクトに追加。 |

## Pro機能（10個）— $12 買い切り

[Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) ライセンスキーで有効化。サブスクリプション不要。オフラインで動作。

### ランタイム・デバッグ

| 機能 | 説明 |
|------|------|
| **ホットリロード** | Luaファイルを保存するとブリッジが変更をゲームにマージ。既存の参照は維持。デバウンス設定可能。 |
| **Live REPL** | VS Code Webviewパネルから実行中のゲームでLuaコードを実行。矢印キーでコマンド履歴。 |
| **ゲーム状態インスペクター** | サイドバーのツリービューでグローバル変数・テーブルを閲覧。自動リフレッシュ。ネストされたテーブルもクリックで展開。 |
| **Luaプロファイラー** | `debug.sethook`でプロファイリング開始/停止。self-timeヒートマップ付きのソート可能なテーブルで結果表示。 |

### ビジュアルツール

| 機能 | 説明 |
|------|------|
| **スクリーンショットプレビュー** | ブリッジ経由でゲームのスクリーンショットを定期取得し、Webviewパネルに表示。取得間隔設定可能。 |
| **パフォーマンスモニター** | FPS、フレームタイム、Luaメモリ、ドローコール、テクスチャメモリをWebviewパネルにライブ表示。 |
| **アセットブラウザ** | サイドバーのツリービューでプロジェクトの画像・音声・フォント・シェーダーを一覧表示。クリックでプレビュー。未使用アセット検出。 |
| **シェーダーライブ編集** | `.glsl`ファイルを保存すると、シェーダーが即座にコンパイルされゲームに適用。 |
| **スプライト/クワッドヘルパー** | スプライトシート画像を開き、ドラッグで領域を選択して`love.graphics.newQuad()`コードを生成。 |

### 生産性

| 機能 | 説明 |
|------|------|
| **ゲームジャムモード** | ステータスバーにカウントダウンタイマー、ワンクリック`.love`ファイルビルド、提出チェックリスト。 |

### ブリッジアーキテクチャ

Pro機能はTCPソケットで実行中のゲームと通信します。ブリッジモジュール（`bridge.lua`）はLove2D内蔵のLuaSocketを使用し、外部依存はありません。拡張機能からゲームを起動すると自動的に開始します。

## はじめに

1. VS Codeマーケットプレイスからインストール
2. `main.lua` を含むフォルダを開く
3. 拡張機能が自動的に有効化されます

### クイックスタートコマンド

| コマンド | ショートカット | 説明 |
|---------|-------------|------|
| `Love2D: ゲームを実行` | `Alt+L` / `Cmd+L` | ゲームを起動 |
| `Love2D: IntelliSenseをセットアップ` | — | lua-language-server + 型定義を設定 |
| `Love2D: デバッガーをセットアップ` | — | F5デバッグ用のlaunch.jsonを生成 |
| `Love2D: 新しいプロジェクト` | — | テンプレートから新規プロジェクトを生成 |
| `Love2D: Proライセンスを有効化` | — | Gumroadライセンスキーを入力 |

## 設定

| 設定項目 | デフォルト | 説明 |
|---------|---------|------|
| `love2d-tools.lovePath` | `""` | `love`実行ファイルのパス（空欄=自動検出） |
| `love2d-tools.loveVersion` | `"11.5"` | テンプレート生成時のLove2Dバージョン |
| `love2d-tools.hotReload.debounce` | `300` | ホットリロードのデバウンス間隔（ms） |
| `love2d-tools.bridge.port` | `0` | ブリッジTCPポート（0=自動） |
| `love2d-tools.screenshot.interval` | `500` | スクリーンショット取得間隔（ms） |
| `love2d-tools.inlayHints.enabled` | `true` | Love2D API Inlay Hintsの有効/無効 |

## 動作要件

- VS Code 1.85.0以上
- Love2D (LÖVE) 11.4 または 11.5

推奨：
- [Lua Language Server](https://marketplace.visualstudio.com/items?itemName=sumneko.lua)（sumneko.lua）— IntelliSense用
- [Local Lua Debugger](https://marketplace.visualstudio.com/items?itemName=tomblind.local-lua-debugger-vscode) — ブレークポイントデバッグ用

## Proライセンス

[Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) で $12〜 の買い切りライセンスを購入できます。

- 買い切り、サブスクリプションなし
- 有効化後はオフラインで動作
- 10個のPro機能が即座にアンロック

## サポート

- [GitHub Issues](https://github.com/youichi-uda/love2d-dev-tools/issues)
- [Discord](https://discord.gg/WraE9PMGj6)

## ライセンス

商用ライセンス — 詳細は [LICENSE.md](LICENSE.md) をご覧ください。

無料機能は個人・商用プロジェクトで制限なく使用できます。
Pro機能には $12 の買い切りライセンスキーが必要です。

## 作者

**abyo-software** — [abyo.net](https://abyo.net)
