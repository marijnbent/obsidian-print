import { App, Notice, TFile, arrayBufferToBase64 } from 'obsidian';
import { createStandalonePrintHtml } from './runtimePrintStyles';
import { syncPrintableCloneState } from './syncPrintableClone';

const SOURCE_PATH_ATTRIBUTE = 'data-obsidian-print-source-path';

const IMAGE_MIME_TYPES: Record<string, string> = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp'
};

export interface PortablePrintDocument {
    html: string;
    failedImageCount: number;
}

/** Build a self-contained print document that can leave the Obsidian WebView. */
export async function createPortablePrintDocument(
    app: App,
    title: string,
    content: HTMLElement,
    cssText: string,
    bodyClasses: string[] = [],
    includeAppClasses = true
): Promise<PortablePrintDocument> {
    const portableContent = content.cloneNode(true) as HTMLElement;
    syncPrintableCloneState(content, portableContent);
    const failedImageCount = await inlineLocalImages(portableContent, app);

    return {
        html: createStandalonePrintHtml(
            portableContent,
            cssText,
            title,
            bodyClasses,
            includeAppClasses
        ),
        failedImageCount
    };
}

export function showPortableImageWarning(failedImageCount: number): void {
    if (failedImageCount === 0) {
        return;
    }

    const imageLabel = failedImageCount === 1 ? 'image' : 'images';
    new Notice(`${failedImageCount} local ${imageLabel} could not be included in the printable document.`);
}

async function inlineLocalImages(content: HTMLElement, app: App): Promise<number> {
    let failedImageCount = 0;

    for (const image of Array.from(content.querySelectorAll<HTMLImageElement>('img'))) {
        const renderedSource = image.getAttribute('src') ?? '';
        if (isPortableImageSource(renderedSource)) {
            continue;
        }

        const sourceContainer = image.closest<HTMLElement>(`[${SOURCE_PATH_ATTRIBUTE}]`);
        const sourcePath = sourceContainer?.getAttribute(SOURCE_PATH_ATTRIBUTE) ?? '';
        const embedPath = image.closest<HTMLElement>('.internal-embed[src]')?.getAttribute('src');
        const imageFile = resolveImageFile(app, embedPath, sourcePath);
        const mimeType = imageFile ? IMAGE_MIME_TYPES[imageFile.extension.toLowerCase()] : undefined;

        if (!imageFile || !mimeType) {
            failedImageCount++;
            continue;
        }

        try {
            const data = await app.vault.readBinary(imageFile);
            image.src = `data:${mimeType};base64,${arrayBufferToBase64(data)}`;
            image.removeAttribute('srcset');
        } catch {
            failedImageCount++;
        }
    }

    return failedImageCount;
}

function resolveImageFile(app: App, embedPath: string | null | undefined, sourcePath: string): TFile | null {
    if (embedPath && sourcePath) {
        return app.metadataCache.getFirstLinkpathDest(embedPath, sourcePath);
    }

    if (!sourcePath) {
        return null;
    }

    const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
    return sourceFile instanceof TFile ? sourceFile : null;
}

function isPortableImageSource(source: string): boolean {
    return /^(?:data:|https?:|\/\/)/i.test(source);
}
