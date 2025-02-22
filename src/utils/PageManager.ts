import { App } from 'obsidian';
import { A4_DIMENSIONS } from './constants';
import { getHeadersCSS } from './importThemeHeaders';
import { generatePrintStyles } from './generatePrintStyles';
import { PrintPluginSettings } from '../types';

export class PageManager {
    private static readonly PAGE_MARGIN = '20mm';
    private static readonly PAGE_GAP = '20mm';

    static async createPage(app: App, manifest: any, settings: PrintPluginSettings): Promise<HTMLElement> {
        const page = document.createElement('div');
        page.className = 'preview-page obsidian-print';
        page.style.width = '210mm';
        page.style.minHeight = '297mm';
        page.style.backgroundColor = 'white';
        page.style.margin = `${this.PAGE_GAP} auto`;
        page.style.padding = this.PAGE_MARGIN;
        page.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        page.style.breakInside = 'avoid';
        page.style.breakAfter = 'page';

        // Ajouter les styles globaux
        const globalStyles = await generatePrintStyles(app, manifest, settings);
        const style = document.createElement('style');
        style.textContent = globalStyles;
        page.appendChild(style);

        return page;
    }

    static async applyStyles(page: HTMLElement, app: App): Promise<void> {
        // Appliquer les styles des en-têtes
        const headers = page.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headerColors = getHeadersCSS(app);

        headers.forEach((header) => {
            const level = parseInt(header.tagName.substring(1));
            const color = headerColors.get(level);
            if (color) {
                (header as HTMLElement).style.color = color;
            }
        });

        // Styles pour les callouts
        const callouts = page.querySelectorAll('.callout');
        callouts.forEach(callout => {
            (callout as HTMLElement).style.border = '1px solid rgba(0, 0, 0, 0.2)';
            (callout as HTMLElement).style.borderRadius = '4px';
            (callout as HTMLElement).style.backgroundColor = '#ffffff';
            (callout as HTMLElement).style.boxShadow = '0 2px 2px 0 rgba(0, 0, 0, 0.12), 0 1px 5px 0 rgba(0, 0, 0, 0.1), 0 3px 1px -2px rgba(0, 0, 0, 0.2)';
        });
    }

    static isElementFitsInPage(element: HTMLElement, page: HTMLElement): boolean {
        const pageHeight = page.clientHeight - (parseFloat(this.PAGE_MARGIN) * 2);
        return (page.scrollHeight + element.scrollHeight) <= pageHeight;
    }
}