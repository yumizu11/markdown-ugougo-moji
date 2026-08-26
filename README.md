# ウゴウゴ文字 (Ugougo Moji)

Markdown に書いた文字を、90 年代の TV 番組「ウゴウゴルーガ」風に
**うにょうにょ揺れる**グラフィックとして表示します。

![demo](docs/demo.gif)

mermaid と同じように、コードブロックで書きます。

````markdown
```ugougo
ウゴウゴルーガ
```
````

**ひとつの記法が、4 つの場所で動きます。**

| 使う場所 | 導入 |
|---|---|
| Obsidian の読み取りビュー | [導入方法](#導入方法) |
| Obsidian から HTML スライドへ書き出し | [コマンド](#コマンド) |
| Marp スライド | [Marp スライドで使う](#marp-スライドで使う) |
| VS Code の Markdown プレビュー | [VS Code のプレビューで使う](#vs-code-のプレビューで使う) |

描画は SVG と CSS だけで完結し、**JavaScript を使いません**。
これが、どの環境にも持ち込める理由になっています。

---

## 導入方法

現時点ではコミュニティプラグインストアには登録していないため、**手動インストール**になります。

### 必要なもの

- Node.js 18 以降（ビルドに使います）
- Obsidian 1.0.0 以降

### 1. ビルドする

このリポジトリを clone して、依存関係を入れてビルドします。

```bash
npm install
npm run build
```

成功するとリポジトリ直下に `main.js` が生成されます。配布に必要なのは次の 3 ファイルだけです。

- `main.js`（ビルド生成物）
- `manifest.json`
- `styles.css`

### 2. vault に配置する

vault の `.obsidian/plugins/ugougo-moji/` に上の 3 ファイルを置きます。
`.obsidian` は隠しフォルダなので、エクスプローラの設定によっては見えません。

PowerShell なら次の通りです。`$vault` を自分の vault のパスに変えてください。

```powershell
$vault = "C:\path\to\your\vault"
$dest  = Join-Path $vault ".obsidian\plugins\ugougo-moji"
New-Item -ItemType Directory -Force $dest
Copy-Item main.js, manifest.json, styles.css $dest
```

最終的にこうなっていれば正解です。

```
<vault>/
└── .obsidian/
    └── plugins/
        └── ugougo-moji/
            ├── main.js
            ├── manifest.json
            └── styles.css
```

### 3. Obsidian で有効化する

1. Obsidian を再起動する（または `Ctrl+P` →「Reload app without saving」）
2. **設定 → コミュニティプラグイン** を開く
3. **制限モード**（Restricted mode / 旧セーフモード）がオンなら、**オフ**にする
4. 「インストール済みプラグイン」の一覧に **Ugougo Moji** が出るので、トグルをオンにする

一覧に出てこないときは、右側の再読み込みボタンを押すか、配置先のパスを見直してください。
`.obsidian/plugins/ugougo-moji/main.js` が実在しているかが決め手です。

### 4. 動作確認

`examples/sample.md` を vault にコピーして開くと、ひと通りの書き方を確認できます。
新しいノートに次を貼って**読み取りビュー**に切り替えるだけでも確認できます。

````markdown
```ugougo
ウゴウゴルーガ
```
````

---

## 書き方

### 基本

コードブロックの言語を `ugougo` にして、表示したい文字を書きます。改行すると複数行になります。

````markdown
```ugougo
おはよう
みんなげんき？
```
````

### オプション

> [!IMPORTANT]
> オプションは**ブロックの本文**に書きます。言語名の後ろには書けません。
>
> Obsidian は言語名の後の最初のスペース以降を無視するため、
> <code>```ugougo color=#ff0</code> のような書き方はプラグインまで届きません。

`キー: 値` を並べ、`---` で本文と区切ります。

````markdown
```ugougo
color: #5eff9b
size: 64
wobble: 16
---
きょうのおてんき
```
````

`---` が無ければブロック全体が表示テキストになります。
また、`---` より前に `キー: 値` の形をしていない行があるときも全体をテキストとして扱うので、
`---` そのものを表示したい場合も普通に書けます。

### オプション一覧

| キー | 既定値 | 範囲 | 説明 |
|---|---|---|---|
| `color` | `#ffe600` | CSS の色 | 文字の塗りの色 |
| `stroke` | `#000000` | CSS の色 | 輪郭の色 |
| `strokeWidth` | `0.17` | `0`–`0.6` | 輪郭の太さ（フォントサイズに対する比） |
| `size` | `56` | `8`–`240` | フォントサイズ |
| `wobble` | `12` | `0`–`30`（**推奨 9–16**） | 揺れの強さ |
| `freq` | `0.015` | `0.002`–`0.09`（**推奨 0.010–0.025**） | 歪みの細かさ。小さいと大きくうねり、大きいとギザギザになる |
| `fps` | `8` | `1`–`30` | 1 秒あたりのコマ数。少ないほど手描きアニメ風 |
| `frames` | `4` | `2`–`12` | 巡回するコマの枚数 |
| `jitter` | `1` | `0`–`8` | 一文字ごとの揺れ幅（px）。`0` で無効 |
| `align` | `center` | `left` / `center` / `right` | 配置 |
| `font` | 丸ゴシック系 | フォントスタック | フォント指定 |
| `animate` | `true` | `true` / `false` | `false` で静止した 1 コマになる |

キー名は大文字小文字とハイフンを無視します（`strokeWidth` / `strokewidth` / `stroke-width` はすべて同じ）。
範囲外の数値は自動的に範囲内へ丸められ、解釈できない値は既定値のまま無視されます。

> **推奨範囲について**
> `wobble` を 20 以上、`freq` を 0.05 以上にすると文字が崩れて読めなくなります。
> 崩壊した見た目自体を狙う場合を除いて、推奨範囲に収めてください。

---

## 設定

**設定 → コミュニティプラグイン → Ugougo Moji** で、すべてのオプションの既定値を変更できます。
ここで決めた値が、オプションを書かなかったブロックに適用されます。

加えて、次の項目があります。

| 項目 | 既定 | 説明 |
|---|---|---|
| Animate | オン | オフにすると全ブロックが静止画になります |
| Respect reduced motion | オン | OS の「視差効果を減らす」設定に従って静止画にします |

## コマンド

コマンドパレット（`Ctrl+P`）から実行できます。

| コマンド | 内容 |
|---|---|
| **Insert block** | カーソル位置に `ugougo` ブロックのひな形を挿入。テキストを選択して実行すると、その文字列を中身にします |
| **Export slides as HTML** | 開いているノートを Marp スライド（HTML）に書き出します |
| **Export slides as HTML and open in browser** | 書き出したあと、既定のブラウザで開きます |

書き出し系の 2 つはデスクトップ版のみで、Markdown ファイルを開いているときだけ表示されます。
使う前に[エンジンパスの設定](#obsidian-のコマンドから書き出す)が必要です。

---

## Marp スライドで使う

Obsidian のコードブロックプロセッサは Marp には効きません。Marp が自前の markdown-it
パイプラインを持っていて、Obsidian の描画を経由しないためです。

そこで **Marp CLI のカスタムエンジン**を同梱しています。描画部分（`src/core.ts`）は共通なので、
**記法も見た目も Obsidian のときと完全に同じ**です。

### 準備

```bash
npm install
npm run build
```

`npm run build` はプラグインの `main.js` と、Marp 用の `marp-engine.cjs` の両方を生成します。

### プレビューする

```bash
npm run marp:server
```

`http://localhost:8080/` が開きます。`.md` ファイルを選ぶとスライドとして表示され、
ファイルを保存して再読み込みすると反映されます。

### HTML に書き出す

```bash
npm run marp -- examples/slides.md -o slides.html
```

`--` 以降が Marp CLI にそのまま渡ります。

### PDF / PPTX に書き出す

```bash
npm run marp -- examples/slides.md -o slides.pdf
```

> [!NOTE]
> PDF・PPTX・画像への書き出しには Chrome / Chromium が必要です。
> またこれらの形式では**アニメーションが静止します**（ランダムな 1 コマが焼き込まれます）。
> 見た目を狙い通りにしたいときは、そのブロックに `animate: false` を指定してください。

### marp コマンドを直接使う場合

```bash
marp --no-stdin --engine ./marp-engine.cjs deck.md -o deck.html
```

> [!TIP]
> `--no-stdin` を忘れると、marp-cli が標準入力を待ち続けて固まったように見えます。
> 上の npm スクリプト経由なら指定済みです。

### Obsidian のコマンドから書き出す

ターミナルに戻らずに、Obsidian の中から HTML 書き出しまで実行できます。

#### 設定

**設定は不要です。** プラグインは起動時に、自分のフォルダへ `marp-engine.cjs` を書き出して使います。

```
<vault>/.obsidian/plugins/ugougo-moji/
├── main.js            ← エンジンのソースを内包
├── manifest.json
├── styles.css
└── marp-engine.cjs    ← 起動時に自動生成・自動更新
```

設定項目はすべて任意です。

| 設定 | 既定 | 説明 |
|---|---|---|
| Engine path override | （空） | 空なら上記の自動生成エンジンを使います。エンジン自体を開発するときだけ、リポジトリの `marp-engine.cjs` を指定してください |
| Marp CLI command | （空） | 空ならエンジンの近く → グローバルな `marp` → `npx` の順に探します。`.js` で終わるパスを指定すると Node で直接起動します |
| Output folder | （空） | 空ならノートと同じフォルダに書き出します |

#### 使う

スライドにしたいノートを開いて、コマンドパレット（`Ctrl+P`）から実行します。

- **Ugougo Moji: Export slides as HTML** — 書き出すだけ
- **Ugougo Moji: Export slides as HTML and open in browser** — 書き出して既定のブラウザで開く

出力は `ノート名.html` です。進捗と結果は画面右上の通知に出ます。

#### 必要なもの

エンジンは同梱されますが、**変換本体である Marp CLI はユーザー側に必要**です。

- **Node.js が PATH に通っていること。** プラグインは Marp CLI を Node で直接起動します
  （Obsidian 本体は Node として起動できないため）
- **Marp CLI が使えること。** 次のいずれかで満たせます
  - グローバルに導入する：`npm install -g @marp-team/marp-cli`（推奨・最速）
  - 何もしない：`npx` で自動的に取得します。初回だけ数十秒かかります

探索順は次の通りで、起動できなかったものは自動的に次へ切り替わります。

1. エンジンの近くの `node_modules`（開発用チェックアウトのとき）
2. **グローバル導入された `marp-cli.js` をパスで直接指定**
3. PATH 上の `marp` コマンド
4. `npx`

2 番目が名前ではなくパスで探しているのは、**GUI アプリである Obsidian が
ターミナルと同じ PATH を引き継ぐとは限らない**ためです。`marp` を導入済みなのに
Obsidian からは見つからない、という状況を避けています。

> [!NOTE]
> ストア経由でインストールした場合、Obsidian が配置するのは `main.js` `manifest.json`
> `styles.css` の 3 つだけです。`marp-engine.cjs` を 4 つ目として配布することはできないため、
> プラグインが自分で書き出す方式にしています。プラグインを更新すると、
> エンジンも自動的に更新されます。

### 書き方

Obsidian のときと同じです。`examples/slides.md` に一通り入っています。

````markdown
---
marp: true
paginate: true
---

# ふつうのスライド

---

```ugougo
color: #5eff9b
size: 72
---
おはよう
みんなげんき？
```
````

配置用の CSS はブロックごとに同梱されるので、Marp テーマ側に手を入れる必要はありません。

---

## VS Code のプレビューで使う

VS Code の標準 Markdown プレビューでも、同じ記法がそのまま使えます。
拡張機能の実体は `vscode/` にあります。

### ビルドと導入

```bash
npm install
npm run build
```

`vscode/extension.js` が生成されます。あとは `vscode/` の中身を
VS Code の拡張機能フォルダにコピーするだけです。

```powershell
$dest = "$env:USERPROFILE\.vscode\extensions\mizutani.ugougo-moji-0.1.0"
New-Item -ItemType Directory -Force $dest
Copy-Item vscode\package.json, vscode\extension.js, vscode\README.md $dest
```

VS Code を再起動（またはコマンドパレットから「Developer: Reload Window」）すると有効になります。

配布用に `.vsix` を作る場合は [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce) を使います。
**`vscode/` の中で実行してください。**

```bash
cd vscode && npx --yes @vscode/vsce package
```

> [!IMPORTANT]
> リポジトリのルートで実行すると `Manifest missing field: engines` で失敗します。
> ルートの `package.json` は Obsidian プラグインとビルド用のもので、
> VS Code のマニフェストは `vscode/package.json` の方だからです。

できあがった `.vsix` はこう入れます。

```bash
code --install-extension vscode/ugougo-moji-0.1.0.vsix
```

### 使う

Markdown ファイルを開いてプレビュー（`Ctrl+K V`）を表示するだけです。
記法は Obsidian・Marp と完全に同じです。

````markdown
```ugougo
ウゴウゴルーガ
```
````

### 設定

**設定 → 拡張機能 → Ugougo Moji** で全オプションの既定値を変更できます
（設定 ID は `ugougoMoji.*`）。

設定は**ブロックを描画するたびに読み直される**ので、変更後はプレビューを
更新すれば反映されます。ウィンドウの再読み込みは不要です。

### 仕組み

`package.json` で `markdown.markdownItPlugins` を宣言し、`activate()` から
`extendMarkdownIt` を返しているだけです。描画は `src/core.ts`、記法の解釈は
`src/markdown-it-plugin.ts` と、Obsidian・Marp と同じものを使っています。

プレビューの Content-Security-Policy は `script-src` に nonce を要求しますが、
**描画に JavaScript を使わない設計**なので影響を受けません。
`style-src` には全セキュリティレベルで `'unsafe-inline'` が含まれているため、
各ブロックが持つインライン `<style>`（一文字ジッターの `@keyframes`）も有効です。

---

## アクセシビリティ

常に動き続ける文字は、前庭障害や注意障害のある人にとって実際に負担になります。
そのため既定で次の配慮を入れています。

- OS が「視差効果を減らす」を要求しているときは、**アニメーションせず静止した 1 コマ**を描画します
- 生成される SVG には `role="img"` と `aria-label`（元のテキスト）が付くので、読み上げは通ります
- ブロック単位で `animate: false`、全体では設定でオフにできます

## 仕組み

SVG フィルタの `feTurbulence` がパーリンノイズを作り、`feDisplacementMap` がそのノイズで
文字のピクセルを押し退けます。ノイズの `seed` を `calcMode="discrete"` で低フレームレートに
巡回させると、輪郭が毎コマ描き直されたように**なめらかにではなくカクカクと沸き立ちます**。
これが「うにょうにょ」の正体です。さらに一文字ずつ微小な平行移動・回転を `step-end` で
加えることで、手描きアニメの質感を出しています。

出力はインライン SVG と CSS だけで完結していて、描画のために JavaScript を実行しません。
そのため、この描画部分（`src/core.ts`）は Obsidian の外でもそのまま使えます。

## 開発

```bash
npm install
npm run dev          # esbuild の watch モード。保存するたびに main.js を作り直します
npm run build        # 型チェック + main.js + marp-engine.cjs
npm run build:engine # Marp エンジンだけ作り直す
```

`npm install` には Marp CLI（Puppeteer を含む）が入るため、`node_modules` が 150MB 以上に
なります。Obsidian プラグインだけを使う場合は `@marp-team/*` を
`devDependencies` から外して構いません。

vault の `.obsidian/plugins/ugougo-moji/` にリポジトリごとシンボリックリンクを張っておくと、
`npm run dev` の結果がそのまま反映されて楽です。
反映には Obsidian 側の再読み込み（`Ctrl+P` →「Reload app without saving」）が必要です。

### 構成

| ファイル | 役割 |
|---|---|
| `src/options.ts` | オプションの型・既定値・範囲・ブロックの解析。Obsidian 非依存 |
| `src/core.ts` | テキストとオプションから SVG 文字列を作る純粋関数。Obsidian 非依存 |
| `src/settings.ts` | 設定画面 |
| `src/main.ts` | プラグイン本体。コードブロックプロセッサとコマンドの登録 |
| `src/export.ts` | Marp CLI の起動。パス解決と引数組み立て。Obsidian 非依存 |
| `src/markdown-it-plugin.ts` | `ugougo` フェンスの markdown-it プラグイン。Marp と VS Code が共用 |
| `src/marp-engine.ts` | Marp CLI 用カスタムエンジン |
| `src/vscode-extension.ts` | VS Code 拡張のエントリ |
| `vscode/` | VS Code 拡張のマニフェストとビルド設定 |
| `src/generated/engine-source.ts` | 生成物。エンジンを文字列化したもの（`main.js` に埋め込まれる） |
| `esbuild.engine.mjs` | エンジンのビルドと、上記の生成 |
| `esbuild.config.mjs` | プラグイン（`main.js`）のビルド |

ビルド順序に依存関係があります。`esbuild.engine.mjs` が
`src/generated/engine-source.ts` を作り、それを `main.js` が取り込むため、
**エンジン → 型チェック → プラグイン**の順で実行する必要があります
（`npm run build` はこの順序になっています）。

`options.ts` と `core.ts` は Obsidian に依存していません。実際そのおかげで、
Marp 側は `marp-engine.ts` の数十行を足すだけで済んでいます。
静的 `.svg` の書き出しなど、別の用途にも同じ形で転用できます。

`marp-engine.ts` が export している `ugougoMarkdownIt` は素の markdown-it プラグインなので、
Marp 以外の markdown-it 環境（VitePress など）にもそのまま `.use()` できます。

## 制限事項

- **フォント**：番組の質感は丸ゴシック体に依存します。既定のフォントスタックは
  `M PLUS Rounded 1c` → `ヒラギノ丸ゴ` → `游ゴシック` → `メイリオ` の順で、Windows では
  多くの場合 游ゴシックかメイリオになります。より近づけたい場合は
  [M PLUS Rounded 1c](https://fonts.google.com/specimen/M+PLUS+Rounded+1c) を
  OS にインストールしてください。
- **文字幅**：実フォントの字幅を測っていません。全角 1em / 半角 0.55em の近似で
  レイアウトしているため、和欧混植では数 % ずれます。
- **テキストの選択**：一文字ずつ独立した SVG 要素になるため、語としてのコピーがしづらくなります。
- **エクスポート**：PDF 書き出しでは当然アニメーションしません（静止した 1 コマになります）。

## ライセンス

MIT — [LICENSE](LICENSE) を参照してください。

`vscode/LICENSE.txt` は同じ内容の複製です。vsce はパッケージ対象ディレクトリの中しか
見ないため、`.vsix` に含めるには `vscode/` 側にも必要です。
