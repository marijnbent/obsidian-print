import { App, Modal, Notice } from 'obsidian';
import {
    createPortablePrintDocument,
    showPortableImageWarning
} from './portablePrintDocument';
import { createIosPdfDocument } from './iosPdfDocument';

const FALLBACK_FILE_NAME = 'obsidian-print-ios-output.pdf';
const MAX_FALLBACK_FILE_CANDIDATES = 100;

/** Prepare a PDF, then share it from a fresh tap required by iOS. */
export async function openIosPrintDocument(
    app: App,
    title: string,
    content: HTMLElement,
    cssText: string,
    bodyClasses: string[] = [],
    includeAppClasses = true
): Promise<void> {
    const preparingNotice = new Notice('Preparing PDF…', 0);
    let failedImageCount = 0;
    let pdfData: ArrayBuffer;

    try {
        const portableDocument = await createPortablePrintDocument(
            app,
            title,
            content,
            cssText,
            bodyClasses,
            includeAppClasses
        );
        failedImageCount = portableDocument.failedImageCount;
        pdfData = await createIosPdfDocument(portableDocument.html);
    } catch (error) {
        console.error('Could not create the iOS print PDF:', error);
        new Notice('Could not create the printable PDF.');
        return;
    } finally {
        preparingNotice.hide();
    }

    const file = new File([pdfData], createPrintFileName(title), {
        type: 'application/pdf'
    });

    showPortableImageWarning(failedImageCount);

    new IosPrintModal(
        app,
        file,
        pdfData,
        canShareFile(file)
    ).open();
}

class IosPrintModal extends Modal {
    private readonly file: File;
    private readonly pdfData: ArrayBuffer;
    private readonly canShare: boolean;

    constructor(app: App, file: File, pdfData: ArrayBuffer, canShare: boolean) {
        super(app);
        this.file = file;
        this.pdfData = pdfData;
        this.canShare = canShare;
    }

    onOpen(): void {
        this.setTitle('Print on iOS');
        this.contentEl.createEl('p', {
            text: this.canShare
                ? 'Open the iOS share sheet, then select Print.'
                : 'This Obsidian version cannot share PDF files on iOS. You can save the PDF in your vault instead.'
        });

        if (this.canShare) {
            const shareButton = this.contentEl.createEl('button', {
                text: 'Open print options'
            });
            shareButton.addClass('mod-cta');
            shareButton.addEventListener('click', () => {
                let shareResult: Promise<void>;

                try {
                    // This call must stay synchronous with the tap. iOS consumes the user activation here.
                    shareResult = navigator.share({ files: [this.file] });
                } catch (error) {
                    handleShareError(error);
                    return;
                }

                shareButton.disabled = true;
                void shareResult.then(() => {
                    this.close();
                }).catch((error: unknown) => {
                    shareButton.disabled = false;
                    handleShareError(error);
                });
            });
        }

        const saveButton = this.contentEl.createEl('button', {
            text: 'Save PDF'
        });
        saveButton.addEventListener('click', () => {
            saveButton.disabled = true;
            void saveFallbackFile(this.app, this.pdfData).then((path) => {
                new Notice(`Saved the printable PDF as "${path}".`);
                this.close();
            }).catch((error: unknown) => {
                saveButton.disabled = false;
                console.error('Could not save the iOS print PDF:', error);
                new Notice('Could not save the printable PDF.');
            });
        });
    }
}

function canShareFile(file: File): boolean {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
        return false;
    }

    try {
        return navigator.canShare({ files: [file] });
    } catch (error) {
        return false;
    }
}

function handleShareError(error: unknown): void {
    if (isAbortError(error)) {
        return;
    }

    console.error('Could not open the iOS print options:', error);
    new Notice('Could not open the iOS print options. Try again.');
}

async function saveFallbackFile(app: App, pdfData: ArrayBuffer): Promise<string> {
    for (let index = 1; index <= MAX_FALLBACK_FILE_CANDIDATES; index++) {
        const path = getFallbackPath(index);
        if (app.vault.getAbstractFileByPath(path)) {
            continue;
        }

        const file = await app.vault.createBinary(path, pdfData);
        return file.path;
    }

    throw new Error('No safe iOS output filename is available.');
}

function getFallbackPath(index: number): string {
    if (index === 1) {
        return FALLBACK_FILE_NAME;
    }

    return `obsidian-print-ios-output-${index}.pdf`;
}

function isAbortError(error: unknown): boolean {
    return typeof error === 'object'
        && error !== null
        && 'name' in error
        && error.name === 'AbortError';
}

function createPrintFileName(title: string): string {
    const safeTitle = title
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
        .trim()
        .replace(/[. ]+$/, '')
        .slice(0, 100);

    return `${safeTitle || 'Obsidian print'}.pdf`;
}
