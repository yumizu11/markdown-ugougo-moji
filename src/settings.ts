import { App, Platform, PluginSettingTab, Setting } from 'obsidian';
import {
	DEFAULT_FONT,
	DEFAULT_SETTINGS,
	LIMITS,
	RECOMMENDED,
	type Align,
	type UgougoSettings,
} from './options';
import type UgougoPlugin from './main';

/** Obsidian sliders are integer-only, so float options ride on a scaled range. */
const FREQ_SCALE = 1000;
const STROKE_SCALE = 100;

export class UgougoSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: UgougoPlugin
	) {
		super(app, plugin);
	}

	private async commit(): Promise<void> {
		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const s = this.plugin.settings;

		new Setting(containerEl)
			.setName('Text colour')
			.setDesc('Fill colour of the glyphs. Individual blocks can override this.')
			.addColorPicker((c) =>
				c.setValue(s.color).onChange(async (v) => {
					s.color = v;
					await this.commit();
				})
			);

		new Setting(containerEl)
			.setName('Outline colour')
			.setDesc('Drawn behind the fill. The thick dark outline is most of the look.')
			.addColorPicker((c) =>
				c.setValue(s.stroke).onChange(async (v) => {
					s.stroke = v;
					await this.commit();
				})
			);

		new Setting(containerEl)
			.setName('Outline thickness')
			.setDesc('As a fraction of the font size.')
			.addSlider((sl) =>
				sl
					.setLimits(
						LIMITS.strokeWidth.min * STROKE_SCALE,
						LIMITS.strokeWidth.max * STROKE_SCALE,
						1
					)
					.setValue(Math.round(s.strokeWidth * STROKE_SCALE))
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.strokeWidth = v / STROKE_SCALE;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Font size')
			.addSlider((sl) =>
				sl
					.setLimits(LIMITS.size.min, LIMITS.size.max, 1)
					.setValue(s.size)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.size = v;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Wobble')
			.setDesc(
				`How far the outline is pushed around. ` +
					`${RECOMMENDED.wobble.min}–${RECOMMENDED.wobble.max} stays readable; ` +
					`past about 20 the glyphs shred.`
			)
			.addSlider((sl) =>
				sl
					.setLimits(LIMITS.wobble.min, LIMITS.wobble.max, 1)
					.setValue(s.wobble)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.wobble = v;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Distortion detail')
			.setDesc(
				`Low values give long smooth waves, high values a crumpled edge. ` +
					`${RECOMMENDED.freq.min}–${RECOMMENDED.freq.max} is the usable range.`
			)
			.addSlider((sl) =>
				sl
					.setLimits(
						LIMITS.freq.min * FREQ_SCALE,
						LIMITS.freq.max * FREQ_SCALE,
						1
					)
					.setValue(Math.round(s.freq * FREQ_SCALE))
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.freq = v / FREQ_SCALE;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Frames per second')
			.setDesc('Low values look hand-drawn. The original show sits around 6–10.')
			.addSlider((sl) =>
				sl
					.setLimits(LIMITS.fps.min, LIMITS.fps.max, 1)
					.setValue(s.fps)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.fps = v;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Frame count')
			.setDesc('How many distinct distortions are cycled through.')
			.addSlider((sl) =>
				sl
					.setLimits(LIMITS.frames.min, LIMITS.frames.max, 1)
					.setValue(s.frames)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.frames = v;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Per-character jitter')
			.setDesc('Extra wobble applied to each glyph on its own. 0 turns it off.')
			.addSlider((sl) =>
				sl
					.setLimits(LIMITS.jitter.min, LIMITS.jitter.max, 1)
					.setValue(s.jitter)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.jitter = v;
						await this.commit();
					})
			);

		new Setting(containerEl).setName('Alignment').addDropdown((d) =>
			d
				.addOptions({ left: 'Left', center: 'Center', right: 'Right' })
				.setValue(s.align)
				.onChange(async (v) => {
					s.align = v as Align;
					await this.commit();
				})
		);

		new Setting(containerEl)
			.setName('Font stack')
			.setDesc('A rounded gothic gets closest to the original.')
			.addTextArea((t) =>
				t
					.setPlaceholder(DEFAULT_FONT)
					.setValue(s.font)
					.onChange(async (v) => {
						s.font = v.trim() === '' ? DEFAULT_FONT : v;
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Animate')
			.setDesc('Turn off to render a single static distorted frame.')
			.addToggle((t) =>
				t.setValue(s.animate).onChange(async (v) => {
					s.animate = v;
					await this.commit();
				})
			);

		new Setting(containerEl)
			.setName('Respect reduced motion')
			.setDesc(
				'When your system asks for reduced motion, render static frames. ' +
					'Constantly moving text is a real accessibility problem — leave this on ' +
					'unless you have a reason not to.'
			)
			.addToggle((t) =>
				t.setValue(s.respectReducedMotion).onChange(async (v) => {
					s.respectReducedMotion = v;
					await this.commit();
				})
			);

		if (Platform.isDesktopApp) this.displayMarpSettings(containerEl, s);

		new Setting(containerEl).addButton((b) =>
			b
				.setButtonText('Reset to defaults')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings = { ...DEFAULT_SETTINGS };
					await this.commit();
					this.display();
				})
		);
	}

	/** Desktop only — the export commands shell out to Marp CLI. */
	private displayMarpSettings(containerEl: HTMLElement, s: UgougoSettings): void {
		new Setting(containerEl).setName('Marp slide export').setHeading();

		new Setting(containerEl)
			.setName('Engine path override')
			.setDesc(
				'Leave empty. The plugin writes its own marp-engine.cjs into this ' +
					'plugin folder and uses that. Point this at a development ' +
					'checkout only if you are working on the engine itself.'
			)
			.addText((t) =>
				t
					.setPlaceholder('(bundled engine)')
					.setValue(s.marpEnginePath)
					.onChange(async (v) => {
						s.marpEnginePath = v.trim();
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Marp CLI command')
			.setDesc(
				'Leave empty to search near the engine, then for a global "marp", ' +
					'then npx. A path ending in .js is run with Node.'
			)
			.addText((t) =>
				t
					.setPlaceholder('(auto-detect)')
					.setValue(s.marpCommand)
					.onChange(async (v) => {
						s.marpCommand = v.trim();
						await this.commit();
					})
			);

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Absolute path. Leave empty to write the HTML beside the note.')
			.addText((t) =>
				t
					.setPlaceholder('(beside the note)')
					.setValue(s.marpOutputFolder)
					.onChange(async (v) => {
						s.marpOutputFolder = v.trim();
						await this.commit();
					})
			);
	}
}
