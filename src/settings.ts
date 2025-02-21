import { App, PluginSettingTab, Setting } from 'obsidian';
import PrintPlugin from './main';
import { getPrintSnippet, isPrintSnippetEnabled } from './utils/generatePrintStyles';
import { getHeadersCSS } from './utils/importThemeHeaders';

export class PrintSettingTab extends PluginSettingTab {
    plugin: PrintPlugin;

    constructor(app: App, plugin: PrintPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

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

        const hSizes = ['h1Size', 'h2Size', 'h3Size', 'h4Size', 'h5Size', 'h6Size'] as const;

        hSizes.forEach((hSize, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} size`)
                .setDesc(`Set the size for <h${index + 1}> elements.`)
                .addText(text => text
                    .setPlaceholder(`${this.plugin.settings[hSize]}`)
                    .setValue(this.plugin.settings[hSize])
                    .onChange(async (value) => {
                        this.plugin.settings[hSize] = value;
                        await this.plugin.saveSettings();
                    }));
        });

        const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

        new Setting(containerEl)
            .setName('Get colors from actual theme')
            .setDesc('Light mode colors are used.')
            .addButton(button => button
                .setButtonText('Get theme colors')
                .onClick(async () => {
                    await initializeThemeColors(this.app, this.plugin);
                    // Refresh the color pickers
                    this.display();
                })
            );

        hColors.forEach((hColor, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} color`)
                .setDesc(`Set the color for <h${index + 1}> elements.`)
                .addColorPicker(color => color
                    .setValue(`${this.plugin.settings[hColor]}`)
                    .onChange(async (value) => {
                        this.plugin.settings[hColor] = value;
                        await this.plugin.saveSettings();
                    })
                );
        });

        new Setting(containerEl)
            .setName('Combine folder notes')
            .setDesc('When printing a folder, combine all notes into a single document. If disabled, each note will start on a new page.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.combineFolderNotes)
                .onChange(async (value) => {
                    this.plugin.settings.combineFolderNotes = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Treat horizontal lines as page breaks')
            .setDesc('Enable this option to interpret horizontal lines (---) as page breaks ')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hrPageBreaks)
                .onChange(async (value) => {
                    this.plugin.settings.hrPageBreaks = value;
                    await this.plugin.saveSettings();
                }));

        const customCSSSetting = new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc(`Click the folder icon to create a "print.css" file in snippets. A toggle will appear here once the file exists to enable/disable your custom styles. Use ".obsidian-print" as prefix for your selectors. e.g: ".obsidian-print a {...}".`)
            .addButton(button => button
                .setIcon('folder')
                .setTooltip('Open snippets folder')
                .onClick(async () => {
                    await this.app.openWithDefaultApp('.obsidian/snippets');
                    // Add event listener for when focus returns to the window
                    window.addEventListener('focus', () => {
                        // Refresh the settings display
                        this.display();
                    }, { once: true }); // Use once: true to ensure it only runs once
                }));

        if (getPrintSnippet(this.app)) {
            customCSSSetting.addToggle(toggle => toggle
                .setValue(isPrintSnippetEnabled(this.app))
                .onChange(async (value) => {
                    this.app.customCss.setCssEnabledStatus("print", value);
                    await this.plugin.saveSettings();
                }));
        }
    }
}

/**
 * Initializes or updates heading colors from the current theme
 * @param app - The Obsidian App instance
 * @param plugin - The Print Plugin instance
 * @remarks Colors are extracted from light mode theme to ensure readability in print
 */
export async function initializeThemeColors(app: App, plugin: PrintPlugin) {
    const headers = getHeadersCSS(app);
    const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

    hColors.forEach((hColor, index) => {
        const realColor = headers.get(index + 1) ?? "#000000";
        plugin.settings[hColor] = realColor;
    });
    plugin.settings.hasInitializedColors = true;
    await plugin.saveSettings();
}

