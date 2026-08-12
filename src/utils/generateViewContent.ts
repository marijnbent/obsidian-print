import { Notice } from 'obsidian';
import { generateBasePrintContent } from './generateBasePrintContent';

interface PrintableViewLike {
    containerEl?: HTMLElement;
}

interface GenerateViewContentOptions {
    leadingElements?: HTMLElement[];
    title?: string;
}

const VIEW_ROOT_SELECTORS = [
    '.markdown-reading-view',
    '.markdown-preview-view',
    '.markdown-preview-sizer',
    '.markdown-rendered',
    '.bases-view',
    '.base-view',
    '[class*="bases"]',
    '.view-content',
    '.workspace-leaf-content .view-content'
];

const VIEW_CHROME_SELECTORS = [
    '.view-header',
    '[role="toolbar"]',
    '.clickable-icon',
    '.mod-action-button',
    '.inline-title',
    '.bases-toolbar',
    '.bases-view-toolbar'
];

export function generateViewContent(
    view: PrintableViewLike | null | undefined,
    options: GenerateViewContentOptions = {}
): HTMLElement | void {
    const basePrintContent = generateBasePrintContent(view, options);
    if (basePrintContent) {
        return basePrintContent;
    }

    const sourceRoot = resolveViewRoot(view);
    if (!sourceRoot) {
        new Notice('Could not capture the current view for printing.');
        return;
    }

    const content = createDiv();

    options.leadingElements?.forEach((element) => {
        content.appendChild(element);
    });

    if (options.title) {
        content.createEl('h1', { text: options.title });
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'obsidian-print-note obsidian-print-view';

    const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement;
    stripViewChrome(clonedRoot);

    wrapper.appendChild(clonedRoot);
    content.appendChild(wrapper);

    return content;
}

function resolveViewRoot(view: PrintableViewLike | null | undefined): HTMLElement | null {
    if (!view?.containerEl) {
        return null;
    }

    for (const selector of VIEW_ROOT_SELECTORS) {
        const match = view.containerEl.querySelector<HTMLElement>(selector);
        if (match) {
            return match;
        }
    }

    return view.containerEl;
}

function stripViewChrome(root: HTMLElement): void {
    root.querySelectorAll(VIEW_CHROME_SELECTORS.join(',')).forEach((element) => {
        element.remove();
    });
}
