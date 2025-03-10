import { MarkdownRenderer, TFile, Component, Notice, App, MarkdownView } from 'obsidian';
import { PrintPluginSettings } from './types';

/**
 * Converts markdown content to HTML for printing
 * @param isSelection - Whether to print the selected text only (default: false)
 * @param file - TFile to print from (optional)
 */
export async function contentToHTML(
    app: App,
    settings: PrintPluginSettings,
    isSelection: boolean = false,
    file?: TFile
): Promise<HTMLElement | null> {
    if (isSelection) {
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note.');
            return null;
        }

        const selection = activeView.editor.getSelection();
        if (!selection) {
            new Notice('No text selected.');
            return null;
        }

        return await generateHTML(app, settings, selection);
    } else {
        if (!file || file === app.workspace.getActiveFile()) {
            const activeView = app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                await activeView.save();
            }
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                file = activeFile;
            }
        }

        if (!file) {
            new Notice('No note to print.');
            return null;
        }

        return await generateHTML(app, settings, file);
    }
}

/** 
 * Modify generateHTML to include isAdvanced parameter
 */
export async function generateHTML(
    app: App,
    settings: PrintPluginSettings,
    input: TFile | string
): Promise<HTMLElement | null> {
    const content = createDiv('markdown-preview-view');

    try {
        const contentSizer = content.createDiv('markdown-preview-sizer');

        // Add metadata if enabled
        if (settings.showMetadata) {
            addMetadataToContent(input, contentSizer, app);
        }

        // Handle title if requested
        if (settings.printTitle && input instanceof TFile) {
            const titleEl = contentSizer.createEl('h1');
            titleEl.textContent = input.basename;
            titleEl.addClass('inline-title');
        }

        // Get the markdown content based on input type
        let markdownContent: string;
        let sourcePath: string = '';

        if (input instanceof TFile) {
            markdownContent = await app.vault.cachedRead(input);
            sourcePath = input.path;
        } else {
            markdownContent = input;
        }

        // Render the markdown content
        await MarkdownRenderer.render(
            app,
            markdownContent,
            content,
            sourcePath,
            new Component()
        );

        return content;

    } catch (error) {
        new Notice('Failed to generate preview content.');
        console.error('Preview generation error:', error);
        return null;
    }
}


/**
 * Gets metadata from any input type
 */
function getMetadataFromInput(input: TFile | string, app: App): { metadata: any, file: TFile | null } {
    let file: TFile | null = null;
    let metadata = null;

    if (input instanceof TFile) {
        file = input;
    } else {
        file = app.workspace.getActiveFile();
    }

    if (file) {
        metadata = app.metadataCache.getFileCache(file)?.frontmatter;
    }

    return { metadata, file };
}

/**
 * Adds metadata content to the container
 */
function addMetadataToContent(input: TFile | string, container: HTMLElement, app: App) {
    const { metadata } = getMetadataFromInput(input, app);

    if (metadata && Object.keys(metadata).length > 0) {
        const metadataContainer = container.createDiv('custom-metadata-container');
        const metadataContent = metadataContainer.createDiv('custom-metadata-content');
        Object.entries(metadata).forEach(([key, value]) => {
            const line = metadataContent.createDiv();
            const displayValue = Array.isArray(value)
                ? value.join(', ')
                : typeof value === 'object' && value !== null
                    ? JSON.stringify(value)
                    : String(value);
            line.setText(`${key}: ${displayValue}`);
        });
    }
}

/**
 * Basic print: Returns the rendered markdown content from either a TFile or a string. 
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
): Promise<HTMLElement | void> {
    const content = createDiv();

    try {
        // Handle title if requested
        if (withTitle && input instanceof TFile) {
            const titleEl = content.createEl('h1');
            titleEl.textContent = input.basename;
        }

        // Get the markdown content based on input type
        let markdownContent: string;
        let sourcePath: string = '';

        if (input instanceof TFile) {
            markdownContent = await app.vault.cachedRead(input);
            sourcePath = input.path;
        } else {
            markdownContent = input;
        }

        // Render the markdown content
        await MarkdownRenderer.render(
            app,
            markdownContent,
            content,
            sourcePath,
            new Component()
        );

        content.addClass('obsidian-print-note');
        return content;

    } catch (error) {
        new Notice('Failed to generate preview content.');
        console.error('Preview generation error:', error);
        return;
    }
}