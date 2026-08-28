import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    openDesktopPrintDocument,
    populateDesktopPrintDocument
} from '../src/utils/desktopPrintDocument';

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
        Object.defineProperty(printDocument.head, 'createEl', {
            configurable: true,
            value: undefined
        });
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
        expect(printDocument.querySelector('meta')?.getAttribute('charset')).toBe('utf-8');
        expect(printDocument.adoptedStyleSheets).toHaveLength(1);
        expect((printDocument.adoptedStyleSheets[0] as unknown as TestStyleSheet).cssText)
            .toBe('body { color: black; }');
    });

    it('removes the print frame when document creation fails', async () => {
        const content = document.createElement('div');
        vi.spyOn(content, 'cloneNode').mockImplementation(() => {
            throw new Error('Could not clone content');
        });

        await expect(openDesktopPrintDocument(
            'Report',
            content,
            ''
        )).rejects.toThrow('Could not clone content');

        expect(document.querySelector('.obsidian-print-frame')).toBeNull();
    });
});
