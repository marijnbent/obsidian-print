import { PrintPluginSettings } from '../types';
import { Printd } from 'printd'

/**
 * Generate the HTML with the content to be printed. Use Printd to print.
 * 
 * @param content 
 * @param settings 
 * @param cssString 
 * @returns 
 */
export async function openPrintModal(content: HTMLElement, settings: PrintPluginSettings, cssString: string): Promise<void> {
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
}