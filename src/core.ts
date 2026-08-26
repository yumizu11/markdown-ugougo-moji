/**
 * The renderer.
 *
 * `buildSvg` is a pure function: text + options in, a complete standalone SVG
 * document out. Nothing here touches Obsidian or the DOM, which keeps the same
 * code usable for a markdown-it plugin or a static `.svg` exporter later.
 *
 * How the effect works
 * --------------------
 * `feTurbulence` generates Perlin noise; `feDisplacementMap` uses it to shove
 * the glyph pixels around. Cycling the noise `seed` with `calcMode="discrete"`
 * at a low frame rate makes the outline look redrawn every frame — it boils
 * rather than glides, which is what reads as "うにょうにょ". A small per-glyph
 * translate/rotate on `step-end` adds the hand-animated feel on top.
 */

import type { UgougoOptions } from './options';

/** Deterministic PRNG, so the same block always renders the same way. */
function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hash(str: string): number {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Approximate advance width in em. Real font metrics are unavailable here, so
 * CJK is treated as full width and Latin/halfwidth-kana as ~0.55em. Good enough
 * to size the viewBox; mixed scripts drift by a few percent.
 */
function advance(ch: string): number {
	const cp = ch.codePointAt(0) ?? 0;
	if (cp < 0x100) return 0.55;
	if (cp >= 0xff61 && cp <= 0xff9f) return 0.55; // halfwidth katakana
	return 1;
}

function lineWidth(line: string): number {
	let w = 0;
	for (const ch of line) w += advance(ch);
	return w;
}

let counter = 0;

export interface BuiltSvg {
	svg: string;
	width: number;
	height: number;
}

export function buildSvg(text: string, opts: UgougoOptions): BuiltSvg | null {
	const lines = text.replace(/\s+$/, '').split('\n');
	if (lines.every((l) => l.trim() === '')) return null;

	const uid = `u${(counter++).toString(36)}${hash(text).toString(36)}`;
	const rnd = mulberry32(hash(text + JSON.stringify(opts)));

	const size = opts.size;
	const strokeW = size * opts.strokeWidth;
	// The displacement pushes pixels outward, so the box needs slack or the
	// filter region clips the wobble off at the edges.
	const pad = opts.wobble * 1.7 + strokeW;
	const maxWidth = Math.max(1, ...lines.map(lineWidth));
	const vbW = maxWidth * size + pad * 2;
	const lineH = size * 1.35;
	const vbH = lines.length * lineH + pad * 2;

	const frames = Math.round(opts.frames);
	const duration = frames / opts.fps;
	const seeds: number[] = [];
	for (let i = 0; i < frames; i++) seeds.push(Math.floor(rnd() * 9999));

	// --- per-glyph jitter keyframes ------------------------------------------
	// Three variants are enough to stop the line moving as one rigid block;
	// a random negative animation-delay desynchronises the glyphs further.
	let css = '';
	const jitterOn = opts.jitter > 0 && opts.animate;
	if (jitterOn) {
		for (let v = 0; v < 3; v++) {
			let kf = `@keyframes ${uid}j${v}{`;
			for (let f = 0; f < frames; f++) {
				const pct = ((f / frames) * 100).toFixed(2);
				const dx = ((rnd() - 0.5) * 2 * opts.jitter).toFixed(2);
				const dy = ((rnd() - 0.5) * 2 * opts.jitter).toFixed(2);
				const rot = ((rnd() - 0.5) * 1.6 * opts.jitter).toFixed(2);
				kf += `${pct}%{transform:translate(${dx}px,${dy}px) rotate(${rot}deg)}`;
			}
			css += kf + '}';
		}
		css +=
			`.${uid} .ugo-ch{transform-box:fill-box;transform-origin:50% 50%;` +
			`animation-duration:${duration.toFixed(3)}s;animation-timing-function:step-end;` +
			`animation-iteration-count:infinite}`;
		for (let v = 0; v < 3; v++) css += `.${uid} .ugo-ch.v${v}{animation-name:${uid}j${v}}`;
		// Belt and braces: styles.css covers this too, but a standalone export
		// of this SVG has no stylesheet to fall back on.
		css += `@media (prefers-reduced-motion:reduce){.${uid} .ugo-ch{animation:none}}`;
	}

	// --- glyphs ---------------------------------------------------------------
	let body = '';
	lines.forEach((line, li) => {
		const w = lineWidth(line) * size;
		let x =
			opts.align === 'left' ? pad : opts.align === 'right' ? vbW - pad - w : (vbW - w) / 2;
		const y = pad + li * lineH + size;

		for (const ch of line) {
			const aw = advance(ch) * size;
			if (ch.trim() !== '') {
				const cls = jitterOn ? ` class="ugo-ch v${Math.floor(rnd() * 3)}"` : '';
				const delay = jitterOn
					? ` style="animation-delay:${(-rnd() * duration).toFixed(3)}s"`
					: '';
				body +=
					`<text${cls} x="${(x + aw / 2).toFixed(1)}" y="${y.toFixed(1)}"` +
					` text-anchor="middle"${delay}>${escapeXml(ch)}</text>`;
			}
			x += aw;
		}
	});

	// --- filter ---------------------------------------------------------------
	const animateEl =
		opts.animate && frames > 1
			? `<animate attributeName="seed" values="${seeds.join(';')}"` +
				` dur="${duration.toFixed(3)}s" calcMode="discrete" repeatCount="indefinite"/>`
			: '';

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" class="ugougo-svg ${uid}"` +
		` viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}"` +
		` width="${Math.round(vbW)}" height="${Math.round(vbH)}"` +
		` role="img" aria-label="${escapeXml(lines.join(' '))}">` +
		(css ? `<style>${css}</style>` : '') +
		`<defs><filter id="${uid}f" x="-30%" y="-60%" width="160%" height="220%">` +
		`<feTurbulence type="fractalNoise" baseFrequency="${opts.freq}" numOctaves="2"` +
		` seed="${seeds[0]}" result="noise">${animateEl}</feTurbulence>` +
		`<feDisplacementMap in="SourceGraphic" in2="noise" scale="${opts.wobble}"` +
		` xChannelSelector="R" yChannelSelector="G"/>` +
		`</filter></defs>` +
		`<g filter="url(#${uid}f)" font-family="${escapeXml(opts.font)}" font-weight="900"` +
		` font-size="${size}" fill="${escapeXml(opts.color)}" stroke="${escapeXml(opts.stroke)}"` +
		` stroke-width="${strokeW.toFixed(1)}" stroke-linejoin="round" paint-order="stroke">` +
		body +
		`</g></svg>`;

	return { svg, width: Math.round(vbW), height: Math.round(vbH) };
}
