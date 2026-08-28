export function syncPrintableCloneState(sourceRoot: HTMLElement, targetRoot: HTMLElement): void {
    const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>('*'))];
    const targetElements = [targetRoot, ...Array.from(targetRoot.querySelectorAll<HTMLElement>('*'))];

    sourceElements.forEach((sourceElement, index) => {
        const targetElement = targetElements[index];
        if (!targetElement) {
            return;
        }

        if (sourceElement.instanceOf(HTMLCanvasElement) && targetElement.instanceOf(HTMLCanvasElement)) {
            replaceCanvasWithImage(sourceElement, targetElement);
        }
    });
}

function replaceCanvasWithImage(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement): void {
    const dataUrl = getCanvasDataUrl(sourceCanvas);
    const targetParent = targetCanvas.parentElement;
    if (!dataUrl || !targetParent) {
        return;
    }

    const imageElement = targetParent.createEl('img');

    Array.from(sourceCanvas.attributes).forEach((attribute) => {
        imageElement.setAttribute(attribute.name, attribute.value);
    });

    imageElement.src = dataUrl;

    if (!imageElement.hasAttribute('alt')) {
        imageElement.alt = '';
    }

    if (sourceCanvas.width > 0) {
        imageElement.width = sourceCanvas.width;
    }

    if (sourceCanvas.height > 0) {
        imageElement.height = sourceCanvas.height;
    }

    targetCanvas.replaceWith(imageElement);
}

function getCanvasDataUrl(canvas: HTMLCanvasElement): string | null {
    if (typeof canvas.toDataURL !== 'function') {
        return null;
    }

    try {
        return canvas.toDataURL();
    } catch {
        return null;
    }
}
