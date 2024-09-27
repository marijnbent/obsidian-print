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
    titleElement.textContent = 'Print note';
    headElement.appendChild(titleElement);

    if (settings.debugMode) {
        const styleElement = document.createElement('style');
        styleElement.textContent = cssString;
        headElement.appendChild(styleElement);
    }

    htmlElement.appendChild(headElement);

    const bodyElement = document.createElement('body');
    bodyElement.className = 'obsidian-print';
    bodyElement.appendChild(content);

    htmlElement.appendChild(bodyElement);

    /**
     * This uses Electron to open a window with HTML content in order to inspect it when debug mode is turned on.
     */
    if (settings.debugMode) {
        const { remote } = (window as any).require("electron");

        let printWindow = new remote.BrowserWindow({
            width: 800,
            height: 600,
            show: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        /**
         * This uses outerHTML solely when debug mode is turned on to make it easier to inspect the generated HTML
         * and CSS stylying. For debuggers: Press `cmd/ctrl + p` in the DevTools and search for 'Emulate CSS Print media type'
         */
        const debugContent = htmlElement.outerHTML;
        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(debugContent)}`);

        printWindow.webContents.on('did-finish-load', () => {
            printWindow.webContents.openDevTools();
        });
    }

    const d = new Printd()
    d.print(htmlElement, [cssString])
}
