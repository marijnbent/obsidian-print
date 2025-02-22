import { MarkdownRenderer, TFile, Component, Notice, App } from 'obsidian';

/**
 * Returns the rendered markdown content from either a TFile or a string.
 * 
 * @param input - Either a TFile object or a markdown string to render
 * @param withTitle - Whether to include the title in the rendered output
 * @param app - Obsidian App instance needed for rendering
 * @returns Promise<HTMLElement|void> - The rendered content as an HTML element
 */
export async function generatePreviewContent(
    input: TFile | string,
    withTitle: boolean,
    app: App
): Promise<HTMLElement|void> {
    try {
        // Créer le conteneur uniquement si on a du contenu à y mettre
        const content = createDiv('obsidian-print-note');

        // Handle title if requested
        if (withTitle && input instanceof TFile) {
            const titleEl = content.createEl('h1');
            titleEl.textContent = input.basename;
            titleEl.addClass('obsidian-print-title');
        }

        // Get the markdown content
        const markdownContent = input instanceof TFile 
            ? await app.vault.cachedRead(input)
            : input;

        // Render directly into the container
        await MarkdownRenderer.render(
            app,
            markdownContent,
            content,
            input instanceof TFile ? input.path : '',
            new Component()
        );

        return content;

    } catch (error) {
        new Notice('Failed to generate preview content.');
        console.error('Preview generation error:', error);
        return;
    }
}