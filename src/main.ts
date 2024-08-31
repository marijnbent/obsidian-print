import { Plugin, PluginSettingTab, App, MarkdownView, Notice, TFile } from 'obsidian';
import { PrintSettingTab } from './settings';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { openPrintModal } from './utils/printModal';
import { join } from 'path';
import { generatePreviewContent } from './utils/generatePreviewContent';

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        
        this.addCommand({
            id: 'print-note',
            name: 'Current Note',
            callback: () => this.printNote(),
        });

        this.addSettingTab(new PrintSettingTab(this.app, this));

        this.addRibbonIcon('printer', 'Print Note', (evt: MouseEvent) => {
            this.printNote();
        });
    }

    async printNote() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!activeView) {
            new Notice('No active note to print.');
            return;
        }

        let content: HTMLElement | null = null;
        const currentMode = activeView.getMode();

        if (currentMode === 'source') {
            content = await generatePreviewContent(this.app, activeView);
        } else if (currentMode === 'preview') {
            content = activeView.contentEl.querySelector('.markdown-reading-view');
        }

        if (!content) {
            new Notice('Failed to retrieve note content.');
            return;
        }

        const printContent = content.cloneNode(true) as HTMLElement;
        const titleElement = printContent.querySelector('.inline-title');

        if (!this.settings.printTitle && titleElement) {
            titleElement.remove();
        }

        /**
         * Generating the full path to styles.css and the optional print.css snippet.
         */
        const vaultPath = (this.app.vault.adapter as any).getBasePath();
        
        const pluginPath = this.manifest.dir ?? '';
        const cssPath = join(pluginPath, 'styles.css');
        const pluginStylePath = join(vaultPath, cssPath);

        const snippetsPath = join(vaultPath, this.app.vault.configDir, 'snippets');
        const userStylePath = join(snippetsPath, 'print.css');

        await openPrintModal(printContent.innerHTML, this.settings, pluginStylePath, userStylePath);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}