import dedent from 'dedent';
import { PrintPluginSettings } from '../types';
import { Printd } from 'printd';

/**
 * Opens a modal window with print preview and controls
 * @param content The HTML content to print
 * @param settings Plugin settings
 * @param cssString CSS styles to apply
 */
export async function openPrintModal(content: HTMLElement, cssString: string) {
    const styleManager = new PrintStyleManager();
    const printContent = await styleManager.prepareForPrint(content);
    
    // Simplification de la structure
    const container = document.createElement('div');
    container.className = 'obsidian-print';
    container.appendChild(printContent);
    
    const preview = new PrintPreview();
    preview.createPreview(container, cssString, {
        width: '90%',
        height: '90%',
        scale: 1
    });
}

interface PrintPreviewOptions {
    width?: string;
    height?: string;
    scale?: number;
}

/**
 * Handles the print preview window and printing functionality
 */
class PrintPreview {
    private previewWindow: HTMLDivElement | null = null;
    private printd: Printd;
    private wasInDarkMode: boolean = false;

    constructor() {
        this.printd = new Printd();
    }

    createPreview(element: HTMLElement, globalCss: string, options: PrintPreviewOptions = {}) {
        this.wasInDarkMode = document.body.classList.contains('theme-dark');
        if (this.wasInDarkMode) {
            document.body.classList.replace('theme-dark', 'theme-light');
        }

        this.previewWindow = document.createElement('div');
        this.previewWindow.className = 'print-preview-window';

        const containerStyles = dedent`
            .print-preview-window {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                padding: 0;
                border: none;
                box-shadow: none;
                z-index: 9999;
                overflow-x: hidden;
                overflow-y: auto;
                width: 100%;
                height: ${options.height || '100%'};
            }
            .print-preview-controls {
                position: sticky;
                top: 0;
                width: 100%;
                padding: 10px;
                background-color:rgba(66, 67, 65, 0.12);
                border-bottom: 1px solid rgb(28, 27, 26);
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                z-index: 1;
            }
            .print-preview-content {
                margin: 0;
                padding: 20px;
                background-color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .print-preview-page {
                margin: 0;
                padding: 0;
                width: auto;
                background: white;
            }
            .print-preview-page-content {
                margin: 0;
                padding: 0;
                width: auto;
                background: white;
            }
        `;

        const style = document.createElement('style');
        style.textContent = globalCss + "\n" + containerStyles;

        const controls = document.createElement('div');
        controls.className = 'print-preview-controls';

        const printButton = document.createElement('button');
        printButton.textContent = 'Print';
        printButton.onclick = () => {
            this.printd.print(element, [globalCss]);
            this.close();
        };

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.onclick = () => this.close();

        controls.append(printButton, closeButton);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'print-preview-content';

        // Create a self-sizing page with 20px padding
        const page = document.createElement('div');
        page.className = 'print-preview-page';
        const pageContent = document.createElement('div');
        pageContent.className = 'print-preview-page-content';
        pageContent.appendChild(element.cloneNode(true));
        page.appendChild(pageContent);
        contentContainer.appendChild(page);

        this.previewWindow.append(style, controls, contentContainer);
        document.body.appendChild(this.previewWindow);

        if (options.scale) {
            contentContainer.style.transform = `scale(${options.scale})`;
            contentContainer.style.transformOrigin = 'top center';
        }
    }

    close() {
        if (this.wasInDarkMode) {
            document.body.classList.replace('theme-light', 'theme-dark');
        }
        this.previewWindow?.parentNode?.removeChild(this.previewWindow);
        this.previewWindow = null;
    }
}

/**
 * Manages the styling of content for printing
 */
export class PrintStyleManager {
    constructor() {}  // Suppression du paramètre settings

    /**
     * Prepares the content for printing by adding necessary print classes
     * @param content The HTML content to prepare
     * @returns The prepared content
     */
    async prepareForPrint(content: HTMLElement): Promise<HTMLElement> {
        // Copier directement le contenu sans créer de conteneur supplémentaire
        const printContent = content.cloneNode(true) as HTMLElement;
        
        // Nettoyer les éléments vides récursivement
        const cleanNode = (node: HTMLElement) => {
            const children = Array.from(node.children);
            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    if (child.children.length > 0) {
                        cleanNode(child);
                    }
                    // Supprimer si vide et pas une image
                    if (child.nodeName !== 'IMG' && !child.textContent?.trim()) {
                        child.remove();
                    }
                }
            });
        };
        
        cleanNode(printContent);
        printContent.classList.add('obsidian-print');
        return printContent;
    }
}
