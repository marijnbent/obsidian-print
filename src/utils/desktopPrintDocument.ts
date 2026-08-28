import { applyRuntimePrintClasses } from './runtimePrintStyles';
import { syncPrintableCloneState } from './syncPrintableClone';

const TITLE_RESTORE_TIMEOUT_MS = 1000;
const FRAME_CLEANUP_TIMEOUT_MS = 60000;

/** Print through a local iframe without loading or injecting script elements. */
export async function openDesktopPrintDocument(
    title: string,
    content: HTMLElement,
    cssText: string,
    bodyClasses: string[] = [],
    includeAppClasses = true
): Promise<void> {
    const frame = createEl('iframe');
    frame.addClass('obsidian-print-frame');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', 'Print document');
    frame.tabIndex = -1;
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
        frame.remove();
        throw new Error('Could not create the print document.');
    }

    populateDesktopPrintDocument(
        frameDocument,
        title,
        content,
        cssText,
        bodyClasses,
        includeAppClasses
    );
    const previousTitle = document.title;
    let restoreTimer = 0;
    let cleanupTimer = 0;
    let cleanedUp = false;

    const restoreTitle = () => {
        document.title = previousTitle;
        window.clearTimeout(restoreTimer);
    };
    const cleanup = () => {
        if (cleanedUp) {
            return;
        }

        cleanedUp = true;
        restoreTitle();
        window.clearTimeout(cleanupTimer);
        frame.remove();
    };

    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    document.title = title;
    restoreTimer = window.setTimeout(restoreTitle, TITLE_RESTORE_TIMEOUT_MS);
    cleanupTimer = window.setTimeout(cleanup, FRAME_CLEANUP_TIMEOUT_MS);

    try {
        frameWindow.print();
    } catch (error) {
        cleanup();
        throw error;
    }
}

export function populateDesktopPrintDocument(
    doc: Document,
    title: string,
    content: HTMLElement,
    cssText: string,
    bodyClasses: string[] = [],
    includeAppClasses = true
): void {
    doc.head.replaceChildren();
    doc.body.replaceChildren();
    doc.title = title;
    doc.head.createEl('meta', { attr: { charset: 'utf-8' } });

    if (cssText) {
        const StyleSheet = doc.defaultView?.CSSStyleSheet ?? CSSStyleSheet;
        const stylesheet = new StyleSheet();
        stylesheet.replaceSync(cssText);
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, stylesheet];
    }

    applyRuntimePrintClasses(doc, includeAppClasses);
    if (bodyClasses.length > 0) {
        doc.body.classList.add(...bodyClasses);
    }

    const clonedContent = content.cloneNode(true) as HTMLElement;
    clonedContent.querySelectorAll('script').forEach((element) => element.remove());
    syncPrintableCloneState(content, clonedContent);
    doc.body.appendChild(clonedContent);
}
