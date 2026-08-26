# Ugougo Moji for VS Code

Renders text in ` ```ugougo ` code blocks as wobbling retro-TV style graphics in
the built-in Markdown preview, in the manner of the 1990s Japanese TV show
ウゴウゴルーガ.

````markdown
```ugougo
ウゴウゴルーガ
```
````

Options go in the block body, separated from the text by `---`:

````markdown
```ugougo
color: #5eff9b
size: 64
wobble: 16
---
おはよう
みんなげんき？
```
````

Defaults for every option live under **Settings → Extensions → Ugougo Moji**.
Refresh the preview after changing one.

See the [project README](https://github.com/yumizu11/ugo_beta) for the full
option reference, the Obsidian plugin, and Marp slide support.
