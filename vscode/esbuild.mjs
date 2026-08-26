/**
 * Builds the VS Code extension from the shared sources in ../src.
 *
 * The extension host loads CommonJS and provides the `vscode` module itself,
 * so that stays external. Everything else — the renderer and the markdown-it
 * plugin — is bundled in, which is why the output is a single small file.
 */
import esbuild from 'esbuild';
import process from 'process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Anchored to this file, so `npm run build:vscode` works from the repo root.
const here = dirname(fileURLToPath(import.meta.url));
const prod = process.argv[2] === 'production';

await esbuild.build({
	entryPoints: [join(here, '..', 'src', 'vscode-extension.ts')],
	bundle: true,
	format: 'cjs',
	platform: 'node',
	target: 'node18',
	external: ['vscode'],
	outfile: join(here, 'extension.js'),
	sourcemap: prod ? false : 'inline',
	minify: prod,
	logLevel: 'info',
});
