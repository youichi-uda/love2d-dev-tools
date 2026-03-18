# Love2D Dev Tools — Love2D (LÖVE) ゲーム開発用 VS Code 拡張機能

Love2D（LÖVE）ゲーム開発者のための、初の本格的なVS Code拡張機能です。無料11機能 + Pro 7機能で、IntelliSense、デバッグ、ホットリロードなどをカバーします。

> Love2Dの起動、デバッグ、コーディングにバラバラのツールを使い分けるのはもう終わり。LÖVE専用の統合開発環境を手に入れましょう。

**[English](README.md)** | 日本語

## なぜ Love2D Dev Tools？

VS CodeでのLove2D開発はこれまでまともなツールがありませんでした。既存の2つの拡張機能はWindows専用だったり、更新が止まっていたり、Mac/Linuxではまともに動きません。この拡張機能は本格的な開発環境を提供します：

- **どこでも起動** — Windows、Mac、Linux、Flatpak、Snap を自動検出
- **高速に書く** — lua-language-server + Love2D型定義によるIntelliSense
- **ワンクリックデバッグ** — launch.json自動生成、F5でブレークポイントデバッグ
- **即座に反映** — ホットリロードで再起動なしにゲームに変更を反映（Pro）
- **締切に間に合う** — ゲームジャムモードでタイマー表示 + .loveファイルビルド（Pro）

## 無料機能（11個）

| 機能 | 説明 |
|------|------|
| **クロスプラットフォーム起動** | Windows、Mac、Linux、Flatpak、Snapでゲームを実行。`love`実行ファイルを自動検出。`Alt+L` / `Cmd+L` ショートカット。 |
| **Love2D API IntelliSense** | lua-language-serverによる全API補完。ワンクリックでLove2D型定義をワークスペースに追加。 |
| **ワンクリックデバッガーセットアップ** | Local Lua Debugger用の`launch.json`を生成。F5でブレークポイント・変数検査付きデバッグ。 |
| **プロジェクトテンプレート** | 新規プロジェクトの雛形生成：ミニマル、ゲームジャム、ステートマシン。`main.lua`、`conf.lua`、フォルダ構成、`.vscode/extensions.json`を同時生成。 |
| **26個のスニペット** | `love-load`、`love-update`、`love-draw`、`love-gameloop`、`love-class`（Classic）、`love-aabb`、`love-state`、`love-timer`等。 |
| **コンソール出力** | `love`プロセスのstdout/stderrをVS Code Output Channelに表示。全プラットフォーム対応。`--console`フラグ不要。 |
| **ステータスバー** | Love2Dバージョン表示、実行状態（Running/Stopped）、ワンクリック起動/停止。 |
| **サイドバー クイックアクション** | アクティビティバーに起動、停止、IntelliSenseセットアップ、デバッガーセットアップ、新規プロジェクトのボタンを配置。 |
| **サードパーティ型定義** | Lume、Classic、STI、Windfieldの型定義をバンドル。 |
| **ホバードキュメント** | lua-language-serverによるLove2D APIのホバードキュメント。 |
| **日英対応 i18n** | 英語・日本語ローカライズ完全対応。 |

## Pro機能（7個）— $12 買い切り

[Gumroad](https://y1uda.gumroad.com/l/love2d?wanted=true) ライセンスキーで有効化。サブスクリプション不要。オフラインで動作。

| 機能 | 説明 |
|------|------|
| **ホットリロード** | Luaファイルを保存 → ブリッジが`package.loaded`をクリアしてモジュールを再require。ゲーム状態を維持。デバウンス設定可能。 |
| **スクリーンショットプレビュー** | ブリッジ経由でゲームのスクリーンショットを定期取得し、Webviewパネルに表示。取得間隔設定可能。 |
| **構造化コンソール** | タイムスタンプ付き、ログレベル色分け（INFO/WARN/ERROR/DEBUG）、テーブルのツリー表示に対応した強化版コンソール。 |
| **アセット参照チェッカー** | `love.graphics.newImage()`、`love.audio.newSource()`等をスキャンし、存在しないファイルパスをVS Code診断として表示。 |
| **パフォーマンスモニター** | FPS、フレームタイム、Luaメモリ、ドローコール、テクスチャメモリをWebviewパネルにライブ表示。 |
| **ゲームジャムモード** | ステータスバーにカウントダウンタイマー、ワンクリック`.love`ファイルビルド、提出チェックリスト。 |
| **ライブラリマネージャー** | Lume、Classic、STI、HUMP、Windfield、Anim8、BumpをGitHubからワンクリックでプロジェクトに追加。 |

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
- 7個の追加機能が即座にアンロック

## サポート

- [GitHub Issues](https://github.com/youichi-uda/love2d-dev-tools/issues)
- [Discord](https://discord.gg/CDFmWGkfDC)

## ライセンス

商用ライセンス — 詳細は [LICENSE.md](LICENSE.md) をご覧ください。

無料機能は個人・商用プロジェクトで制限なく使用できます。
Pro機能には $12 の買い切りライセンスキーが必要です。

## 作者

**abyo-software**（宇田陽一）— [abyo.net](https://abyo.net)
