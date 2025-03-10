import { App, PluginSettingTab, Setting } from 'obsidian';
import PrintPlugin from './main';
import { getPrintSnippet, isPrintSnippetEnabled } from './getStyles/generatePrintStyles';
import { getHeaderColors, getInlineTitleColor } from './getStyles/importThemeHeaders';

export class PrintSettingTab extends PluginSettingTab {
    plugin: PrintPlugin;

    constructor(app: App, plugin: PrintPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private validateFontSize(value: string, defaultSize: string): string {
        // Clean the input and convert to lowercase
        value = value.trim().toLowerCase();

        // Check if the value contains anything other than numbers and optionally 'px'
        if (!/^\d+(?:px)?$/.test(value)) {
            new Notice('Please enter a valid positive number');
            return defaultSize;
        }

        // Remove 'px' if present and convert to number
        const numValue = parseFloat(value.replace('px', ''));
        if (numValue <= 0) {
            new Notice('Please enter a positive number');
            return defaultSize;
        }

        return `${numValue}px`;
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
            .setDesc('Set the font size for the printed note (in pixels).')
            .addText(text => text
                .setPlaceholder('12')
                .setValue(this.plugin.settings.fontSize.replace('px', ''))
                .onChange(async (value) => {
                    this.plugin.settings.fontSize = this.validateFontSize(value, '12px');
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setButtonText('Set all sizes')
                .setTooltip('Automatically set all heading sizes based on the base font size')
                .onClick(async () => {
                    await initializeFontSizes(this.plugin);
                    this.display();
                }));

        // Headers in ascending size order
        const hSizes = ['h6Size', 'h5Size', 'h4Size', 'h3Size', 'h2Size', 'h1Size'] as const;
        hSizes.forEach((hSize, index) => {
            const level = 6 - index;
            const defaultSize = `${12 + (level * 2)}px`;
            new Setting(containerEl)
                .setName(`Heading ${level} size`)
                .setDesc(`Set the size for <h${level}> elements (in pixels).`)
                .addText(text => text
                    .setPlaceholder(`${12 + (level * 2)}`)
                    .setValue(this.plugin.settings[hSize].replace('px', ''))
                    .onChange(async (value) => {
                        this.plugin.settings[hSize] = this.validateFontSize(value, defaultSize);
                        await this.plugin.saveSettings();
                    }));
        });

        new Setting(containerEl)
            .setName('Inline title size')
            .setDesc('Set the size for the inline title (in pixels).')
            .addText(text => text
                .setPlaceholder('26')
                .setValue(this.plugin.settings.inlineTitleSize.replace('px', ''))
                .onChange(async (value) => {
                    this.plugin.settings.inlineTitleSize = this.validateFontSize(value, '26px');
                    await this.plugin.saveSettings();
                }));

        const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

        new Setting(containerEl)
            .setName('Import theme colors')
            .setDesc('Import all heading colors and inline title color from your current theme (using light mode values). ⚠️ For inline title: ensure to have an open markdown view.')
            .addButton(button => button
                .setButtonText('get theme colors')
                .setTooltip('Import heading colors from your current theme. This will update all heading colors and inline title color.')
                .onClick(async () => {
                    await initializeThemeColors(this.app, this.plugin);
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Inline title color')
            .setDesc('Set the color for the inline title.')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.inlineTitleColor)
                .onChange(async (value) => {
                    this.plugin.settings.inlineTitleColor = value;
                    await this.plugin.saveSettings();
                }));

        hColors.forEach((hColor, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} color`)
                .setDesc(`Set the color for <h${index + 1}> elements.`)
                .addColorPicker(color => color
                    .setValue(`${this.plugin.settings[hColor]}`)
                    .onChange(async (value) => {
                        this.plugin.settings[hColor] = value;
                        await this.plugin.saveSettings();
                    }));
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
            .setName('Show metadata')
            .setDesc('Include the note metadata in the printout.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.showMetadata = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Treat horizontal lines as page breaks')
            .setDesc('Enable this option to interpret horizontal lines (---) as page breaks')
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
                    window.addEventListener('focus', () => {
                        this.display();
                    }, { once: true });
                }));

        if (getPrintSnippet(this.app)) {
            customCSSSetting.addToggle(toggle => toggle
                .setValue(isPrintSnippetEnabled(this.app))
                .onChange(async (value) => {
                    this.app.customCss.setCssEnabledStatus("print", value);
                    await this.plugin.saveSettings();
                }));
        }

        new Setting(containerEl)
            .setName('Show print mode selection')
            .setDesc('Show a modal to choose between basic, standard and advanced(when possible) print mode.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useModal)
                .onChange(async (value) => {
                    this.plugin.settings.useModal = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Use browser print')
            .setDesc('Enable advanced printing through browser. This provides more printing options and a better text formatting. When disabled, use Obsidian\'s (electron) basic print only with basic css styles.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useBrowserPrint)
                .onChange(async (value) => {
                    this.plugin.settings.useBrowserPrint = value;
                    await this.plugin.saveSettings();
                }));

    }
}

export async function initializeThemeColors(app: App, plugin: PrintPlugin) {
    const headers = getHeaderColors(app);
    const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

    hColors.forEach((hColor, index) => {
        const realColor = headers.get(index + 1) ?? "#000000";
        plugin.settings[hColor] = realColor;
    });

    const inlineTitleColor = getInlineTitleColor(app);
    plugin.settings.inlineTitleColor = inlineTitleColor;

    plugin.settings.hasInitializedColors = true;
    await plugin.saveSettings();
}
export async function initializeFontSizes(plugin: PrintPlugin) {
    const baseSize = parseInt(plugin.settings.fontSize);
    if (isNaN(baseSize)) return;

    // Round to 1 decimal place for cleaner numbers
    plugin.settings.h6Size = `${Math.round(baseSize * 1.1 * 10) / 10}px`;
    plugin.settings.h5Size = `${Math.round(baseSize * 1.2 * 10) / 10}px`;
    plugin.settings.h4Size = `${Math.round(baseSize * 1.3 * 10) / 10}px`;
    plugin.settings.h3Size = `${Math.round(baseSize * 1.5 * 10) / 10}px`;
    plugin.settings.h2Size = `${Math.round(baseSize * 1.7 * 10) / 10}px`;
    plugin.settings.h1Size = `${Math.round(baseSize * 2.0 * 10) / 10}px`;
    plugin.settings.inlineTitleSize = `${Math.round(baseSize * 2.2 * 10) / 10}px`;

    plugin.settings.hasInitializedSizes = true;
    await plugin.saveSettings();
}