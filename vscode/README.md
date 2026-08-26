# Ugougo Moji

Wobbling, retro-TV style text in the built-in Markdown preview.

![demo](https://raw.githubusercontent.com/yumizu11/markdown-ugougo-moji/main/docs/demo.gif)

The look comes from *Ugougo Lhuga* (ウゴウゴルーガ), a Japanese children's
television programme from the early 1990s whose Amiga-rendered captions never
quite sat still. Write a `ugougo` code block and the text inside it boils the
same way.

````markdown
```ugougo
ウゴウゴルーガ
```
````

## Options

Options go in the block body, separated from the text by `---`:

````markdown
```ugougo
color: #5eff9b
size: 64
wobble: 16
fps: 6
---
おはよう
みんなげんき？
```
````

| Key | Default | Range | What it does |
|---|---|---|---|
| `color` | `#ffe600` | CSS colour | Fill colour of the glyphs |
| `stroke` | `#000000` | CSS colour | Outline colour |
| `strokeWidth` | `0.17` | `0`–`0.6` | Outline thickness, as a fraction of the font size |
| `size` | `56` | `8`–`240` | Font size |
| `wobble` | `12` | `0`–`30` | How far the outline is pushed around |
| `freq` | `0.015` | `0.002`–`0.09` | Distortion detail: low is a long wave, high is a crumpled edge |
| `fps` | `8` | `1`–`30` | Frames per second. Low values look hand-drawn |
| `frames` | `4` | `2`–`12` | How many distinct distortions are cycled through |
| `jitter` | `1` | `0`–`8` | Extra wobble applied to each glyph on its own |
| `align` | `center` | `left`/`center`/`right` | Horizontal alignment |
| `font` | rounded gothic stack | font stack | Typeface used for the glyphs |
| `animate` | `true` | `true`/`false` | `false` renders a single static frame |

Key names ignore case and hyphens, so `strokeWidth`, `strokewidth` and
`stroke-width` all mean the same thing. Out-of-range numbers are clamped and
values that cannot be read fall back to the default, so a typo degrades the
block rather than breaking the preview.

**Keep `wobble` around 9–16 and `freq` around 0.010–0.025.** Past roughly 20 and
0.05 the glyphs shred into confetti — which is available to you, but rarely what
you wanted.

## Settings

Defaults for every option live under **Settings → Extensions → Ugougo Moji**
(`ugougoMoji.*`). Options written in a block always win over the settings.

Settings are read each time a block is drawn, so changing one takes effect when
the preview refreshes — no window reload.

## Notes

- Blocks render as inline SVG and CSS with **no JavaScript**, which is what lets
  them work under the preview's Content-Security-Policy.
- Each block carries `role="img"` and an `aria-label` holding its text, so
  screen readers read the words rather than skipping the graphic.
- The `@keyframes` driving the per-glyph jitter honour
  `prefers-reduced-motion`. Constantly moving text is a genuine accessibility
  problem; set `animate: false` on a block, or turn `ugougoMoji.animate` off, if
  a still frame is the better choice.
- A rounded gothic typeface gets closest to the original. Installing
  [M PLUS Rounded 1c](https://fonts.google.com/specimen/M+PLUS+Rounded+1c) is
  the easiest way to get one.

## The same blocks elsewhere

The renderer is shared, so the identical syntax also works in
[Obsidian](https://github.com/yumizu11/markdown-ugougo-moji#導入方法) and in
[Marp slide decks](https://github.com/yumizu11/markdown-ugougo-moji#marp-スライドで使う).

## License

MIT — see [LICENSE](https://github.com/yumizu11/markdown-ugougo-moji/blob/main/LICENSE).
