import { App, FileSystemAdapter, Notice, Platform, PluginSettingTab, Setting } from 'obsidian';
import PrintPlugin from './main';
import { getPrintSnippet, getPrintSnippetPath, isPrintSnippetEnabled, setPrintSnippetEnabled } from './utils/generatePrintStyles';
import { PrintPluginSettings } from './types';

export class PrintSettingTab extends PluginSettingTab {
    plugin: PrintPlugin;

    constructor(app: App, plugin: PrintPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /** Obsidian 1.13+ uses these definitions and indexes them for settings search. */
    getSettingDefinitions() {
        const normalizedSizeSettings = [
            ['Font size', 'Set the body font size for normalized print output.', 'fontSize'],
            ['Heading 1 size', 'Set the heading 1 size for normalized print output.', 'h1Size'],
            ['Heading 2 size', 'Set the heading 2 size for normalized print output.', 'h2Size'],
            ['Heading 3 size', 'Set the heading 3 size for normalized print output.', 'h3Size'],
            ['Heading 4 size', 'Set the heading 4 size for normalized print output.', 'h4Size'],
            ['Heading 5 size', 'Set the heading 5 size for normalized print output.', 'h5Size'],
            ['Heading 6 size', 'Set the heading 6 size for normalized print output.', 'h6Size']
        ].map(([name, desc, key]) => ({
            name,
            desc,
            visible: () => this.plugin.settings.normalizeStyle,
            control: { type: 'text', key }
        }));

        return [
            {
                name: 'Print note title',
                desc: 'Include the note title in the printout.',
                control: { type: 'toggle', key: 'printTitle' }
            },
            {
                name: 'Print properties',
                desc: 'Include the note properties at the top of the printout.',
                control: { type: 'toggle', key: 'printFrontmatter' }
            },
            {
                type: 'group',
                heading: 'Styling',
                items: [
                    {
                        name: 'Normalize style',
                        desc: 'Use a neutral built-in print style instead of the active theme.',
                        control: { type: 'toggle', key: 'normalizeStyle' }
                    },
                    ...normalizedSizeSettings,
                    {
                        name: 'Inherit note CSS classes',
                        desc: 'Apply note CSS classes to the printed output.',
                        control: { type: 'toggle', key: 'inheritNoteCssClasses' }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Layout',
                items: [
                    {
                        name: 'Combine multiple notes',
                        desc: 'Print folder notes and selected notes without starting each note on a new page.',
                        control: { type: 'toggle', key: 'combineFolderNotes' }
                    },
                    {
                        name: 'Treat horizontal lines as page breaks',
                        desc: 'Start a new page at each horizontal line.',
                        control: { type: 'toggle', key: 'hrPageBreaks' }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Advanced',
                items: [
                    {
                        name: 'Custom CSS',
                        desc: 'Use print.css from your CSS snippets folder. This switch also controls the snippet under Appearance.',
                        render: (setting: Setting) => this.renderCustomCssSetting(setting)
                    },
                    {
                        name: 'Debug mode',
                        desc: 'Open the generated print document for inspection.',
                        control: { type: 'toggle', key: 'debugMode' }
                    }
                ]
            }
        ];
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        this.addToggleSetting(
            containerEl,
            'Print note title',
            'Include the note title in the printout.',
            'printTitle'
        );
        this.addToggleSetting(
            containerEl,
            'Print properties',
            'Include the note properties/frontmatter block at the top of the printout.',
            'printFrontmatter'
        );

        this.addSectionHeading(containerEl, 'Styling');

        this.addToggleSetting(
            containerEl,
            'Normalize style',
            'Use a neutral built-in print style instead of the active theme.',
            'normalizeStyle',
            async () => this.display()
        );

        if (this.plugin.settings.normalizeStyle) {
            this.addTextSetting(
                containerEl,
                'Font size',
                'Set the body font size for normalized print output.',
                'fontSize'
            );

            const headings = ['h1Size', 'h2Size', 'h3Size', 'h4Size', 'h5Size', 'h6Size'] as const;

            headings.forEach((heading, index) => {
                this.addTextSetting(
                    containerEl,
                    `Heading ${index + 1} size`,
                    `Set the size for <h${index + 1}> elements in normalized print output.`,
                    heading
                );
            });
        }

        this.addToggleSetting(
            containerEl,
            'Inherit note CSS classes',
            'Apply note CSS classes to the printed output.',
            'inheritNoteCssClasses'
        );

        this.addSectionHeading(containerEl, 'Layout');

        this.addToggleSetting(
            containerEl,
            'Combine multiple notes',
            'Print folder notes and selected notes without starting each note on a new page.',
            'combineFolderNotes'
        );
        this.addToggleSetting(
            containerEl,
            'Treat horizontal lines as page breaks',
            'Start a new page at each horizontal line.',
            'hrPageBreaks'
        );

        this.addSectionHeading(containerEl, 'Advanced');

        this.renderCustomCssSetting(new Setting(containerEl).setName('Custom CSS'));

        this.addToggleSetting(
            containerEl,
            'Debug mode',
            'Open the generated print document for inspection.',
            'debugMode'
        );
    }

    private renderCustomCssSetting(setting: Setting): void {
        const path = getPrintSnippetPath(this.app);
        const description = `Edit ${path}. This switch also controls the snippet under Appearance > CSS snippets. Changes apply on the next print.`;
        const refreshDescription = async (): Promise<boolean> => {
            try {
                const exists = await getPrintSnippet(this.app);
                let message = '';
                if (!exists) {
                    message = await this.app.vault.adapter.exists(`${path}.css`)
                        ? ' Found print.css.css. Rename it to print.css; Windows may hide the final extension.'
                        : ' File not found. Create print.css in this folder, then enable this switch.';
                }
                setting.setDesc(description + message);
                return exists;
            } catch {
                setting.setDesc(`${description} Could not check the file. Check that the snippets folder is accessible.`);
                return false;
            }
        };

        setting.setDesc(description).addToggle(toggle => toggle
            .setValue(isPrintSnippetEnabled(this.app))
            .onChange(async (value) => {
                toggle.setDisabled(true);
                try {
                    if (!value || await refreshDescription()) {
                        setPrintSnippetEnabled(this.app, value);
                    }
                } finally {
                    toggle.setValue(isPrintSnippetEnabled(this.app));
                    toggle.setDisabled(false);
                }
            }));

        if (Platform.isDesktopApp && this.app.vault.adapter instanceof FileSystemAdapter) {
            setting.addExtraButton(button => button
                .setIcon('folder-open')
                .setTooltip('Open snippets folder')
                .onClick(async () => {
                    const adapter = this.app.vault.adapter;
                    if (!(adapter instanceof FileSystemAdapter)) return;
                    try {
                        const folder = `${this.app.vault.configDir}/snippets`;
                        if (!await adapter.exists(folder)) {
                            await adapter.mkdir(folder);
                        }
                        const electron = (window as Window & {
                            require: (name: string) => { shell: { openPath: (path: string) => Promise<string> } };
                        }).require('electron');
                        const error = await electron.shell.openPath(adapter.getFullPath(folder));
                        if (error) throw new Error(error);
                    } catch {
                        new Notice('Could not open the snippets folder. Use the folder button in your CSS snippet settings.');
                    }
                }));
        }

        void refreshDescription();
    }

    private addSectionHeading(containerEl: HTMLElement, text: string): void {
        new Setting(containerEl).setName(text).setHeading();
    }

    private addToggleSetting<K extends ToggleSettingKey>(
        containerEl: HTMLElement,
        name: string,
        description: string,
        key: K,
        onAfterChange?: () => void | Promise<void>
    ): void {
        new Setting(containerEl)
            .setName(name)
            .setDesc(description)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings[key])
                .onChange(async (value) => {
                    this.plugin.settings[key] = value;
                    await this.plugin.saveSettings();
                    await onAfterChange?.();
                }));
    }

    private addTextSetting<K extends TextSettingKey>(
        containerEl: HTMLElement,
        name: string,
        description: string,
        key: K
    ): void {
        new Setting(containerEl)
            .setName(name)
            .setDesc(description)
            .addText(text => text
                .setPlaceholder(this.plugin.settings[key])
                .setValue(this.plugin.settings[key])
                .onChange(async (value) => {
                    this.plugin.settings[key] = value;
                    await this.plugin.saveSettings();
                }));
    }
}

type ToggleSettingKey = {
    [Key in keyof PrintPluginSettings]: PrintPluginSettings[Key] extends boolean ? Key : never;
}[keyof PrintPluginSettings];

type TextSettingKey = {
    [Key in keyof PrintPluginSettings]: PrintPluginSettings[Key] extends string ? Key : never;
}[keyof PrintPluginSettings];
