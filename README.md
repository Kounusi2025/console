# console

コマンドを打つと、バグったようなアニメーションとともにゲームが生成される、ターミナル風のミニゲーム集です。
HTML・CSS・JavaScript だけで動きます (ビルド不要・外部ライブラリなし・音声ファイルなし)。

PC のブラウザ専用です。キーボードで操作します。

## 遊び方

`index.html` をブラウザで開くだけで動きます。ゲーム名を打って Enter を押してください。

```
guest@console:~$ tetris
```

| コマンド | 内容 |
|---|---|
| `help` | コマンド一覧 |
| `ls` | ゲーム一覧 |
| `random` | ランダムにゲームを生成 |
| `sound on` / `sound off` | 効果音・BGM の切り替え |
| `clear` / `date` / `echo` / `about` | おまけ |

`↑` `↓` で履歴、`Tab` でコマンド補完ができます。

## ゲーム一覧

| コマンド | ゲーム | 操作 |
|---|---|---|
| `tetris` | テトリス (BGM つき) | ← → 移動 / ↑ 回転 / ↓ ソフトドロップ / Space ハードドロップ / P 一時停止 |
| `snake` | スネーク | 矢印 / WASD |
| `breakout` | ブロック崩し | ← → 移動 / Space 発射 |
| `shooter` | スペースシューティング | 矢印 / WASD 移動 / Space 弾 |
| `tictactoe` | ○×ゲーム (対 CPU) | クリック / 数字キー 1-9 / 矢印 + Enter |
| `maze` | 迷路 (レベルごとに大きくなる) | 矢印 / WASD / H でヒント |
| `2048` | 2048 | 矢印 / WASD |
| `minesweeper` | マインスイーパー | クリック / 右クリックで旗 / 矢印 + Space / X で旗 |
| `pong` | ポン (対 CPU・7 点先取) | ↑ ↓ / W S |
| `flappy` | フラッピー | Space / ↑ |
| `typing` | タイピング (落ちてくる英単語) | 英字を入力 |
| `memory` | 神経衰弱 | クリック / 矢印 + Space |

### 共通のキー

| キー | 動作 |
|---|---|
| `Esc` | console に戻る (画面左上のボタンでも戻れます) |
| `Enter` / `R` | リスタート (ゲームによる) |
| `M` | サウンドの ON / OFF (タイピングを除く) |
| `F` | 全画面の切り替え (タイピングを除く) |

ゲーム画面はウィンドウの大きさに合わせて自動で拡大縮小します。

## ファイル構成

```
index.html          画面の骨組み
css/style.css       見た目 (ターミナル風・バグ演出)
js/core.js          共通ヘルパー (ゲームループ、キャンバス、保存など)
js/sfx.js           効果音と BGM (Web Audio で合成)
js/console.js       コンソール本体 (コマンド、バグ演出、ゲームの起動と終了)
js/games/*.js       ゲーム (1 本 1 ファイル)
```

## ゲームを追加する

1. `js/games/` に新しいファイルを作り、`registerGame` で登録します。

```js
'use strict';
registerGame('mygame', {
  desc: 'ゲームの説明',                 // ls に表示される
  hint: '操作の説明 / Esc 戻る',        // 画面下に表示される
  create(cv) {
    const ctx = sizeCanvas(cv, 480, 480);
    // ... ゲームの初期化 ...
    const stop = startLoop(update, draw);   // update(dt) と draw() を毎フレーム呼ぶ
    return {
      key(e) { /* キーを押したとき */ },
      keyup(e) { /* キーを離したとき (省略可) */ },
      destroy() { stop(); }                 // 終了時の後片付け
    };
  }
});
```

2. `index.html` の `<script src="js/games/...">` の並びに 1 行足します。

`ls`・`random`・Tab 補完にも自動で反映されます。
文字入力が必要なゲームは、`create` の返り値に `textInput: true` を付けると M / F の共通ショートカットが無効になります。

## GitHub Pages で公開する

1. このフォルダの中身をリポジトリに push します。
2. リポジトリの **Settings → Pages** で、Source を **Deploy from a branch**、Branch を `main` / `(root)` にして保存します。
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で遊べます。

## 補足

- ブラウザの仕様で、最初のキー入力があるまで音は出ません。
- ベストスコアなどは `localStorage` に保存されます (保存できない環境でもエラーにはなりません)。
- テトリスの BGM は、ロシア民謡「コロベイニキ」(パブリックドメイン) を使っています。
