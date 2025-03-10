import { App, PluginManifest, Notice, MarkdownView } from 'obsidian';
import { PrintPluginSettings } from 'src/types';
import { generatePrintStyles } from '../getStyles/generatePrintStyles';
import { PrintManager } from '../browserPrintManager';

/**
 * Prints the given content using the default browser
 */
export async function printContent(
    content: HTMLElement | null,
    app: App,
    manifest: PluginManifest,
    settings: PrintPluginSettings
) {
    if (!content) {
        new Notice('No content to print');
        return;
    }

    try {
        // Get active file path
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        const filePath = activeView?.file?.path || "Untitled";

        // generate styles  
        const globalCss = await generatePrintStyles(app, manifest, settings);

        const printer = new PrintManager();
        // Print the final content
        await printer.browserPrint(printer.createPrintableHtml(content, globalCss, false, filePath));

    } catch (error) {
        console.error('Print error:', error);
        new Notice('Failed to print content');
    }
}