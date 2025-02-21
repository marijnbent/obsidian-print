import { App, MarkdownView } from 'obsidian';

export async function captureActivePreview(app: App, printTitle: boolean = false): Promise<HTMLElement | null> {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return null;

    // Store initial view state
    const wasInEditMode = activeView.getMode() === 'source';
    
    // Switch to preview mode if needed
    if (wasInEditMode) {
        await activeView.setState(
            { mode: 'preview' },
            { history: false }
        );
        // Give time for the preview to render
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const previewContent = activeView.contentEl.querySelector('.markdown-preview-view');
    if (!previewContent) {
        // Restore edit mode if we switched
        if (wasInEditMode) {
            await activeView.setState(
                { mode: 'source' },
                { history: false }
            );
        }
        return null;
    }
    // Create container for final content
    const container = createDiv();
    container.className = 'markdown-preview-view preview-capture-mode';
    const contentSizer = container.createDiv('markdown-preview-sizer');
    
    // Add title if enabled in settings
    if (printTitle && activeView.file) {
        const titleEl = contentSizer.createEl('h1');
        titleEl.textContent = activeView.file.basename;
        titleEl.addClass('obsidian-print-title');
    }
    
    // Add title if it exists in preview
    const titleElement = previewContent.querySelector('.markdown-preview-sizer > h1:first-child');
    if (titleElement) {
        const clonedTitle = titleElement.cloneNode(true) as HTMLElement;
        clonedTitle.addClass('obsidian-print-title');
        contentSizer.appendChild(clonedTitle);
    }
    
    // Calculate scroll steps
    const viewportHeight = previewContent.clientHeight;
    const totalHeight = previewContent.scrollHeight;
    const scrollStep = Math.floor(viewportHeight / 2);
    let currentScroll = 0;
    
    // Keep track of captured content
    const capturedElements = new Set<string>();

    while (currentScroll < totalHeight) {
        previewContent.scrollTo({
            top: currentScroll,
            left: 0,
            behavior: 'instant'
        });
        await new Promise(resolve => setTimeout(resolve, 0));

        const visibleElements = previewContent.querySelectorAll('.markdown-preview-sizer > *');
        
        for (const elem of Array.from(visibleElements)) {
            let elementId: string;
            if (elem instanceof HTMLImageElement) {
                elementId = elem.src;
            } else if (elem.querySelector('img')) {
                elementId = elem.querySelector('img')?.src || elem.textContent?.trim() || '';
            } else {
                elementId = elem.textContent?.trim() || '';
            }

            if (elementId && !capturedElements.has(elementId)) {
                capturedElements.add(elementId);
                contentSizer.appendChild(elem.cloneNode(true));
            }
        }

        currentScroll += scrollStep;
    }
previewContent.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
    });
    // Restore edit mode if we switched
    if (wasInEditMode) {
        await activeView.setState(
            { mode: 'source' },
            { history: false }
        );
    }
    return container;
}