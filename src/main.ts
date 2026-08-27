import { Editor, FileSystemAdapter, Notice, Platform, Plugin, TFile } from 'obsidian';
import { buildSvg } from './core';
import { DEFAULT_SETTINGS, parseBlock, resolveOptions, type UgougoSettings } from './options';
import {
	buildMarpArgs,
	deriveOutputPath,
	resolveMarpCandidates,
	runMarpWithFallback,
	summariseFailure,
	type SpawnLike,
} from './export';
import { UgougoSettingTab } from './settings';
import { ENGINE_SOURCE } from './generated/engine-source';

/** Written into the plugin folder on load; see `ensureEngine`. */
const ENGINE_FILENAME = 'marp-engine.cjs';

export default class UgougoPlugin extends Plugin {
	settings: UgougoSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new UgougoSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor('ugougo', (source, el) => {
			this.renderBlock(source, el);
		});

		this.addCommand({
			id: 'insert-block',
			name: 'Insert block',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const body = selection.trim() === '' ? 'ウゴウゴルーガ' : selection;
				editor.replaceSelection('```ugougo\n' + body + '\n```\n');
			},
		});

		this.addCommand({
			id: 'export-slides-html',
			name: 'Export slides as HTML',
			checkCallback: (checking) => this.exportCommand(checking, false),
		});

		this.addCommand({
			id: 'export-slides-html-open',
			name: 'Export slides as HTML and open in browser',
			checkCallback: (checking) => this.exportCommand(checking, true),
		});

		if (Platform.isDesktopApp) void this.ensureEngine();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/**
	 * Obsidian supports pop-out windows, so the media query has to be asked of
	 * the window this element actually lives in, not the main one.
	 */
	private wantsStillFrame(el: HTMLElement): boolean {
		if (!this.settings.respectReducedMotion) return false;
		const view = el.ownerDocument.defaultView ?? window;
		return view.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	private renderBlock(source: string, el: HTMLElement): void {
		const { text, overrides } = parseBlock(source);
		const options = resolveOptions(this.settings, overrides);
		if (this.wantsStillFrame(el)) options.animate = false;

		const container = el.createDiv({ cls: 'ugougo-block' });
		container.dataset.align = options.align;

		const built = buildSvg(text, options);
		if (!built) {
			container.createDiv({
				cls: 'ugougo-notice',
				text: 'ugougo: this block has no text to display.',
			});
			return;
		}

		// Built from our own validated values, but parsed rather than assigned
		// through innerHTML so nothing in a note can inject markup.
		const parsed = new DOMParser().parseFromString(built.svg, 'image/svg+xml');
		if (parsed.getElementsByTagName('parsererror').length > 0) {
			container.createDiv({
				cls: 'ugougo-notice',
				text: 'ugougo: could not build the graphic for this block.',
			});
			return;
		}

		container.appendChild(el.ownerDocument.importNode(parsed.documentElement, true));
	}

	/**
	 * Slide export shells out to Marp CLI, so the commands are offered only on
	 * desktop and only while a Markdown note is open. A missing engine path is
	 * reported when the command runs rather than hiding it, so the setting is
	 * discoverable.
	 */
	private exportCommand(checking: boolean, openAfter: boolean): boolean {
		if (!Platform.isDesktopApp) return false;
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== 'md') return false;
		if (!checking) void this.exportSlides(file, openAfter);
		return true;
	}

	/** Vault-relative path of the engine this plugin maintains for itself. */
	private engineVaultPath(): string | null {
		const dir = this.manifest.dir;
		return dir === undefined ? null : `${dir}/${ENGINE_FILENAME}`;
	}

	/**
	 * Keeps `marp-engine.cjs` up to date inside the plugin folder.
	 *
	 * Obsidian only installs main.js, manifest.json and styles.css, so the
	 * engine cannot ship as a separate file — it travels as a string and is
	 * written out here. Rewritten only when the content differs, so upgrading
	 * the plugin refreshes it without touching disk on every start.
	 */
	private async ensureEngine(): Promise<void> {
		const target = this.engineVaultPath();
		if (target === null) return;
		const adapter = this.app.vault.adapter;
		try {
			if (await adapter.exists(target)) {
				if ((await adapter.read(target)) === ENGINE_SOURCE) return;
			}
			await adapter.write(target, ENGINE_SOURCE);
		} catch (err) {
			console.error('[ugougo] could not write the Marp engine', err);
		}
	}

	private async exportSlides(file: TFile, openAfter: boolean): Promise<void> {
		const settings = this.settings;

		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('Ugougo Moji: slide export needs a local vault.', 8000);
			return;
		}

		// Node is only ever reached from here, and only on desktop. The command
		// that leads here is already gated the same way; repeating the check
		// keeps the guard next to the require, where it can be seen.
		if (!Platform.isDesktopApp) return;
		const nodePath = require('path') as typeof import('path');
		const nodeFs = require('fs') as typeof import('fs');
		const { spawn } = require('child_process') as typeof import('child_process');

		// The setting is an override for development checkouts; normally the
		// engine the plugin wrote for itself is used.
		const override = settings.marpEnginePath.trim();
		let enginePath = override;
		if (enginePath === '') {
			await this.ensureEngine();
			const vaultRelative = this.engineVaultPath();
			if (vaultRelative === null) {
				new Notice('Ugougo Moji: could not locate the plugin folder.', 8000);
				return;
			}
			enginePath = nodePath.join(adapter.getBasePath(), vaultRelative);
		}

		if (!nodeFs.existsSync(enginePath)) {
			new Notice(`Ugougo Moji: no Marp engine at ${enginePath}.`, 10000);
			return;
		}

		const inputPath = nodePath.join(adapter.getBasePath(), file.path);
		const outputPath = deriveOutputPath(inputPath, 'html', settings.marpOutputFolder, {
			path: nodePath,
		});
		const candidates = resolveMarpCandidates(enginePath, settings.marpCommand, {
			path: nodePath,
			fs: nodeFs,
			platform: process.platform,
			env: process.env,
		});

		const progress = new Notice(`Ugougo Moji: converting ${file.name}…`, 0);
		try {
			const result = await runMarpWithFallback(
				candidates,
				buildMarpArgs({ enginePath, inputPath, outputPath }),
				{
					cwd: nodePath.dirname(enginePath),
					spawn: spawn as unknown as SpawnLike,
					platform: process.platform,
					env: process.env,
				}
			);
			progress.hide();

			if (result.code !== 0) {
				new Notice(`Ugougo Moji: export failed — ${summariseFailure(result)}`, 12000);
				console.error('[ugougo] Marp CLI failed', result);
				return;
			}

			new Notice(`Ugougo Moji: exported ${nodePath.basename(outputPath)}`, 5000);
			if (openAfter) this.openInBrowser(outputPath);
		} catch (err) {
			progress.hide();
			new Notice(
				'Ugougo Moji: could not start Marp CLI. Check that Node.js is on your ' +
					'PATH and that "npm install" has been run next to the engine.',
				12000
			);
			console.error('[ugougo] Marp CLI could not be started', err);
		}
	}

	private openInBrowser(filePath: string): void {
		type Shell = {
			openExternal(url: string): Promise<void>;
			openPath(path: string): Promise<string>;
		};
		if (!Platform.isDesktopApp) return;
		try {
			const { pathToFileURL } = require('url') as typeof import('url');
			const { shell } = require('electron') as { shell: Shell };
			shell.openExternal(pathToFileURL(filePath).href).catch(() => {
				// Some desktop setups refuse file:// through openExternal; the OS
				// association is a good enough second try.
				void shell.openPath(filePath);
			});
		} catch (err) {
			new Notice('Ugougo Moji: exported, but opening the browser failed.', 8000);
			console.error('[ugougo] could not open the exported file', err);
		}
	}
}
