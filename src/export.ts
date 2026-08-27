/**
 * Runs Marp CLI as a child process to convert the active note into slides.
 *
 * Nothing here imports Obsidian, so path resolution and argument building can
 * be exercised outside the app. Node's `child_process` is only reached through
 * the injected `spawn`, which keeps this module harmless to load on mobile.
 *
 * Spawning notes
 * --------------
 * On Windows the npm-installed `marp` is a `.cmd` shim, and Node refuses to
 * execute those without `shell: true` — which concatenates arguments instead of
 * escaping them (Node's DEP0190). A note called `my "deck".md` would then break
 * the command line. So the preferred path runs marp-cli's JavaScript entry with
 * `node` from PATH and passes arguments as an array, where no quoting applies.
 * Anyone who built the engine already has Node installed.
 *
 * `process.execPath` is deliberately *not* used: inside Obsidian that is the
 * Obsidian binary, which intercepts command-line invocation and refuses to run
 * as Node unless the user enables Obsidian's own CLI ("Command line interface
 * is not enabled") — ELECTRON_RUN_AS_NODE does not get past it.
 *
 * Candidates are tried in order and a candidate that fails to *start* falls
 * through to the next; a candidate that starts and exits non-zero is a real
 * conversion failure and is reported as such.
 */

export interface SpawnOptions {
	cwd?: string;
	shell?: boolean;
	windowsHide?: boolean;
	env?: Record<string, string | undefined>;
}

export type SpawnLike = (
	command: string,
	args: string[],
	options: SpawnOptions
) => {
	stdout: { on(event: 'data', cb: (chunk: unknown) => void): void } | null;
	stderr: { on(event: 'data', cb: (chunk: unknown) => void): void } | null;
	on(event: 'error', cb: (err: Error) => void): void;
	on(event: 'close', cb: (code: number | null) => void): void;
};

export interface PathApi {
	join(...parts: string[]): string;
	dirname(p: string): string;
	basename(p: string, ext?: string): string;
	extname(p: string): string;
}

export interface FsApi {
	existsSync(p: string): boolean;
}

export interface ResolveDeps {
	path: PathApi;
	fs: FsApi;
	platform: string;
	env?: Record<string, string | undefined>;
}

/**
 * Where `npm install -g` puts packages.
 *
 * Looking here matters because a GUI application does not necessarily inherit
 * the same PATH as a terminal, so `marp` may be installed and still not be
 * spawnable by name from inside Obsidian.
 */
function globalModuleRoots(deps: ResolveDeps): string[] {
	const env = deps.env ?? {};
	const roots: string[] = [];
	if (deps.platform === 'win32') {
		if (env.APPDATA) roots.push(deps.path.join(env.APPDATA, 'npm', 'node_modules'));
	} else {
		roots.push('/usr/local/lib/node_modules', '/usr/lib/node_modules');
		if (env.HOME) {
			roots.push(deps.path.join(env.HOME, '.npm-global', 'lib', 'node_modules'));
			roots.push(deps.path.join(env.HOME, '.nvm', 'versions'));
		}
	}
	if (env.npm_config_prefix) {
		roots.push(
			deps.platform === 'win32'
				? deps.path.join(env.npm_config_prefix, 'node_modules')
				: deps.path.join(env.npm_config_prefix, 'lib', 'node_modules')
		);
	}
	return roots;
}

export type MarpSource = 'override' | 'node' | 'shim' | 'global' | 'path' | 'npx';

export interface MarpInvocation {
	/** 'node' runs marp-cli.js via Node; 'shell' hands a command line to a shell. */
	kind: 'node' | 'shell';
	/** The executable: 'node', a shim path, or a user-supplied command. */
	command: string;
	/** Absolute path to marp-cli.js. Only set when kind is 'node'. */
	script?: string;
	source: MarpSource;
}

/** How far up from the engine to look for a node_modules directory. */
const LOOKUP_DEPTH = 4;

/**
 * Builds the ordered list of ways to reach Marp CLI.
 *
 * The engine normally lives in the vault's plugin folder, which has no
 * node_modules, so a nearby install is only found when the engine path points
 * into a development checkout. After that the search falls back to a global
 * `marp`, then npx — which works anywhere but can stall on a cold cache.
 *
 * An override replaces the list entirely. A path ending in `.js` is run through
 * Node so no shell is involved; anything else is treated as a shell command.
 */
export function resolveMarpCandidates(
	enginePath: string,
	override: string,
	deps: ResolveDeps
): MarpInvocation[] {
	const trimmed = override.trim();
	if (trimmed !== '') {
		return trimmed.toLowerCase().endsWith('.js')
			? [{ kind: 'node', command: 'node', script: trimmed, source: 'override' }]
			: [{ kind: 'shell', command: trimmed, source: 'override' }];
	}

	const candidates: MarpInvocation[] = [];
	const shimName = deps.platform === 'win32' ? 'marp.cmd' : 'marp';

	let dir = deps.path.dirname(enginePath);
	for (let i = 0; i < LOOKUP_DEPTH; i++) {
		const modules = deps.path.join(dir, 'node_modules');

		const script = deps.path.join(modules, '@marp-team', 'marp-cli', 'marp-cli.js');
		if (deps.fs.existsSync(script)) {
			candidates.push({ kind: 'node', command: 'node', script, source: 'node' });
		}

		const shim = deps.path.join(modules, '.bin', shimName);
		if (deps.fs.existsSync(shim)) {
			candidates.push({ kind: 'shell', command: shim, source: 'shim' });
		}

		if (candidates.length > 0) break;
		const parent = deps.path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	// A global `npm i -g @marp-team/marp-cli`, found by path rather than by name
	// so it works even when Obsidian's PATH lacks the npm global folder.
	for (const root of globalModuleRoots(deps)) {
		const script = deps.path.join(root, '@marp-team', 'marp-cli', 'marp-cli.js');
		if (deps.fs.existsSync(script)) {
			candidates.push({ kind: 'node', command: 'node', script, source: 'global' });
			break;
		}
	}

	candidates.push({ kind: 'shell', command: 'marp', source: 'path' });
	candidates.push({
		kind: 'shell',
		command: 'npx --yes @marp-team/marp-cli',
		source: 'npx',
	});
	return candidates;
}

export interface ArgsInput {
	enginePath: string;
	inputPath: string;
	outputPath: string;
	extraArgs?: string[];
}

/**
 * Arguments in raw, unquoted form.
 *
 * `--no-stdin` is mandatory: without it Marp CLI waits on standard input
 * forever, which from inside Obsidian looks like a hang with no output.
 */
export function buildMarpArgs(input: ArgsInput): string[] {
	return [
		'--no-stdin',
		'--engine',
		input.enginePath,
		input.inputPath,
		'-o',
		input.outputPath,
		...(input.extraArgs ?? []),
	];
}

/** Quoting for the shell path only. Rules differ per platform. */
export function quoteArgs(args: string[], platform: string): string[] {
	if (platform === 'win32') {
		// cmd.exe escapes an embedded double quote by doubling it.
		return args.map((a) => `"${a.replace(/"/g, '""')}"`);
	}
	return args.map((a) => `'${a.replace(/'/g, `'\\''`)}'`);
}

/** Replaces the note's extension to derive a sibling output file. */
export function deriveOutputPath(
	inputPath: string,
	extension: string,
	outputDir: string,
	deps: { path: PathApi }
): string {
	const base = deps.path.basename(inputPath, deps.path.extname(inputPath));
	const dir = outputDir.trim() === '' ? deps.path.dirname(inputPath) : outputDir.trim();
	return deps.path.join(dir, `${base}.${extension}`);
}

export interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

export interface RunContext {
	cwd: string;
	spawn: SpawnLike;
	platform: string;
	env: Record<string, string | undefined>;
}

export function runMarp(
	invocation: MarpInvocation,
	args: string[],
	ctx: RunContext
): Promise<RunResult> {
	const useShell = invocation.kind === 'shell';
	const finalArgs = useShell
		? quoteArgs(args, ctx.platform)
		: [invocation.script ?? '', ...args];

	return new Promise((resolve, reject) => {
		const child = ctx.spawn(invocation.command, finalArgs, {
			cwd: ctx.cwd,
			shell: useShell,
			windowsHide: true,
			env: ctx.env,
		});
		let stdout = '';
		let stderr = '';
		child.stdout?.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.stderr?.on('data', (chunk) => {
			stderr += String(chunk);
		});
		child.on('error', reject);
		child.on('close', (code) => resolve({ code, stdout, stderr }));
	});
}

export interface AttemptResult extends RunResult {
	invocation: MarpInvocation;
}

/**
 * A shell candidate for a command that is not installed does not fail to spawn
 * — the shell starts, fails to find it, and exits. Those exits have to be read
 * as "route unavailable" or the fallback chain would stop at the first missing
 * command. 127 is the POSIX convention, 9009 is cmd.exe's.
 */
export function looksLikeMissingCommand(result: RunResult): boolean {
	if (result.code === 127 || result.code === 9009) return true;
	const text = `${result.stderr}\n${result.stdout}`;
	return (
		/is not recognized as an internal or external command/i.test(text) ||
		/command not found/i.test(text) ||
		/no such file or directory/i.test(text)
	);
}

/**
 * Runs the first candidate that manages to start.
 *
 * A spawn error, or a shell reporting an unknown command, means that route is
 * unavailable and the next candidate is tried. Once Marp itself runs, its exit
 * code is the answer — a failed conversion must not silently retry elsewhere.
 */
export async function runMarpWithFallback(
	candidates: MarpInvocation[],
	args: string[],
	ctx: RunContext
): Promise<AttemptResult> {
	let lastError: unknown;
	let lastUnavailable: AttemptResult | undefined;

	for (const invocation of candidates) {
		try {
			const result = await runMarp(invocation, args, ctx);
			if (result.code !== 0 && looksLikeMissingCommand(result)) {
				lastUnavailable = { ...result, invocation };
				continue;
			}
			return { ...result, invocation };
		} catch (err) {
			lastError = err;
		}
	}

	if (lastUnavailable) return lastUnavailable;
	if (lastError instanceof Error) throw lastError;
	// A spawn failure normally rejects with an Error, but never rely on it:
	// throwing a bare value loses the stack and breaks `instanceof` for callers.
	throw new Error(
		lastError === undefined
			? 'No way to run Marp CLI was available.'
			: `Could not start Marp CLI: ${String(lastError)}`
	);
}

/**
 * Picks the line worth showing from Marp CLI's output.
 *
 * Marp logs to stderr and, on a usage problem, follows the message with its
 * whole help text — so everything from `Usage:` onwards is dropped before
 * looking for the real complaint.
 */
export function summariseFailure(result: RunResult): string {
	const combined = `${result.stderr}\n${result.stdout}`;
	const usageAt = combined.search(/^\s*Usage:/m);
	const relevant = usageAt >= 0 ? combined.slice(0, usageAt) : combined;

	const lines = relevant
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l !== '');

	const picked =
		lines.find((l) => l.includes('[ ERROR ]')) ??
		lines.find((l) => l.includes('[  WARN ]')) ??
		lines[lines.length - 1];

	if (picked === undefined) return `Marp CLI exited with code ${result.code}`;
	return picked.replace(/^\[\s*(ERROR|WARN)\s*\]\s*/, '');
}
