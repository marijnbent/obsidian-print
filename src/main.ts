import { Plugin, PluginSettingTab, App, MarkdownView, Notice } from 'obsidian';
import { PrintSettingTab } from './settings';
import { PrintPluginSettings, DEFAULT_SETTINGS } from './types';
import { openPrintModal } from './printModal';

export default class PrintPlugin extends Plugin {
    settings: PrintPluginSettings;

    async onload() {

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        
        this.addCommand({
            id: 'print-note',
            name: 'Print Current Note',
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

        if (activeView.getMode() !== 'preview') {
            new Notice('Please open the reading view first.');
            return;
        }

        const content = activeView.contentEl.querySelector('.markdown-reading-view');
        if (!content) {
            new Notice('Failed to retrieve note content.');
            return;
        }

        const printContent = content.cloneNode(true) as HTMLElement;
        const titleElement = printContent.querySelector('.inline-title');

        if (!this.settings.printTitle && titleElement) {
            titleElement.remove();
        }

        await openPrintModal(printContent.innerHTML, this.settings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}