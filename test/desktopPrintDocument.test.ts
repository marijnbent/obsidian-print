import { afterEach, describe, expect, it, vi } from 'vitest';
import { populateDesktopPrintDocument } from '../src/utils/desktopPrintDocument';

describe('populateDesktopPrintDocument', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('creates a script-free printable clone with local styles', () => {
        class TestStyleSheet {
            cssText = '';

            replaceSync(cssText: string): void {
                this.cssText = cssText;
            }
        }

        vi.stubGlobal('CSSStyleSheet', TestStyleSheet);

        const printDocument = document.implementation.createHTMLDocument('Print');
        Object.defineProperty(printDocument, 'adoptedStyleSheets', {
            configurable: true,
            value: [],
            writable: true
        });

        const content = document.createElement('div');
        content.textContent = 'Printable text';
        content.appendChild(document.createElement('script'));

        populateDesktopPrintDocument(
            printDocument,
            'Report',
            content,
            'body { color: black; }',
            ['invoice'],
            false
        );

        expect(printDocument.title).toBe('Report');
        expect(printDocument.body.classList).toContain('obsidian-print');
        expect(printDocument.body.classList).toContain('invoice');
        expect(printDocument.body.textContent).toContain('Printable text');
        expect(printDocument.querySelector('script')).toBeNull();
        expect(printDocument.adoptedStyleSheets).toHaveLength(1);
        expect((printDocument.adoptedStyleSheets[0] as unknown as TestStyleSheet).cssText)
            .toBe('body { color: black; }');
    });
});
