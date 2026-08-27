/**
 * Option types, defaults, validation and block parsing.
 *
 * This module has no Obsidian dependency on purpose — it is shared with the
 * pure SVG renderer in `core.ts` so both can be reused outside the plugin
 * (a markdown-it plugin, a static .svg exporter, ...).
 */

export type Align = 'left' | 'center' | 'right';

export interface UgougoOptions {
	/** Fill colour of the glyphs. */
	color: string;
	/** Outline colour drawn behind the fill. */
	stroke: string;
	/** Outline thickness, as a fraction of the font size. */
	strokeWidth: number;
	/** Font size in SVG user units (≈ px). */
	size: number;
	/** Displacement amplitude. The "うにょうにょ" amount. */
	wobble: number;
	/** Turbulence base frequency. Lower = long smooth waves, higher = crumpled. */
	freq: number;
	/** Frames per second of the discrete animation. Low values look hand-drawn. */
	fps: number;
	/** Number of distinct frames cycled through. */
	frames: number;
	/** Per-character jitter amplitude in px. 0 disables it. */
	jitter: number;
	/** Horizontal alignment of the block. */
	align: Align;
	/** CSS font-family stack used for the glyphs. */
	font: string;
	/** When false, a single static frame is rendered instead of an animation. */
	animate: boolean;
}

export const DEFAULT_FONT =
	"'Rounded Mplus 1c', 'Hiragino Maru Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif";

export const DEFAULT_OPTIONS: UgougoOptions = {
	color: '#ffe600',
	stroke: '#000000',
	strokeWidth: 0.17,
	size: 56,
	wobble: 12,
	freq: 0.015,
	fps: 8,
	frames: 4,
	jitter: 1,
	align: 'center',
	font: DEFAULT_FONT,
	animate: true,
};

/**
 * Hard limits. The upper ends are where the effect stops being readable —
 * measured, not guessed: past wobble ≈ 20 or freq ≈ 0.05 the glyphs shred.
 */
export const LIMITS = {
	strokeWidth: { min: 0, max: 0.6 },
	size: { min: 8, max: 240 },
	wobble: { min: 0, max: 30 },
	freq: { min: 0.002, max: 0.09 },
	fps: { min: 1, max: 30 },
	frames: { min: 2, max: 12 },
	jitter: { min: 0, max: 8 },
} as const;

/** Values that keep the text legible. Used for the settings UI hints. */
export const RECOMMENDED = {
	wobble: { min: 9, max: 16 },
	freq: { min: 0.01, max: 0.025 },
} as const;

type NumericKey = keyof typeof LIMITS;

const NUMERIC_KEYS = Object.keys(LIMITS) as NumericKey[];
const ALIGNS: readonly Align[] = ['left', 'center', 'right'];

/** `strokeWidth`, `strokewidth` and `stroke-width` should all mean the same. */
function normalizeKey(raw: string): string {
	return raw.trim().toLowerCase().replace(/[-_]/g, '');
}

const NUMERIC_BY_KEY = new Map<string, NumericKey>(
	NUMERIC_KEYS.map((k) => [normalizeKey(k), k])
);

/** #rgb / #rrggbb(aa), rgb()/rgba()/hsl()/hsla(), or a bare CSS colour keyword. */
const COLOR_RE =
	/^(#[0-9a-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([0-9\s.,%/-]+\))$/i;
/**
 * Font stacks are written into an SVG attribute, so they stay boring.
 *
 * Letters of any script are allowed — a plugin for Japanese text has to accept
 * `メイリオ` and `游ゴシック体` — along with digits, spaces, quotes, commas,
 * dots, underscores and hyphens. Everything else is refused, which most
 * usefully rules out the brackets that `url(...)` would need. The value is XML
 * escaped on the way out regardless; this is the belt to that pair of braces.
 */
const FONT_RE = /^[\p{L}\p{N}\s,'"._-]+$/u;

export function clamp(value: number, key: NumericKey): number {
	const { min, max } = LIMITS[key];
	return Math.min(max, Math.max(min, value));
}

function coerceNumber(raw: string, key: NumericKey): number | null {
	const n = Number(raw);
	if (!Number.isFinite(n)) return null;
	return clamp(n, key);
}

/**
 * Applies a single `key: value` pair onto a partial option set.
 * Unknown keys and invalid values are ignored rather than throwing — a typo in
 * a note should degrade to the default, not blow up the rendered block.
 */
function applyPair(into: Partial<UgougoOptions>, rawKey: string, rawValue: string): void {
	const key = normalizeKey(rawKey);
	const value = rawValue.trim();
	if (value === '') return;

	const numericKey = NUMERIC_BY_KEY.get(key);
	if (numericKey) {
		const n = coerceNumber(value, numericKey);
		if (n !== null) (into as Record<string, number>)[numericKey] = n;
		return;
	}

	switch (key) {
		case 'color':
		case 'stroke':
			if (COLOR_RE.test(value)) into[key] = value;
			return;
		case 'align':
			if ((ALIGNS as readonly string[]).includes(value)) into.align = value as Align;
			return;
		case 'font':
			if (FONT_RE.test(value)) into.font = value;
			return;
		case 'animate':
			into.animate = !/^(false|no|off|0)$/i.test(value);
			return;
		default:
			return;
	}
}

/** Plugin-level settings: the default options, plus behaviour toggles. */
export type UgougoSettings = UgougoOptions & {
	/** When on, a system "reduce motion" preference renders static frames. */
	respectReducedMotion: boolean;
	/** Absolute path to the built `marp-engine.cjs`. Required for slide export. */
	marpEnginePath: string;
	/** Overrides the Marp CLI binary. Empty means "find it next to the engine". */
	marpCommand: string;
	/** Absolute output folder. Empty means "beside the note". */
	marpOutputFolder: string;
};

export const DEFAULT_SETTINGS: UgougoSettings = {
	...DEFAULT_OPTIONS,
	respectReducedMotion: true,
	marpEnginePath: '',
	marpCommand: '',
	marpOutputFolder: '',
};

export interface ParsedBlock {
	text: string;
	overrides: Partial<UgougoOptions>;
}

const OPTION_LINE_RE = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/;
const SEPARATOR_RE = /^-{3,}\s*$/;

/**
 * Splits a code block body into an optional option header and the display text.
 *
 *     color: #5eff9b
 *     size: 64
 *     ---
 *     おはよう
 *
 * Obsidian ignores everything after the first space in a fence info string
 * (```ugougo color=red never reaches the processor), so options have to live
 * in the body. The header is only recognised when a `---` separator exists AND
 * every line before it parses as `key: value` — otherwise the whole body is
 * treated as text, so a note that legitimately starts with `---` still works.
 */
export function parseBlock(source: string): ParsedBlock {
	const lines = source.replace(/\s+$/, '').split('\n');
	const sepIndex = lines.findIndex((line) => SEPARATOR_RE.test(line));

	if (sepIndex > 0) {
		const header = lines.slice(0, sepIndex);
		const parsed: Array<[string, string]> = [];
		const allOptions = header.every((line) => {
			if (line.trim() === '') return true;
			const m = OPTION_LINE_RE.exec(line);
			if (!m) return false;
			parsed.push([m[1] as string, m[2] as string]);
			return true;
		});

		if (allOptions) {
			const overrides: Partial<UgougoOptions> = {};
			for (const [k, v] of parsed) applyPair(overrides, k, v);
			return { text: lines.slice(sepIndex + 1).join('\n'), overrides };
		}
	}

	return { text: lines.join('\n'), overrides: {} };
}

export function resolveOptions(
	base: UgougoOptions,
	overrides: Partial<UgougoOptions>
): UgougoOptions {
	const merged = { ...base, ...overrides };
	for (const key of NUMERIC_KEYS) merged[key] = clamp(merged[key], key);
	return merged;
}
