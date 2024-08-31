import { MarkdownView, App, MarkdownRenderer, TFile } from 'obsidian';

export async function generatePreviewContent(app: App, view: MarkdownView): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
        const tempPreviewEl = createDiv();

        const titleEl = tempPreviewEl.createEl('div', { cls: 'inline-title' });
        titleEl.textContent = view.file?.basename || ''

        app.vault.read(view.file!).then(content => {
            MarkdownRenderer.render(
                app,
                content,
                tempPreviewEl,
                view.file?.path || '',
                view
            ).then(() => {
                resolve(tempPreviewEl);
            })
        });
    });
}