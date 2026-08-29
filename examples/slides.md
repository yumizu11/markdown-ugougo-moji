---
marp: true
theme: default
paginate: true
---

# ウゴウゴ文字入り Marp スライド

このデッキは、カスタムエンジンを指定してビルドします。

```bash
marp --engine ./marp-engine.cjs examples/slides.md -o slides.html
```

---

```ugougo
うにょうにょ
```

`ugougo` ブロックは Obsidian のときと同じ書き方です。

---

```ugougo
color: #5eff9b
size: 72
wobble: 15
fps: 6
---
おはよう
みんなげんき？
```

---

## 等幅フォントでコードを動かす

```ugougo
font: Courier New
size: 40
color: #5eff9b
---
printf('ウゴウゴ');
```

---

# 見出しの代わりに使う

```ugougo
size: 44
color: #ff6ec7
align: left
---
きょうのおしながき
```

- 通常の Markdown はそのまま使えます
- コードブロックも壊れません

```js
const x = 1;
```

---

<!-- 印刷や PDF 書き出しでは静止画になります -->

```ugougo
animate: false
color: #69d2ff
---
PDFではとまる
```
