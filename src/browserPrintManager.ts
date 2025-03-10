import { Notice } from 'obsidian';
import { tmpdir } from 'os';
import path from 'path';
import { unlinkSync, writeFileSync } from 'fs';
import { exec } from 'child_process';

/**
 * Prints the given content using the default browser
 */
export class PrintManager {
    /**
     * Creates a printable HTML string from the given content and styles
     */
    public createPrintableHtml(content: HTMLElement, styles: string, isAdvanced: boolean = false, filePath?: string): string {
        const fileName = filePath || "Untitled";
        const title = isAdvanced ? "⚡" : "";
        const favicon = "🖨️";
        
        return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${title} ${fileName}</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${favicon}</text></svg>">
        <style>${styles}</style>
        <script>
            window.onload = function() {
                // browser console
                console.log("Content loaded, ready to print");
                // Small delay before printing to ensure everything is rendered
                setTimeout(function() {
                    window.print();
                }, 100);
            }
        </script>
    </head>
    <body>
        <div class="obsidian-print markdown-preview-view">
            ${content.outerHTML}
        </div>
    </body>
    </html>`;
    }

    /**
     * Opens the HTML content in a browser and triggers the print dialog
     * Creates a temporary file that is automatically deleted after 5 seconds
     */
    public async browserPrint(html: string) {
        try {
            const fileName = `obsidian-print-${Date.now()}.html`;
            const savePath = path.join(tmpdir(), fileName);

            writeFileSync(savePath, html);

            // Open the html file in the default browser
            const openCommand = process.platform === 'win32'
                ? `start "" "${savePath}"`
                : process.platform === 'darwin'
                    ? `open "${savePath}"`
                    : `xdg-open "${savePath}"`;

            exec(openCommand, (error: Error | null) => {
                if (error) {
                    console.error('Failed to open browser:', error);
                    new Notice('Failed to open print dialog' + error.message);
                } else {
                    setTimeout(() => {
                        try {
                            // Delete the temporary file
                            unlinkSync(savePath);
                        } catch (e) {
                            // Silently fail if unable to delete temp file
                        }
                    }, 5000);
                }
            });

        } catch (error) {
            new Notice('Failed to open print dialog');
        }
    }
}