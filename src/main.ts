import { Plugin, TFile, TFolder, MarkdownView } from 'obsidian';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { printFolder } from './folderPrint';
import { printContent } from './basicPrint/basicPrint';
import { advancedPrint } from './advancedPrint/advancedPrint';
import { PrintModeModal } from './PrintModeModal';
import { contentToHTML } from './normalCapturePreview';
import { initializeThemeColors, initializeFontSizes, PrintSettingTab } from './settings';
import { openPrintModal } from './basicPrint/basicPrintPreview';
import { generatePrintStyles } from './getStyles/generatePrintStyles';

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Initialize header colors and font sizes if not done before
        if (!this.settings.hasInitializedColors) {
            await initializeThemeColors(this.app, this);
        }
        // Initialize header colors and font sizes if not done before
        if (!this.settings.hasInitializedSizes) {
            await initializeFontSizes(this);
        }

        this.addCommand({
            id: 'advanced-print',
            name: 'Current note (Advanced print in browser)',
            callback: async () => {
                await advancedPrint(this.app, this.manifest, this.settings);
            }
        });

        this.addCommand({
            id: 'standard-print',
            name: 'Current note (Standard print in browser)',
            callback: async () => await this.standardPrint(),
        });

        // original method using electron
        this.addCommand({
            id: 'print-note',
            name: 'Current note (Basic print)',
            callback: async () => await this.basicPrint(),
        });

        this.addCommand({
            id: 'print-selection',
            name: 'Selection',
            callback: async () => await this.handlePrint(false, true),
        });

        this.addCommand({
            id: 'print-folder-notes',
            name: 'All notes in current folder',
            callback: async () => await printFolder(this),
        });

        this.addSettingTab(new PrintSettingTab(this.app, this));

        // Add debounce to prevent double triggering from ribbon
        let isProcessing = false;
        this.addRibbonIcon('printer', 'Print note', async () => {
            if (isProcessing) return;
            isProcessing = true;
            await this.handlePrint();
            // Reset after a short delay
            setTimeout(() => {
                isProcessing = false;
            }, 500);
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print note')
                            .setIcon('printer')
                            .onClick(async () => await this.handlePrint(true, false, file));
                    });
                } else {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print all notes in folder')
                            .setIcon('printer')
                            .onClick(async () => await printFolder(this, file as TFolder));
                    });
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Print note')
                        .setIcon('printer')
                        .onClick(async () => await this.handlePrint());
                });
                menu.addItem((item) => {
                    item
                        .setTitle('Print selection')
                        .setIcon('printer')
                        .onClick(async () => await this.handlePrint(false, true));
                });
            })
        );
    }

    /**
     * Prints the current note or a specified file
     * @param isSelection Whether to print only the selected text (default: false)
     * @param file Optional file to print, defaults to active file
     */
    async standardPrint(isSelection = false, file?: TFile) {
        const content = await contentToHTML(this.app, this.settings, isSelection, file);
        if (!content) {
            return;
        }
        await printContent(content, this.app, this.manifest, this.settings);
    }

    /**
     * Handles the print logic (standard/advanced) with modal option
     * @param useAdvancedPrint Whether to use advanced print mode (default: true)
     * @param isSelection Whether to print only the selected text (default: false)
     */
    public async handlePrint(useAdvancedPrint = true, isSelection = false, file?: TFile) {
        if (this.settings.useModal) {
            new PrintModeModal(
                this.app,
                this.settings,
                useAdvancedPrint,
                async (state) => {
                    if (useAdvancedPrint && state === 'advanced') {
                        await advancedPrint(this.app, this.manifest, this.settings, isSelection);
                    } else if (state === 'standard') {
                        await this.standardPrint(isSelection, file);
                    } else {
                        await this.basicPrint(isSelection, file);
                    }
                },
                async () => await this.saveSettings()
            ).open();
        } else {
            if (this.settings.useBrowserPrint) {
                await this.standardPrint(isSelection, file);
            } else {
                await this.basicPrint(isSelection, file);
            }
        }
    }

    /**
     * Save the active file before printing, so we can retrieve the most recent content.
     */
    async saveActiveFile(): Promise<TFile | null> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            await activeView.save();
        }

        return this.app.workspace.getActiveFile();
    }
    /**
     * Prints the current note or a specified file
     * @param isSelection Whether to print only the selected text (default: false)
     * @param file Optional file to print, defaults to active file
     */
    async basicPrint(isSelection = false, file?: TFile) {
        const content = await contentToHTML(this.app, this.settings, isSelection, file);
        if (!content) {
            return;
        }

        const globalCSS = await generatePrintStyles(this.app, this.manifest, this.settings);
        await openPrintModal(content, this.settings, globalCSS);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
