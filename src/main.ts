import { Plugin, Notice, TFile, TFolder, MarkdownView } from 'obsidian';
import { PrintSettingTab } from './settings';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { openPrintModal } from './utils/printModal';
import { generatePreviewContent } from './utils/generatePreviewContent';
import { generatePrintStyles } from './utils/generatePrintStyles';
import { getFolderByActiveFile } from './utils/getFolderByActiveFile';

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.addCommand({
            id: 'print-note',
            name: 'Current note',
            callback: () => this.printNote(),
        });

        this.addCommand({
            id: 'print-folder-notes',
            name: 'All notes in current folder',
            callback: () => this.printFolder(),
        });

        this.addSettingTab(new PrintSettingTab(this.app, this));

        this.addRibbonIcon('printer', 'Print Note', (evt: MouseEvent) => {
            this.printNote();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print note')
                            .setIcon('printer')
                            .onClick(() => this.printNote(file));
                    });
                } else if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Print all notes in folder')
                            .setIcon('printer')
                            .onClick(() => this.printFolder(file));
                    });
                }
            })
        );
    }

    async printNote(file?: TFile) {
        if (!file) {
            await this.saveActiveFile()
        }

        const activeFile = file || this.app.workspace.getActiveFile();

        if (!activeFile) {
            new Notice('No note to print.');
            return;
        }

        const content = await generatePreviewContent(activeFile, this.settings.printTitle);
        const cssString = await generatePrintStyles(this.app, this.manifest, this.settings);

        await openPrintModal(content, this.settings, cssString);
    }

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
            const content = await generatePreviewContent(file, this.settings.printTitle);

            if (!this.settings.combineFolderNotes) {
                content.addClass('obsidian-print-page-break');
            }

            folderContent.append(content);
        }

        const cssString = await generatePrintStyles(this.app, this.manifest, this.settings);

        await openPrintModal(folderContent, this.settings, cssString);
    }

    /**
     * Save the active file before printing, so we can retrieve the most recent content.
     */
    async saveActiveFile() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            await activeView.save();
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}