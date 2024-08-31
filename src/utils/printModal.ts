import { PrintPluginSettings } from '../types';
import { readFileSync } from 'fs';

export async function openPrintModal(content: HTMLElement, settings: PrintPluginSettings, pluginStylePath: string, userStylePath: string): Promise<void> {
    return new Promise((resolve) => {
        const { remote } = (window as any).require("electron");

        let printWindow = new remote.BrowserWindow({
            width: 800,
            height: 600,
            show: settings.debugMode,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        /**
         * The CSS is loaded from the two paths. Both are optional. 
         */
        let pluginStyle; 
        let userStyle;

        try {
            pluginStyle = readFileSync(pluginStylePath, 'utf8') ?? ''
        } catch {}

        try {
            userStyle = readFileSync(userStylePath, 'utf8') ?? ''
        } catch {}

        /**
         * We use innerHTML to include the note content in the print window, as we need to encode it
         * to use the Electron BrowserWindow.loadURL function.
         */
        const noteContent = content.innerHTML;
        const htmlContent = `
            <html>
                <head>
                    <title>Print Note</title>
                    <style>
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
                    </style>
                </head>
                <body class="obsidian-print">${noteContent}</body>
            </html>
        `;

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        printWindow.webContents.on('did-finish-load', () => {
            if (settings.debugMode) {
                printWindow.webContents.openDevTools();
            }

            printWindow.webContents.print({
                silent: settings.directPrint,
                printBackground: true
            }, (success: boolean, failureReason: string) => {
                if (!settings.debugMode) {
                    printWindow.close();
                }

                if (settings.debugMode) {
                    console.log(success, failureReason);
                }

                resolve();
            });
        });
    });
}