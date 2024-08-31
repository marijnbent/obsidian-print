import { App, PluginSettingTab, Setting } from 'obsidian';
import PrintPlugin from './main';

export class PrintSettingTab extends PluginSettingTab {
    plugin: PrintPlugin;

    constructor(app: App, plugin: PrintPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName('Print Plugin').setHeading();

        new Setting(containerEl)
            .setName('Print note title')
            .setDesc('Include the note title in the printout.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.printTitle)
                .onChange(async (value) => {
                    this.plugin.settings.printTitle = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Font size')
            .setDesc('Set the font size for the printed note.')
            .addText(text => text
                .setPlaceholder('14px')
                .setValue(this.plugin.settings.fontSize)
                .onChange(async (value) => {
                    this.plugin.settings.fontSize = value;
                    await this.plugin.saveSettings();
                }));



        const headings = ['h1Size', 'h2Size', 'h3Size', 'h4Size', 'h5Size', 'h6Size'] as const;

        headings.forEach((heading, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} size`)
                .setDesc(`Set the size for <h${index + 1}> elements.`)
                .addText(text => text
                    .setPlaceholder(`${this.plugin.settings[heading]}`)
                    .setValue(this.plugin.settings[heading])
                    .onChange(async (value) => {
                        this.plugin.settings[heading] = value;
                        await this.plugin.saveSettings();
                    }));
        });

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug mode. This will open the print window for inspection.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc('You can add custom print styles by adding a `print.css` snippet. The print window\'s body uses the `obsidian-print` class, so you can prefix your custom print styles accordingly.');

    }
}