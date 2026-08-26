/**
 * Builds the Marp CLI custom engine, then embeds it into the plugin.
 *
 * Obsidian's community plugin installer only ever places main.js, manifest.json
 * and styles.css into a vault, so the engine cannot ship as a fourth file. It
 * is instead emitted as a string module that main.js writes to disk on load.
 *
 * This must run before the plugin build, because `src/generated/engine-source.ts`
 * is one of its inputs.
 */
import esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const ENGINE_OUT = 'marp-engine.cjs';
const GENERATED_DIR = 'src/generated';
const GENERATED_FILE = `${GENERATED_DIR}/engine-source.ts`;

await esbuild.build({
	entryPoints: ['src/marp-engine.ts'],
	bundle: true,
	format: 'cjs',
	platform: 'node',
	target: 'node18',
	// marp-core is resolved at runtime, from wherever Marp CLI lives.
	external: ['@marp-team/marp-core'],
	outfile: ENGINE_OUT,
	footer: { js: 'module.exports = module.exports.default;' },
	logLevel: 'info',
});

const source = readFileSync(ENGINE_OUT, 'utf8');
mkdirSync(GENERATED_DIR, { recursive: true });
writeFileSync(
	GENERATED_FILE,
	'// GENERATED FILE — do not edit.\n' +
		'// Produced by esbuild.engine.mjs from src/marp-engine.ts.\n' +
		'\n' +
		'export const ENGINE_SOURCE = ' +
		JSON.stringify(source) +
		';\n',
	'utf8'
);

console.log(`  ${GENERATED_FILE}  ${(source.length / 1024).toFixed(1)}kb embedded`);
