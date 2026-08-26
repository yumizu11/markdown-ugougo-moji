/**
 * Marp CLI custom engine.
 *
 * Marp runs its own markdown-it pipeline, so the Obsidian code block processor
 * never sees a deck. This adds the same `ugougo` fence to Marp's pipeline by
 * reusing `core.ts` / `options.ts` unchanged.
 *
 * Marp CLI does not hand the engine an instance — it passes constructor
 * options and expects one back — so the engine builds its own Marp and
 * attaches the plugin. marp-core stays external to the bundle and resolves
 * from node_modules, which keeps this file at a few KB.
 *
 *     marp --no-stdin --engine ./marp-engine.cjs deck.md
 *
 * Build it with `npm run build:engine`.
 */

import type { Marp as MarpClass, MarpOptions } from '@marp-team/marp-core';
import { buildSvg } from './core';
import { DEFAULT_SETTINGS, parseBlock, resolveOptions } from './options';

/**
 * Finds marp-core.
 *
 * When the engine sits in the repository a plain require works. When the plugin
 * has written it into a vault's plugin folder there is no node_modules beside
 * it, so the copy Marp CLI itself depends on is borrowed instead.
 *
 * Which directory leads to that copy depends on how Marp CLI was launched — a
 * global shim, npx, or a direct `node marp-cli.js` all differ — so every
 * plausible base is tried, and the search is repeated by hand in case
 * `require.resolve` is constrained. A failure reports what it looked at,
 * because this runs in a child process where nothing else is observable.
 */
function resolveMarpCore(): string {
	const nodePath = require('path') as typeof import('path');
	const nodeFs = require('fs') as typeof import('fs');

	const bases: string[] = [];
	const add = (dir: string | undefined): void => {
		if (dir !== undefined && dir !== '' && !bases.includes(dir)) bases.push(dir);
	};

	const main = require.main;
	add(main ? nodePath.dirname(main.filename) : undefined);
	add(process.argv[1] ? nodePath.dirname(process.argv[1]) : undefined);
	add(__dirname);
	add(process.cwd());
	// Node's own lookup chain for the entry module, converted back to the
	// directories those node_modules folders belong to.
	if (main) for (const p of main.paths) add(nodePath.dirname(p));

	for (const base of bases) {
		try {
			return require.resolve('@marp-team/marp-core', { paths: [base] });
		} catch {
			// try the next base
		}
	}

	for (const base of bases) {
		let dir = base;
		for (let i = 0; i < 8; i++) {
			const candidate = nodePath.join(dir, 'node_modules', '@marp-team', 'marp-core');
			if (nodeFs.existsSync(candidate)) return candidate;
			const parent = nodePath.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}

	throw new Error(
		'ugougo engine could not locate @marp-team/marp-core. ' +
			`argv1=${process.argv[1] ?? '(none)'}; ` +
			`main=${main ? main.filename : '(none)'}; ` +
			`cwd=${process.cwd()}; tried=${bases.join(' :: ')}`
	);
}

function loadMarp(): typeof MarpClass {
	type CoreModule = { Marp: typeof MarpClass };
	try {
		return (require('@marp-team/marp-core') as CoreModule).Marp;
	} catch {
		return (require(resolveMarpCore()) as CoreModule).Marp;
	}
}

/** Just enough of markdown-it to hook the fence rule without pulling in types. */
interface FenceToken {
	info?: string;
	content: string;
}
type RenderRule = (
	tokens: FenceToken[],
	idx: number,
	options: unknown,
	env: unknown,
	self: { renderToken: (tokens: FenceToken[], idx: number, options: unknown) => string }
) => string;
interface MarkdownItLike {
	renderer: { rules: Record<string, RenderRule | undefined> };
}

/**
 * Layout CSS for the block wrapper. In the Obsidian plugin this lives in
 * styles.css, but a Marp deck has no stylesheet of ours to load, so each block
 * carries it. Repeating a few identical rules costs ~250 bytes per block and
 * keeps the engine stateless.
 */
const BLOCK_CSS =
	'.ugougo-block{display:flex;margin:.7em 0;overflow-x:auto}' +
	'.ugougo-block[data-align=left]{justify-content:flex-start}' +
	'.ugougo-block[data-align=center]{justify-content:center}' +
	'.ugougo-block[data-align=right]{justify-content:flex-end}' +
	'.ugougo-block .ugougo-svg{max-width:100%;height:auto;flex-shrink:1;overflow:visible}';

/** The markdown-it plugin itself — usable with any markdown-it, not just Marp. */
export function ugougoMarkdownIt(md: MarkdownItLike): void {
	const fallback: RenderRule =
		md.renderer.rules.fence ?? ((tokens, idx, options, _env, self) =>
			self.renderToken(tokens, idx, options));

	md.renderer.rules.fence = function (tokens, idx, options, env, self) {
		const token = tokens[idx];
		const info = (token?.info ?? '').trim();
		if (info.split(/\s+/)[0] !== 'ugougo') {
			return fallback(tokens, idx, options, env, self);
		}

		const { text, overrides } = parseBlock(token?.content ?? '');
		const resolved = resolveOptions(DEFAULT_SETTINGS, overrides);
		const built = buildSvg(text, resolved);
		if (!built) return '';

		return (
			`<div class="ugougo-block" data-align="${resolved.align}">` +
			`<style>${BLOCK_CSS}</style>${built.svg}</div>`
		);
	};
}

/** What Marp CLI loads via `--engine`. */
export default function engine(options: MarpOptions): MarpClass {
	const Marp = loadMarp();
	return new Marp(options).use(ugougoMarkdownIt as never) as MarpClass;
}
