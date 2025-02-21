import { Plugin, Notice, TFile, TFolder, MarkdownView } from 'obsidian';
import { initializeThemeColors, PrintSettingTab } from './settings';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { openPrintModal } from './utils/printModal';
import { generatePreviewContent } from './utils/generatePreviewContent';
import { generatePrintStyles } from './utils/generatePrintStyles';
import { getFolderByActiveFile } from './utils/getFolderByActiveFile';
import { captureActivePreview } from './utils/capturePreview';
import { ElectronStylePrinter } from './utils/electronPrint';

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {
        // console.log('Print plugin loaded');
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Initialize header colors with current theme if not done before
        if (!this.settings.hasInitializedColors) {
            await initializeThemeColors(this.app, this);
        }

        // Inside your plugin class, add to the onload() method:
        this.addCommand({
            id: 'print-electron-style',
            name: 'Print (Electron Style)',
            callback: async () => {
                const printer = new ElectronStylePrinter(this.app, this.manifest, this.settings);
                await printer.print();
            }
        });

        this.addCommand({
            id: 'print-preview-capture',
            name: 'Print current preview',
            callback: async () => {
                const previewContent = await captureActivePreview(this.app, this.settings.printTitle);
                if (!previewContent) {
                    new Notice('No preview content found to print.');
                    return;
                }

                const globalCss = await generatePrintStyles(this.app, this.manifest, this.settings);
                await openPrintModal(previewContent, globalCss);
            }
        });

        this.addCommand({
            id: 'print-note',
            name: 'Current note',
            callback: async () => await this.printNote(),
        });

        this.addCommand({
            id: 'print-selection',
            name: 'Print selection',
            callback: async () => await this.printSelection(),
        });

        this.addCommand({
            id: 'print-folder-notes',
            name: 'All notes in current folder',
            callback: async () => await this.printFolder(),
        });

        this.addSettingTab(new PrintSettingTab(this.app, this));

        this.addRibbonIcon('printer', 'Print note', async () => {
            await this.printNote();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print note')
                            .setIcon('printer')
                            .onClick(async () => await this.printNote(file));
                    });
                } else {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print all notes in folder')
                            .setIcon('printer')
                            .onClick(async () => await this.printFolder(file as TFolder));
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
                        .onClick(async () => await this.printNote());
                });
                menu.addItem((item) => {
                    item
                        .setTitle('Print selection')
                        .setIcon('printer')
                        .onClick(async () => await this.printSelection());
                });
            })
        );
    }

    /**
     * Prints the current note or a specified file
     * @param file Optional file to print, defaults to active file
     */
    async printNote(file?: TFile) {
        // if file is the active note, save it too
        if (!file || file === this.app.workspace.getActiveFile()) {
            file = await this.saveActiveFile() as TFile
        }

        if (!file) {
            new Notice('No note to print.');
            return;
        }

        const content = await generatePreviewContent(file, this.settings.printTitle, this.app);
        if (!content) {
            return;
        }

        const globalCss = await generatePrintStyles(this.app, this.manifest, this.settings);
        // console.log("globalCss", globalCss);
        await openPrintModal(content, globalCss);
    }

    /**
     * Prints the currently selected text
     */
    async printSelection() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note.');
            return;
        }

        const selection = activeView.editor.getSelection();
        if (!selection) {
            new Notice('No text selected.');
            return;
        }

        const content = await generatePreviewContent(selection, false, this.app);
        if (!content) {
            return;
        }

        const globalCss = await generatePrintStyles(this.app, this.manifest, this.settings);
        await openPrintModal(content, globalCss);
    }

    /**
     * Prints all markdown files in the current folder or specified folder
     * @param folder Optional folder to print, defaults to active file's folder
     */
    async printFolder(folder?: TFolder) {
        if (!folder) {
            await this.saveActiveFile()
        }

        const activeFolder = folder || await getFolderByActiveFile(this.app);

        if (!activeFolder) {
            new Notice('Could not resolve folder.');
            return;
        }

        const files = activeFolder.children.filter((file) => file instanceof TFile && file.extension === 'md') as TFile[];

        if (files.length === 0) {
            new Notice('No markdown files found in the folder.');
            return;
        }

        const folderContent = createDiv();

        for (const file of files) {
            const content = await generatePreviewContent(file, this.settings.printTitle, this.app);

            if (!content) {
                continue;
            }

            if (!this.settings.combineFolderNotes) {
                content.addClass('obsidian-print-page-break');
            }

            folderContent.append(content);
        }

        const globalCss = await generatePrintStyles(this.app, this.manifest, this.settings);

        await openPrintModal(folderContent, globalCss);
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

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
