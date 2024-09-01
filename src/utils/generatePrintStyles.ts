import { App, FileSystemAdapter, Notice, PluginManifest } from "obsidian";
import { join } from 'path';
import { readFileSync } from 'fs';
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
    const adapter = app.vault.adapter as FileSystemAdapter;
    const vaultPath = adapter.getBasePath();

    let pluginStylePath = null;
    let userStylePath = null;

    const pluginPath = manifest.dir;

    if (pluginPath) {
        const cssPath = join(pluginPath, 'styles.css');
        pluginStylePath = join(vaultPath, cssPath);
    } else {
        new Notice('Could not find the plugin path. No default print styles are be added.');
        return '';
    }

    /**
     * TODO: Only include if the print.css is activated.
     */
    const snippetsPath = join(vaultPath, app.vault.configDir, 'snippets');
    userStylePath = join(snippetsPath, 'print.css');

    let pluginStyle;
    let userStyle;

    try {
        pluginStyle = readFileSync(pluginStylePath, 'utf8')
    } catch {
        new Notice('Default styling could not be located.');
    }

    // This style is optional, so no notice is shown if not found.
    try {
        userStyle = readFileSync(userStylePath, 'utf8')
    } catch {}

    return `
        body { 
            font-size: ${settings.fontSize};
        }
        h1, .inline-title { font-size: ${settings.h1Size}; }
        h2 { font-size: ${settings.h2Size}; }
        h3 { font-size: ${settings.h3Size}; }
        h4 { font-size: ${settings.h4Size}; }
        h5 { font-size: ${settings.h5Size}; }
        h6 { font-size: ${settings.h6Size}; }
        ${pluginStyle}
        ${userStyle}
    `;
}