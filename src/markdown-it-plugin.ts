/**
 * The `ugougo` fenced block as a plain markdown-it plugin.
 *
 * Shared by every host that runs its own markdown pipeline instead of
 * Obsidian's: the Marp CLI engine and the VS Code preview both use this, and it
 * works with any other markdown-it setup (VitePress, Docusaurus, ...) unchanged.
 */

import { buildSvg } from './core';
import { DEFAULT_SETTINGS, parseBlock, resolveOptions, type UgougoOptions } from './options';

/** Just enough of markdown-it to hook the fence rule without pulling in types. */
export interface FenceToken {
	info?: string;
	content: string;
}

export type RenderRule = (
	tokens: FenceToken[],
	idx: number,
	options: unknown,
	env: unknown,
	self: { renderToken: (tokens: FenceToken[], idx: number, options: unknown) => string }
) => string;

export interface MarkdownItLike {
	renderer: { rules: Record<string, RenderRule | undefined> };
}

/**
 * Layout CSS for the block wrapper.
 *
 * In the Obsidian plugin this lives in styles.css, but a Marp deck or a VS Code
 * preview has no stylesheet of ours to load, so each block carries its own.
 * Repeating a few identical rules costs about 250 bytes per block and keeps the
 * plugin stateless — which matters, because a renderer instance is reused
 * across documents.
 */
export const BLOCK_CSS =
	'.ugougo-block{display:flex;margin:.7em 0;overflow-x:auto}' +
	'.ugougo-block[data-align=left]{justify-content:flex-start}' +
	'.ugougo-block[data-align=center]{justify-content:center}' +
	'.ugougo-block[data-align=right]{justify-content:flex-end}' +
	'.ugougo-block .ugougo-svg{max-width:100%;height:auto;flex-shrink:1;overflow:visible}';

/**
 * Builds the plugin.
 *
 * Defaults are fetched per block rather than captured once, so a host whose
 * settings can change at runtime (VS Code) picks them up on the next render
 * without rebuilding the markdown-it instance.
 */
export function createUgougoPlugin(
	getDefaults: () => UgougoOptions
): (md: MarkdownItLike) => void {
	return (md: MarkdownItLike): void => {
		const fallback: RenderRule =
			md.renderer.rules.fence ??
			((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

		md.renderer.rules.fence = function (tokens, idx, options, env, self) {
			const token = tokens[idx];
			const info = (token?.info ?? '').trim();
			if (info.split(/\s+/)[0] !== 'ugougo') {
				return fallback(tokens, idx, options, env, self);
			}

			const { text, overrides } = parseBlock(token?.content ?? '');
			const resolved = resolveOptions(getDefaults(), overrides);
			const built = buildSvg(text, resolved);
			if (!built) return '';

			return (
				`<div class="ugougo-block" data-align="${resolved.align}">` +
				`<style>${BLOCK_CSS}</style>${built.svg}</div>`
			);
		};
	};
}

/** The plugin with the built-in defaults, for hosts that have no settings. */
export const ugougoMarkdownIt = createUgougoPlugin(() => DEFAULT_SETTINGS);
