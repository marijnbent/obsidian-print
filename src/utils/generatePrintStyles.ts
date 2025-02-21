import { App, Notice, PluginManifest } from "obsidian";
import { PrintPluginSettings } from "src/types";
import { CustomCSS } from "obsidian-typings";

/**
 * Generates CSS styles for printing, combining plugin styles, user snippets, and some styles settings
 */
export async function generatePrintStyles(
    app: App,
    manifest: PluginManifest,
    settings: PrintPluginSettings
): Promise<string> {
    const adapter = app.vault.adapter;

    // Read plugin stylesheet
    let pluginStyle = '';
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

    // Read user print stylesheet (optional)
    const userStyle =
        getPrintSnippet(app) && isPrintSnippetEnabled(app)
            ? getPrintSnippetValue(app) ?? ''
            : '';

    // Generate CSS for headings with sizes and colors from settings
    // title in reading mode
    const titleCSS = `.obsidian-print .obsidian-print-title { 
            font-size: ${settings.h1Size}; 
            color: ${settings.h1Color};
            text-align: center;
            margin-top: 16px;
            margin-bottom: 24px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }`;

    const headingsCSS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        .map((tag) => {
            const sizeKey = `${tag}Size` as keyof PrintPluginSettings;
            const colorKey = `${tag}Color` as keyof PrintPluginSettings;
            if (tag === 'h1') {
                return `.obsidian-print ${tag} { 
                    font-size: ${settings[sizeKey]}; 
                    color: ${settings[colorKey]};
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 8px;
                }`;
            }
            return `.obsidian-print ${tag} { font-size: ${settings[sizeKey]}; color: ${settings[colorKey]}; }`;
        })
        .join('\n');

    // Final combined CSS
    return `
        .obsidian-print { font-size: ${settings.fontSize}; }
        ${titleCSS}
        ${headingsCSS}
        ${settings.hrPageBreaks ? '.obsidian-print hr { page-break-before: always; border: none; }' : ''}
        ${pluginStyle}
        ${userStyle}
    `;
}

function getPrintSnippetValue(app: App): string | undefined {
    const printCssPath = ".obsidian/snippets/print.css";
    return app.customCss.csscache.get(printCssPath);
}

export function isPrintSnippetEnabled(app: App): boolean {
    return app.customCss.enabledSnippets.has("print");
}

export function getPrintSnippet(app: App): boolean {
    return app.customCss.snippets.contains("print");
}
