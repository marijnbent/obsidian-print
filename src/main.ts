import { Plugin, Notice, TFile, TFolder, MarkdownView } from 'obsidian';
import { PrintSettingTab } from './settings';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { openPrintModal } from './utils/printModal';
import { generatePreviewContent } from './utils/generatePreviewContent';
import { generatePrintStyles } from './utils/generatePrintStyles';
import { getFolderByActiveFile } from './utils/getFolderByActiveFile';
import { getNoteCssClasses } from './utils/getNoteCssClasses';
import { generateViewContent } from './utils/generateViewContent';

const folderPrintOrderCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true
});

interface ActiveFileViewLike {
    containerEl?: HTMLElement;
    file?: TFile | null;
    getViewType?: () => string;
}

interface ResolvedPrintContent {
    content: HTMLElement;
    bodyClasses?: string[];
}

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {
        console.log('Print plugin loaded');
        const loadedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);

        if (
            loadedSettings?.inheritNoteCssClasses === undefined &&
            typeof loadedSettings?.extraClasses === 'boolean'
        ) {
            this.settings.inheritNoteCssClasses = loadedSettings.extraClasses;
        }

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
                })
                menu.addItem((item) => {
                    item
                        .setTitle('Print selection')
                        .setIcon('printer')
                        .onClick(async () => await this.printSelection());
                });
            })
        );
    }

    async printNote(file?: TFile) {
        const resolvedFile = await this.resolveRequestedFile(file);

        if (!resolvedFile) {
            new Notice('No note to print.');
            return;
        }

        const printableContent = await this.resolvePrintableFileContent(resolvedFile);
        if (!printableContent) {
            return;
        }

        await this.openPrintableContent(resolvedFile.basename, printableContent);
    }

    async printSelection() {
        const printableSelection = await this.resolvePrintableSelection();
        if (!printableSelection) {
            return;
        }

        await this.openPrintableContent(printableSelection.title, printableSelection);
    }

    async printFolder(folder?: TFolder) {
        if (!folder) {
            await this.saveActiveFile();
        }

        const activeFolder = folder || await getFolderByActiveFile(this.app);

        if (!activeFolder) {
            new Notice('Could not resolve folder.');
            return;
        }

        const files = this.getSortedMarkdownFiles(activeFolder);

        if (files.length === 0) {
            new Notice('No markdown files found in the folder.');
            return;
        }

        const folderContent = await this.buildFolderPrintContent(files);
        await this.openPrintableContent(activeFolder.name, { content: folderContent });
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

    private async resolveRequestedFile(file?: TFile): Promise<TFile | null> {
        const activeFile = this.app.workspace.getActiveFile();

        if (!file || file === activeFile) {
            return await this.saveActiveFile();
        }

        return file;
    }

    private async resolvePrintableFileContent(file: TFile): Promise<ResolvedPrintContent | void> {
        if (file.extension !== 'md') {
            const content = this.getPrintableNonMarkdownViewContent(file);
            return content ? { content } : undefined;
        }

        return await this.resolvePrintableMarkdownFileContent(file);
    }

    private async resolvePrintableSelection(): Promise<(ResolvedPrintContent & { title: string }) | void> {
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

        const content = await generatePreviewContent(selection, false, this.app, false);
        if (!content) {
            return;
        }

        this.setPrintSourcePath(content, activeView.file);

        return {
            title: activeView.file?.basename
                ? `${activeView.file.basename} snippet`
                : 'Selection',
            content,
            bodyClasses: this.applyNotePrintClasses(content, activeView.file)
        };
    }

    private async resolvePrintableMarkdownFileContent(file: TFile): Promise<ResolvedPrintContent | void> {
        const content = await generatePreviewContent(
            file,
            this.settings.printTitle,
            this.app,
            this.settings.printFrontmatter
        );

        if (!content) {
            return;
        }

        this.setPrintSourcePath(content, file);

        return {
            content,
            bodyClasses: this.applyNotePrintClasses(content, file)
        };
    }

    private async buildFolderPrintContent(files: TFile[]): Promise<HTMLElement> {
        const folderContent = createDiv();

        for (const file of files) {
            const printableContent = await this.resolvePrintableMarkdownFileContent(file);
            if (!printableContent) {
                continue;
            }

            if (!this.settings.combineFolderNotes) {
                printableContent.content.addClass('obsidian-print-page-break');
            }

            folderContent.append(printableContent.content);
        }

        return folderContent;
    }

    private async openPrintableContent(
        title: string,
        printableContent: ResolvedPrintContent
    ): Promise<void> {
        const cssString = await generatePrintStyles(this.app, this.manifest, this.settings);

        if (printableContent.bodyClasses) {
            await openPrintModal(
                this.app,
                title,
                printableContent.content,
                this.settings,
                cssString,
                printableContent.bodyClasses
            );
            return;
        }

        await openPrintModal(this.app, title, printableContent.content, this.settings, cssString);
    }

    private applyNotePrintClasses(content: HTMLElement, file?: TFile | null): string[] {
        const noteCssClasses = this.getNotePrintClasses(file);

        if (noteCssClasses.length > 0) {
            content.classList.add(...noteCssClasses);
        }

        return noteCssClasses;
    }

    private setPrintSourcePath(content: HTMLElement, file?: TFile | null): void {
        if (!file) {
            return;
        }

        const noteContent = content.matches('.obsidian-print-note')
            ? content
            : content.querySelector<HTMLElement>('.obsidian-print-note');

        noteContent?.setAttribute('data-obsidian-print-source-path', file.path);
    }

    private getNotePrintClasses(file?: TFile | null): string[] {
        if (!this.settings.inheritNoteCssClasses || !file) {
            return [];
        }

        return getNoteCssClasses(this.app, file);
    }

    private getPrintableNonMarkdownViewContent(file: TFile): HTMLElement | void {
        const activeView = this.getActiveFileView();

        if (!activeView || activeView.file !== file) {
            new Notice('Open the file first to print its rendered view.');
            return;
        }

        const content = generateViewContent(activeView, {
            title: this.settings.printTitle ? file.basename : undefined
        });

        if (content) {
            this.setPrintSourcePath(content, file);
        }

        return content;
    }

    private getActiveFileView(): ActiveFileViewLike | null {
        const workspaceWithActiveFileView = this.app.workspace as typeof this.app.workspace & {
            getActiveFileView?: () => ActiveFileViewLike | null;
        };
        const activeFileView = workspaceWithActiveFileView.getActiveFileView?.();
        if (activeFileView) {
            return activeFileView as ActiveFileViewLike;
        }

        const activeLeaf = (this.app.workspace as unknown as { activeLeaf?: { view?: ActiveFileViewLike } }).activeLeaf;
        return activeLeaf?.view ?? null;
    }

    private getSortedMarkdownFiles(folder: TFolder): TFile[] {
        return folder.children
            .filter((file): file is TFile => file instanceof TFile && file.extension === 'md')
            .sort((left, right) => this.compareFolderPrintOrder(folder, left, right));
    }

    private compareFolderPrintOrder(folder: TFolder, left: TFile, right: TFile): number {
        const leftIsFolderNote = this.isFolderNote(folder, left);
        const rightIsFolderNote = this.isFolderNote(folder, right);

        if (leftIsFolderNote !== rightIsFolderNote) {
            return leftIsFolderNote ? -1 : 1;
        }

        const titleComparison = folderPrintOrderCollator.compare(left.basename, right.basename);
        if (titleComparison !== 0) {
            return titleComparison;
        }

        return folderPrintOrderCollator.compare(left.path, right.path);
    }

    private isFolderNote(folder: TFolder, file: TFile): boolean {
        return folderPrintOrderCollator.compare(file.basename, folder.name) === 0;
    }
}
