# Love2D Dev Tools — デモ動画スクリプト

> 想定尺: 2〜3分
> 対象: Love2D ユーザー（初心者〜中級者）
> メッセージ: 「ゲーム開発がこんなに快適に」

---

## 構成（7シーン）

### シーン 1: オープニング (10秒)

**画面**: VS Code + Love2D ゲーム画面を並べて表示
**ナレーション/テロップ**:
> Love2D Dev Tools — VS Code からゲーム開発のすべてを

- サイドバーの Love2D パネルを見せる
- 「Run Game」ボタンをクリック → ゲーム起動

---

### シーン 2: Hot Reload (20秒) ★目玉

**見せ方**: ゲームを動かしたままコードを編集 → 即座に反映

1. ゲーム画面（game ステート）を右側に配置
2. `lib/colors.lua` を開く
3. `primary` の色を `{0.91, 0.29, 0.60}` → `{0.30, 0.78, 0.69}` に変更
4. 保存 → **プレイヤーの色が即座にピンク→ティールに変化**
5. ステータスバーの `⚡ Hot Reload` を見せる

**テロップ**:
> Hot Reload — 保存するだけ。再起動不要。

---

### シーン 3: Color Picker (15秒) ★目玉

**見せ方**: コード内にカラースウォッチが表示 → ピッカーで色変更

1. `lib/colors.lua` を開く（前シーンから継続でも可）
2. 各行のカラースウォッチを見せる（ズームイン）
3. スウォッチをクリック → カラーピッカーが開く
4. ピッカーで色を変更 → コードの数値が自動更新
5. （Hot Reload ON なら）ゲームにも即反映

**テロップ**:
> Color Picker — Love2D の 0-1 カラーをビジュアル編集

---

### シーン 4: Live REPL (20秒) ★目玉

**見せ方**: ゲーム実行中に Lua コードを送信 → 即座に結果

1. コマンドパレットから「Love2D: Live REPL」を開く
2. 入力欄に `return love.timer.getFPS()` → Run → FPS値が表示
3. `return love.graphics.getWidth()` → 画面幅が表示
4. `love.graphics.setBackgroundColor(0.2, 0, 0.3)` → ゲーム背景色が変わる
5. 上キーで履歴呼び出し

**テロップ**:
> Live REPL — 動いているゲームと直接対話

---

### シーン 5: Inlay Hints + Go to Definition (15秒)

**見せ方**: エディタの使い勝手を見せる

1. `states/game.lua` を開く
2. `love.graphics.rectangle("fill", 10, 20, 100, 50)` の行を見せる
3. パラメータ名（`mode:`, `x:`, `y:`, `width:`, `height:`）がインラインで見える
4. `require("entities.player")` を Ctrl+Click → ファイルにジャンプ

**テロップ**:
> エディタ機能 — 引数名表示、定義ジャンプ、参照検索

---

### シーン 6: Sprite/Quad Editor (20秒) ★目玉

**見せ方**: 画像からコードを自動生成

1. コマンドパレットから「Love2D: Sprite/Quad Editor」
2. `assets/images/spritesheet.png` を選択
3. スプライトシートが2倍拡大で表示
4. マウスでセルを1つずつ囲む（3つくらい）
5. 下のリストに `newQuad(...)` が増えていく
6. 「Copy to Clipboard」 → エディタにペースト

**テロップ**:
> Sprite Editor — ドラッグ選択 → Lua コード自動生成

---

### シーン 7: クロージング (10秒)

**画面**: サイドバーの Quick Actions パネル全体を見せる

**テロップ**:
> その他にも: プロファイラー、依存グラフ、シェーダーライブ編集...
> 
> Love2D Dev Tools — VS Code Marketplace で公開中
> Free 機能 + Pro ライセンスで全機能解放

---

## 撮影準備チェックリスト

### VS Code 設定
- [ ] フォントサイズを大きめに（16px 推奨）
- [ ] テーマ: ダーク系（One Dark Pro / デフォルトダーク）
- [ ] ミニマップ OFF
- [ ] パンくずリスト OFF
- [ ] サイドバーを Love2D パネルに切り替え

### ゲーム準備
- [ ] test-project をワークスペースで開いた状態
- [ ] `lib/colors.lua` の色を元に戻しておく
- [ ] Hot Reload ON
- [ ] ゲームを起動して game ステートに入っておく

### Pro ライセンス
- [ ] デモ撮影時は Pro を有効化（REPL、Sprite Editor 等を使うため）

### 画面レイアウト
- [ ] 左: VS Code（幅 60%）
- [ ] 右: Love2D ゲームウィンドウ（幅 40%）
- [ ] 解像度: 1920x1080 推奨

---

## NG集 / 注意点

- Hot Reload で色を変えるとき、**テーブル形式**（`{r, g, b}`）を使う → `setColor(colors.xxx)` 経由で反映される
- REPL で `love.graphics.setBackgroundColor()` は即座に見えるが、次フレームから反映
- Sprite Editor はファイル選択ダイアログが出るので、事前にパスを覚えておく
- Color Picker は `0-1` 範囲の数値のみ検出（`255` 形式は非対応）
