import { PrintPluginSettings } from '../types';
import { readFileSync } from 'fs';
import { Printd } from 'printd'

export async function openPrintModal(content: HTMLElement, settings: PrintPluginSettings, pluginStylePath: string, userStylePath: string): Promise<void> {
    return new Promise((resolve) => {

        /**
         * The CSS is loaded from the two paths. Both are optional. 
         */
        let pluginStyle;
        let userStyle;

        try {
            pluginStyle = readFileSync(pluginStylePath, 'utf8') ?? ''
        } catch { }

        try {
            userStyle = readFileSync(userStylePath, 'utf8') ?? ''
        } catch { }

        const cssString = `
            body { 
                font-size: ${settings.fontSize};
            }
            h1, .inline-title { font-size: ${settings.h1Size}; }
            h2 { font-size: ${settings.h2Size}; }
            h3 { font-size: ${settings.h3Size}; }
            h4 { font-size: ${settings.h4Size}; }
            h5 { font-size: ${settings.h5Size}; }
            h6 { font-size: ${settings.h6Size}; }
            ${pluginStyle ?? ''}
            ${userStyle ?? ''}
        `;

        /**
         * Create the HTML
         */
        const htmlElement = document.createElement('html');
        const headElement = document.createElement('head');

        const titleElement = document.createElement('title');
        titleElement.textContent = 'Print Note';
        headElement.appendChild(titleElement);
        htmlElement.appendChild(headElement);

        const bodyElement = document.createElement('body');
        bodyElement.className = 'obsidian-print';
        bodyElement.appendChild(content);

        if (settings.debugMode) {
            console.log(content);
        }

        htmlElement.appendChild(bodyElement);

        const d = new Printd()
        d.print(htmlElement, [cssString])
    });
}