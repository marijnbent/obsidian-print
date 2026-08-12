import { describe, expect, it } from 'vitest';
import {
    applyRuntimePrintClasses,
    createStandalonePrintHtml,
    getTargetedRuntimePrintCss
} from '../src/utils/runtimePrintStyles';

describe('getTargetedRuntimePrintCss', () => {
    it('collects callout and mermaid rules alongside other targeted print styles', () => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .callout[data-callout="tip"] {
                border-color: rgba(var(--callout-color), 0.4);
                color: rgb(var(--callout-color));
            }

            .callout-title {
                font-weight: 700;
            }

            .mermaid .node rect {
                fill: var(--mermaid-node-bg);
            }

            .unrelated-selector {
                color: hotpink;
            }
        `;

        document.head.appendChild(styleElement);

        try {
            document.documentElement.style.setProperty('--callout-color', '22, 163, 74');
            document.documentElement.style.setProperty('--mermaid-node-bg', '#f5f5f5');

            const cssText = getTargetedRuntimePrintCss(document.body);

            expect(cssText).toContain('.callout[data-callout="tip"]');
            expect(cssText).toContain('.callout-title');
            expect(cssText).toContain('.mermaid .node rect');
            expect(cssText).toContain('--callout-color: 22, 163, 74;');
            expect(cssText).toContain('--mermaid-node-bg: #f5f5f5;');
            expect(cssText).not.toContain('.unrelated-selector');
        } finally {
            styleElement.remove();
            document.documentElement.style.removeProperty('--callout-color');
            document.documentElement.style.removeProperty('--mermaid-node-bg');
        }
    });

    it('collects style rules that match rendered base content', () => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .bases-view .base-cell {
                color: seagreen;
            }
        `;

        const baseRoot = document.createElement('div');
        baseRoot.className = 'bases-view';
        const cell = document.createElement('div');
        cell.className = 'base-cell';
        baseRoot.appendChild(cell);
        document.body.appendChild(baseRoot);
        document.head.appendChild(styleElement);

        try {
            const cssText = getTargetedRuntimePrintCss(baseRoot);
            expect(cssText).toContain('.bases-view .base-cell');
        } finally {
            styleElement.remove();
            baseRoot.remove();
        }
    });

    it('does not collect unrelated workspace rules when the printed content does not match them', () => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .workspace-leaf.mod-active .view-content {
                display: none;
            }

            .obsidian-print-note p {
                color: black;
            }
        `;

        const printedRoot = document.createElement('div');
        printedRoot.className = 'obsidian-print-note';
        printedRoot.innerHTML = '<p>Hello world</p>';
        document.head.appendChild(styleElement);

        try {
            const cssText = getTargetedRuntimePrintCss(printedRoot);

            expect(cssText).toContain('.obsidian-print-note p');
            expect(cssText).not.toContain('.workspace-leaf.mod-active .view-content');
        } finally {
            styleElement.remove();
        }
    });

    it('collects light-theme selectors for print even when the app is in dark mode', () => {
        const previousBodyClassName = document.body.className;
        const previousHtmlClassName = document.documentElement.className;
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            body.theme-dark .markdown-reading-view h1 {
                color: papayawhip;
            }

            body.theme-light .markdown-reading-view h1 {
                color: midnightblue;
            }

            body.theme-light p {
                color: slategray;
            }
        `;

        const printedRoot = document.createElement('div');
        printedRoot.className = 'markdown-reading-view';
        printedRoot.innerHTML = '<h1>Theme-aware heading</h1>';
        document.documentElement.className = 'theme-dark mod-windows';
        document.body.className = 'theme-dark';
        document.head.appendChild(styleElement);

        try {
            const cssText = getTargetedRuntimePrintCss(printedRoot);

            expect(cssText).toContain('body.theme-light .markdown-reading-view h1');
            expect(cssText).not.toContain('body.theme-dark .markdown-reading-view h1');
            expect(cssText).not.toContain('body.theme-light p');
        } finally {
            styleElement.remove();
            document.documentElement.className = previousHtmlClassName;
            document.body.className = previousBodyClassName;
        }
    });

    it('resolves runtime CSS variables from the light theme for print', () => {
        const previousHtmlClassName = document.documentElement.className;
        const previousBodyClassName = document.body.className;
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .theme-dark {
                --text-normal: ghostwhite;
            }

            .theme-light {
                --text-normal: rgb(17, 24, 39);
            }

            .markdown-reading-view h1 {
                color: var(--text-normal);
            }
        `;

        const printedRoot = document.createElement('div');
        printedRoot.className = 'markdown-reading-view';
        printedRoot.innerHTML = '<h1>Variable-backed heading</h1>';
        document.documentElement.className = 'theme-dark';
        document.body.className = 'workspace theme-dark';
        document.head.appendChild(styleElement);

        try {
            const cssText = getTargetedRuntimePrintCss(printedRoot);
            const compactCssText = cssText.replace(/\s+/g, '');

            expect(cssText).toContain('.markdown-reading-view h1');
            expect(compactCssText).toContain('--text-normal:rgb(17,24,39);');
            expect(cssText).not.toContain('--text-normal: ghostwhite;');
        } finally {
            styleElement.remove();
            document.documentElement.className = previousHtmlClassName;
            document.body.className = previousBodyClassName;
        }
    });

    it('can skip app theme classes for normalized print output', () => {
        const previousHtmlClassName = document.documentElement.className;
        const previousBodyClassName = document.body.className;
        document.documentElement.className = 'theme-dark mod-windows';
        document.body.className = 'workspace theme-dark';

        try {
            const debugContent = createStandalonePrintHtml(
                document.createElement('div'),
                '',
                'Print note',
                [],
                false
            );
            const printDoc = document.implementation.createHTMLDocument('Print');

            applyRuntimePrintClasses(printDoc, false);

            expect(debugContent).toContain('<body class="obsidian-print">');
            expect(debugContent).not.toContain('theme-dark');
            expect(printDoc.documentElement.className).toBe('');
            expect(printDoc.body.className).toBe('obsidian-print');
        } finally {
            document.documentElement.className = previousHtmlClassName;
            document.body.className = previousBodyClassName;
        }
    });

    it('forces light theme classes onto the print document when app classes are included', () => {
        const previousHtmlClassName = document.documentElement.className;
        const previousBodyClassName = document.body.className;
        document.documentElement.className = 'theme-dark mod-windows';
        document.body.className = 'workspace theme-dark is-focused';

        try {
            const debugContent = createStandalonePrintHtml(
                document.createElement('div'),
                '',
                'Print note',
                [],
                true
            );
            const printDoc = document.implementation.createHTMLDocument('Print');

            applyRuntimePrintClasses(printDoc, true);

            expect(debugContent).toContain('<html class="mod-windows theme-light">');
            expect(debugContent).toContain('<body class="obsidian-print workspace is-focused theme-light">');
            expect(debugContent).not.toContain('theme-dark');
            expect(printDoc.documentElement.className).toBe('mod-windows theme-light');
            expect(printDoc.body.className).toBe('obsidian-print workspace is-focused theme-light');
        } finally {
            document.documentElement.className = previousHtmlClassName;
            document.body.className = previousBodyClassName;
        }
    });
});
