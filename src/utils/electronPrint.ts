import { App, MarkdownView, Notice, Modal, MarkdownRenderer, Component, PluginManifest } from 'obsidian';
import { openPrintModal } from './printModal';
import html2canvas from 'html2canvas';
import { generatePrintStyles } from './generatePrintStyles';
import { PrintPluginSettings } from '../types';
// TODO: Create and implement PrintStyleManager class
import { getHeadersCSS } from './importThemeHeaders';
import { PageManager } from './PageManager';

class PrintStyleManager {
    async prepareForPrint(element: HTMLElement): Promise<HTMLElement> {
        const printContent = element.cloneNode(true) as HTMLElement;
        printContent.classList.add('obsidian-print');

        // Appliquer les styles spécifiques aux en-têtes
        const headers = printContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headerColors = getHeadersCSS(app);

        headers.forEach((header) => {
            const level = parseInt(header.tagName.substring(1));
            const color = headerColors.get(level);
            if (color) {
                (header as HTMLElement).style.color = color;
            }
        });

        return printContent;
    }
}

class PrintPreviewModal extends Modal {
    private content: HTMLElement;
    private editContent: HTMLElement;
    private isPreviewMode: boolean = false;
    private wasInDarkMode: boolean = false;
    private manifest: PluginManifest;
    private settings: PrintPluginSettings;
    constructor(
        app: App,
        manifest: PluginManifest,
        settings: PrintPluginSettings,
        previewContent: HTMLElement,
        editContent: HTMLElement
    ) {
        super(app);
        this.manifest = manifest;
        this.settings = settings;
        this.content = previewContent;
        this.editContent = editContent;
    }
    async onOpen() {
        this.wasInDarkMode = document.body.classList.contains('theme-dark');
        if (this.wasInDarkMode) {
            document.body.classList.replace('theme-dark', 'theme-light');
        }

        this.setupModalContainer();

        // Ajouter les styles globaux avant de créer le contenu
        const globalStyles = await generatePrintStyles(
            this.app,
            this.manifest,
            this.settings
        );
        this.addGlobalPrintStyles(globalStyles);

        this.createControls();
        this.createPreviewContent();
    }
    private addGlobalPrintStyles(globalStyles: string) {
        document.head.insertAdjacentHTML('beforeend', `
            <style id="print-modal-styles">
                ${globalStyles}
                
                .preview-page {
                    background-color: white;
                    position: relative;
                    box-sizing: border-box;
                    break-inside: avoid;
                    break-after: page;
                    border: 1px solid #ddd;
                    margin: 20px auto;
                    padding: 20mm;
                    width: 210mm;
                    min-height: 297mm;
                }
                
                .print-preview-content {
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
    
                .print-preview-modal {
                    max-width: 100%;
                    width: calc(210mm + 40px);
                    margin: 0 auto;
                }
    
                /* Shared styles for both preview and print */
                .callout {
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                    padding: 0;
                    overflow: hidden;
                    margin: 1em 0;
                    background-color: #ffffff;
                    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.12),
                        0 1px 5px 0 rgba(0, 0, 0, 0.1),
                        0 3px 1px -2px rgba(0, 0, 0, 0.2);
                }
    
                .callout-title {
                    padding: 0.5em;
                    display: flex;
                    gap: 8px;
                    font-size: inherit;
                    color: black;
                    line-height: 1.3em;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                }
    
                .callout-content {
                    padding: 0.25em 1em;
                }
    
                .task-list-item {
                    list-style: none !important;
                    padding-left: 2em !important;
                    position: relative !important;
                }
    
                .task-list-item input[type="checkbox"] {
                    position: absolute !important;
                    left: 0 !important;
                    margin: 0.3em 0 0 0 !important;
                }
    
                .contains-task-list {
                    padding-left: 0 !important;
                    list-style: none !important;
                }
    
                img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 1em auto;
                    page-break-inside: avoid;
                }
    
                @media print {
                    .preview-page {
                        margin: 0;
                        padding: 0;
                        border: none;
                        break-after: page;
                    }
                }
            </style>
        `);
    }
    private createPreviewContent() {
        const previewContent = this.contentEl.createDiv('print-preview-content');
        previewContent.addClass('obsidian-print');
        this.updateContent();
    }
    onClose() {
        const styles = document.getElementById('print-modal-styles');
        if (styles) styles.remove();

        if (this.wasInDarkMode) {
            document.body.classList.replace('theme-light', 'theme-dark');
        }
    }
    private setupModalContainer() {
        this.contentEl.empty();
        this.modalEl.addClass('print-preview-container');
        this.contentEl.addClass('print-preview-modal');
    }
    private async contentToPNG(element: HTMLElement): Promise<string> {
        const A4_WIDTH = 795; // Largeur du contenu
        const A4_HEIGHT = 1122; // Hauteur du contenu pour A4 à 96 DPI (environ)
    
        const tempContainer = document.createElement('div');
        tempContainer.style.width = `${A4_WIDTH}px`;
        tempContainer.style.height = `${A4_HEIGHT}px`; // Assurez-vous que la hauteur est définie
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.margin = '0'; // Supprimer les marges
        tempContainer.style.padding = '0'; // Supprimer le padding
    
        const wrapper = document.createElement('div');
        wrapper.className = 'obsidian-print';
        wrapper.style.margin = '0'; // Supprimer les marges
        wrapper.style.padding = '0'; // Supprimer le padding
    
        const styleManager = new PrintStyleManager();
        const styledContent = await styleManager.prepareForPrint(element);
        wrapper.appendChild(styledContent);
    
        const styleElement = document.createElement('style');
        styleElement.textContent = await generatePrintStyles(
            this.app,
            this.manifest,
            this.settings
        );
        tempContainer.appendChild(styleElement);
        tempContainer.appendChild(wrapper);
    
        document.body.appendChild(tempContainer);
    
        try {
            const canvas = await html2canvas(tempContainer, {
                width: A4_WIDTH,
                height: A4_HEIGHT,
                scale: 2,
                backgroundColor: '#ffffff',
                windowWidth: A4_WIDTH,
                windowHeight: A4_HEIGHT,
                logging: true,
                useCORS: true,
                allowTaint: true
            });
    
            return canvas.toDataURL('image/png');
        } finally {
            document.body.removeChild(tempContainer);
        }
    }
    private async createPagesPreview(element: HTMLElement): Promise<HTMLElement> {
        const container = createDiv();
        container.addClass('markdown-preview-view');
        container.style.margin = '0';
        container.style.padding = '0';
    
        const contentContainer = container.createDiv('markdown-preview-sizer');
        contentContainer.style.margin = '0';
        contentContainer.style.padding = '0';
    
        // Parcourir tous les éléments du contenu
        const elements = Array.from(element.children);
        let currentPage: HTMLElement | null = null;
    
        for (const el of elements) {
            const elementClone = el.cloneNode(true) as HTMLElement;
    
            // Créer une nouvelle page seulement si nécessaire
            if (!currentPage || !PageManager.isElementFitsInPage(elementClone, currentPage)) {
                currentPage = await PageManager.createPage(this.app, this.manifest, this.settings);
                await PageManager.applyStyles(currentPage, this.app);
                contentContainer.appendChild(currentPage);
            }
    
            currentPage.appendChild(elementClone);
        }
    
        return container;
    }
    private createControls() {
        const controls = this.contentEl.createDiv('print-preview-controls');

        const printBtn = controls.createEl('button', { text: 'Print' });
        printBtn.onclick = async () => {
            try {
                const pagesContent = await this.createPagesPreview(this.isPreviewMode ? this.content : this.editContent);
                await openPrintModal(pagesContent, this.getPrintCss());
            } catch (error) {
                new Notice('Failed to prepare document for printing');
                console.error(error);
            }
        };

        const closeButton = controls.createEl('button', { text: 'Close' });
        closeButton.onclick = () => this.close();
    }

    private getPrintCss(): string {
        return `
            @media print {
                @page { 
                    margin-top: 20mm;
                    margin-bottom: 20mm;
                }
                @page :first {
                    margin-top: 5mm;
                }
                body { 
                    margin: 0;
                }
                .markdown-preview-view {
                    height: auto !important;
                    margin: 0 !important;
                    max-width: none !important; // Empêcher la limitation de largeur d'Obsidian
                }
                .obsidian-print-page-break {
                    page-break-after: always;
                    margin: 0;
                }
                img {
                    display: block;
                    max-width: 100%;
                    margin: 0;
                    page-break-inside: avoid;
                }
                .contains-task-list {
                    padding-left: 2em !important;
                }
                .task-list-item {
                    position: relative !important;
                }
                .task-list-item input[type="checkbox"] {
                    position: absolute !important;
                    left: -1.5em !important;
                    top: 0.3em !important;
                }
                .callout {
                    border-radius: 4px;
                    padding: 0;
                    overflow: hidden;
                    margin: 1em 0;
                    background-color: #ffffff;
                    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.12),
                        0 1px 5px 0 rgba(0, 0, 0, 0.1),
                        0 3px 1px -2px rgba(0, 0, 0, 0.2);
                }
                .callout-title {
                    padding: 0.5em;
                    display: flex;
                    gap: 8px;
                    font-size: inherit;
                    color: black;
                    line-height: 1.3em;
                }
                .callout-content {
                    padding: 0.25em 1em;
                }
            }
        `;
    }
    private updateContent() {
        const container = this.contentEl.querySelector('.print-preview-content');
        if (!container) return;
        container.empty();
        container.appendChild(this.isPreviewMode ? this.content.cloneNode(true) : this.editContent);
    }
}

export class ElectronStylePrinter {
    constructor(
        private app: App,
        private manifest: PluginManifest,
        private settings: PrintPluginSettings
    ) { }

    async print() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active view to print');
            return;
        }

        try {
            const [previewContent, editContent] = await Promise.all([
                this.getPreviewContent(),
                this.getEditContent()
            ]);

            if (!previewContent || !editContent) {
                throw new Error('Failed to get content');
            }

            new PrintPreviewModal(
                this.app,
                this.manifest,
                this.settings,
                previewContent,
                editContent
            ).open();
        } catch (error) {
            new Notice('Print error');
            console.error(error);
        }
    }

    private async getPreviewContent(): Promise<HTMLElement | null> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return null;

        const wasInEditMode = activeView.getMode() === 'source';
        if (wasInEditMode) {
            await activeView.setState({ mode: 'preview' }, { history: false });
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const previewContent = activeView.contentEl.querySelector('.markdown-preview-view');
        if (!previewContent) return null;

        // Create container with proper classes
        const container = createDiv();
        container.addClass('markdown-preview-view');
        const contentSizer = container.createDiv('markdown-preview-sizer');

        // Add title if enabled in settings
        if (this.settings.printTitle && activeView.file) {
            const titleEl = contentSizer.createEl('h1');
            titleEl.textContent = activeView.file.basename;
            titleEl.addClass('obsidian-print-title');
        }

        // Clone the content
        const content = previewContent.querySelector('.markdown-preview-sizer');
        if (content) {
            Array.from(content.children).forEach(child => {
                contentSizer.appendChild(child.cloneNode(true));
            });
        }

        if (wasInEditMode) {
            await activeView.setState({ mode: 'source' }, { history: false });
        }

        return container;
    }
    private async getEditContent(): Promise<HTMLElement | null> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return null;

        const container = createDiv();
        container.addClass('markdown-preview-view');
        const contentSizer = container.createDiv('markdown-preview-sizer');

        // Add title if enabled in settings
        if (this.settings.printTitle && activeView.file) {
            const titleEl = contentSizer.createEl('h1');
            titleEl.textContent = activeView.file.basename;
            titleEl.addClass('obsidian-print-title');
        }

        await MarkdownRenderer.render(
            this.app,
            activeView.editor.getValue(),
            contentSizer,
            activeView.file?.path || '',
            new Component()
        );

        return container;
    }
}