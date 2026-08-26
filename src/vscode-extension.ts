/**
 * VS Code extension entry.
 *
 * The built-in Markdown preview lets an extension contribute markdown-it
 * plugins, so the same `ugougo` fence works there with no host-specific
 * rendering code — `activate` hands back the plugin and VS Code does the rest.
 *
 * Two things about the preview make this viable, both checked against the
 * shipped implementation rather than assumed:
 *
 *   - its Content-Security-Policy allows `'unsafe-inline'` in `style-src` at
 *     every security level, so the `<style>` inside each block applies;
 *   - `script-src` requires a nonce, which costs nothing here because the
 *     graphics are inline SVG and CSS with no JavaScript at all.
 */

import * as vscode from 'vscode';
import {
	DEFAULT_OPTIONS,
	LIMITS,
	clamp,
	type Align,
	type UgougoOptions,
} from './options';
import { createUgougoPlugin, type MarkdownItLike } from './markdown-it-plugin';

const SECTION = 'ugougoMoji';

type NumericKey = keyof typeof LIMITS;
const NUMERIC_KEYS = Object.keys(LIMITS) as NumericKey[];

/**
 * Reads the workspace configuration into a full option set.
 *
 * Called per block rather than cached, so editing a setting takes effect on the
 * next preview refresh instead of requiring a window reload.
 */
function readDefaults(): UgougoOptions {
	const config = vscode.workspace.getConfiguration(SECTION);
	const options: UgougoOptions = { ...DEFAULT_OPTIONS };

	for (const key of NUMERIC_KEYS) {
		const value = config.get<number>(key);
		if (typeof value === 'number' && Number.isFinite(value)) {
			options[key] = clamp(value, key);
		}
	}

	const color = config.get<string>('color');
	if (typeof color === 'string' && color.trim() !== '') options.color = color.trim();

	const stroke = config.get<string>('stroke');
	if (typeof stroke === 'string' && stroke.trim() !== '') options.stroke = stroke.trim();

	const font = config.get<string>('font');
	if (typeof font === 'string' && font.trim() !== '') options.font = font.trim();

	const align = config.get<string>('align');
	if (align === 'left' || align === 'center' || align === 'right') {
		options.align = align as Align;
	}

	const animate = config.get<boolean>('animate');
	if (typeof animate === 'boolean') options.animate = animate;

	return options;
}

export function activate(): { extendMarkdownIt(md: MarkdownItLike): MarkdownItLike } {
	const plugin = createUgougoPlugin(readDefaults);
	return {
		extendMarkdownIt(md: MarkdownItLike) {
			plugin(md);
			return md;
		},
	};
}

export function deactivate(): void {
	// Nothing to tear down: the plugin holds no resources.
}
