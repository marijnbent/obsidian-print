import { App, Modal, Notice } from 'obsidian';
import {
    createPortablePrintDocument,
    showPortableImageWarning
} from './portablePrintDocument';
import { createIosPdfDocument } from './iosPdfDocument';

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

    if (!canShareFile(file)) {
        new Notice('This device cannot share the print PDF.');
        return;
    }

    new IosPrintModal(app, file).open();
}

class IosPrintModal extends Modal {
    private readonly file: File;

    constructor(app: App, file: File) {
        super(app);
        this.file = file;
    }

    onOpen(): void {
        this.contentEl.addClass('obsidian-print-ios-content');
        this.setTitle('Ready to print');
        this.contentEl.createEl('p', {
            text: 'Open the iOS share sheet, then select Print.'
        });

        const shareButton = this.contentEl.createEl('button', {
            text: 'Continue to print'
        });
        shareButton.addClass('mod-cta');
        shareButton.addClass('obsidian-print-ios-button');
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

    console.error('Could not open the iOS share sheet:', error);
    new Notice('Could not open the iOS share sheet. Try again.');
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
