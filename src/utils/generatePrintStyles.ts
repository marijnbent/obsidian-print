import { App, FileSystemAdapter, Notice, PluginManifest } from "obsidian";
import { PrintPluginSettings } from "src/types";

/**
 * Retrieves styles.css from plugin and the optional print.css snippet. 
 * Add font size styles from settings and return a css string.
 * 
 * @param app 
 * @param manifest 
 * @param settings 
 * @returns 
 */
export async function generatePrintStyles(app: App, manifest: PluginManifest, settings: PrintPluginSettings): Promise<string> {
    const adapter = app.vault.adapter;

    let pluginStyle = '';
    let userStyle = '';

    if (manifest.dir) {
        const cssPath = `${manifest.dir}/styles.css`;
        try {
            pluginStyle = await adapter.read(cssPath);
        } catch (error) {
            new Notice('Default styling could not be located.');
        }
    } else {
        new Notice('Could not find the plugin path. No default print styles will be added.');
    }

    // Read user styles (optional)
    // TODO: Only include if the print.css is activated.
    const userStylePath = `${app.vault.configDir}/snippets/print.css`;
    try {
        userStyle = await adapter.read(userStylePath);
    } catch { }

    return `
        body { font-size: ${settings.fontSize}; }
        h1 { font-size: ${settings.h1Size}; }
        h2 { font-size: ${settings.h2Size}; }
        h3 { font-size: ${settings.h3Size}; }
        h4 { font-size: ${settings.h4Size}; }
        h5 { font-size: ${settings.h5Size}; }
        h6 { font-size: ${settings.h6Size}; }
        hr { page-break-before: ${settings.hrPageBreaks ? 'always' : 'auto'}; border-width: ${settings.hrPageBreaks ? '0' : 'revert-layer'}; }
        ${pluginStyle}
        ${userStyle}
    `;
}
