import { MarkdownRenderer, TFile, Component, Notice } from 'obsidian';

/**
 * Returns the rendered markdown content of an TFile.
 * 
 * @param file 
 * @param withTitle 
 * @returns 
 */
export async function generatePreviewContent(file: TFile, withTitle: boolean): Promise<HTMLElement> {
    return new Promise(async (resolve) => {

        const content = createDiv();

        if (withTitle) {
            const titleEl = content.createEl('h1');
            titleEl.textContent = file.basename || ''
        }

        const fileContent = await this.app.vault.read(file);
        await MarkdownRenderer.render(this.app, fileContent, content, file.path, new Component);

        if (!content) {
            new Notice('Failed to retrieve note content.');
            return;
        }

        content.addClass('obsidian-print-note');

        resolve(content);
    });
}