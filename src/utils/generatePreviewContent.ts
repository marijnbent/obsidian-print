import { MarkdownView, App, MarkdownRenderer, TFile } from 'obsidian';

export async function generatePreviewContent(app: App, view: MarkdownView): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
        const tempPreviewEl = createDiv();

        const titleEl = tempPreviewEl.createEl('div', { cls: 'inline-title' });
        titleEl.textContent = view.file?.basename || ''

        /**
         * I tried `app.vault.read(view.file!)`, but the content is not always up-to-date.
         */
        const content = view.editor.getValue();

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
}