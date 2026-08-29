# ウゴウゴ文字 サンプル

このノートを Obsidian の**閲覧モード**（読み取りビュー）で開くと、文字が揺れます。

## いちばん短い書き方

```ugougo
うにょうにょ
```

## 等幅フォントでコードを動かす

`font` に等幅フォントを指定すると、コードもうにょうにょ動きます。

```ugougo
font: Courier New
size: 44
color: #5eff9b
---
printf('ウゴウゴ');
```

## 複数行

```ugougo
おはよう
みんなげんき？
```

## オプションを付ける

オプションは `---` より前に `キー: 値` で書きます。

```ugougo
color: #5eff9b
size: 64
wobble: 16
fps: 6
---
きょうのおてんき
```

## 揺れを弱めて、細かくする

```ugougo
color: #ff6ec7
wobble: 9
freq: 0.022
jitter: 2
---
うにょうにょ
```

## 配置を変える

```ugougo
align: left
size: 40
---
ひだりよせ
```

```ugougo
align: right
size: 40
---
みぎよせ
```

## 動かさない（静止画として使う）

```ugougo
animate: false
color: #69d2ff
---
しずかなもじ
```

## 崩壊するとどうなるか

推奨範囲（`wobble` 9〜16 / `freq` 0.010〜0.025）を大きく超えると読めなくなります。

```ugougo
wobble: 28
freq: 0.08
---
よめない
```
