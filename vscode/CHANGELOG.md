# Change Log

## 0.1.0

Initial release.

- `font` accepts family names in any script, so Japanese names such as
  `メイリオ` and `游ゴシック体` work as well as latin ones.

- `ugougo` fenced code blocks render in the built-in Markdown preview as
  wobbling retro-TV style text.
- Per-block options in the block body (`color`, `size`, `wobble`, `freq`, `fps`,
  `frames`, `jitter`, `stroke`, `strokeWidth`, `align`, `font`, `animate`),
  separated from the text by `---`.
- Defaults for every option under **Settings → Extensions → Ugougo Moji**,
  re-read on each render so a change applies on the next preview refresh.
- Out-of-range values are clamped and unreadable ones fall back to the default,
  so a mistake in a block degrades that block instead of breaking the preview.
- Blocks are inline SVG and CSS with no JavaScript, carry `role="img"` and an
  `aria-label`, and honour `prefers-reduced-motion`.
