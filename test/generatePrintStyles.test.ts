import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/types';
import { generatePrintStyles } from '../src/utils/generatePrintStyles';

describe('generatePrintStyles', () => {
    it('adds normalized fallback styles only when normalize style is enabled', async () => {
        const app = {
            vault: {
                adapter: {
                    read: async () => '@media print { .obsidian-print-page-break { break-before: page; } }'
                }
            },
            customCss: {
                enabledSnippets: new Set<string>()
            }
        };

        const defaultCss = await generatePrintStyles(
            app as never,
            { dir: 'test-plugin' } as never,
            {
                ...DEFAULT_SETTINGS,
                normalizeStyle: false
            }
        );
        const normalizedCss = await generatePrintStyles(
            app as never,
            { dir: 'test-plugin' } as never,
            {
                ...DEFAULT_SETTINGS,
                normalizeStyle: true
            }
        );

        expect(defaultCss).not.toContain(".callout[data-callout=\"note\"]");
        expect(defaultCss).not.toContain('body { font-size: 14px; }');
        expect(defaultCss).not.toContain('h1 { font-size: 20px; }');
        expect(normalizedCss).toContain(".callout[data-callout=\"note\"]");
        expect(normalizedCss).toContain("font-family: 'Inter'");
        expect(normalizedCss).toContain('body { font-size: 14px; }');
        expect(normalizedCss).toContain('h1 { font-size: 20px; }');
    });

    it('uses distinct properties styling for normalized and themed output', async () => {
        const app = {
            vault: {
                adapter: {
                    read: async () => '@media print { .obsidian-print-page-break { break-before: page; } }'
                }
            },
            customCss: {
                enabledSnippets: new Set<string>()
            }
        };

        const themedCss = await generatePrintStyles(
            app as never,
            { dir: 'test-plugin' } as never,
            {
                ...DEFAULT_SETTINGS,
                printFrontmatter: true,
                normalizeStyle: false
            }
        );
        const normalizedCss = await generatePrintStyles(
            app as never,
            { dir: 'test-plugin' } as never,
            {
                ...DEFAULT_SETTINGS,
                printFrontmatter: true,
                normalizeStyle: true
            }
        );

        expect(themedCss).toContain('--obsidian-print-frontmatter-chip-background: var(--tag-background');
        expect(themedCss).toContain('--obsidian-print-frontmatter-background: var(--background-secondary');
        expect(themedCss).toContain('border-radius: 10px;');
        expect(themedCss).toMatch(/\.obsidian-print-frontmatter-heading\s*\{[^}]*break-after: avoid;[^}]*page-break-after: avoid;/);
        expect(themedCss).toMatch(/\.obsidian-print-frontmatter-properties\s*\{[^}]*break-inside: auto;[^}]*page-break-inside: auto;/);
        expect(normalizedCss).toContain('--obsidian-print-frontmatter-chip-background: #eef2ff;');
        expect(normalizedCss).toContain('--obsidian-print-frontmatter-background: #fcfcfd;');
        expect(normalizedCss).toContain('border-radius: 12px;');
    });
    it.each(['.obsidian', '.custom-config'])('reads fresh custom CSS last and respects the shared switch in %s', async (configDir) => {
        let snippet = '.obsidian-print p { text-indent: 2em; }';
        const path = `${configDir}/snippets/print.css`;
        const read = vi.fn(async (file: string) => file === path ? snippet : 'body { color: black; }');
        const app = {
            vault: { configDir, adapter: { read, exists: vi.fn(async () => true) } },
            customCss: { enabledSnippets: new Set(['print']) }
        };
        const generate = () => generatePrintStyles(app as never, { dir: 'test-plugin' } as never, DEFAULT_SETTINGS);

        expect((await generate()).endsWith(snippet)).toBe(true);
        snippet = '.obsidian-print p { text-indent: 3em; }';
        expect((await generate()).endsWith(snippet)).toBe(true);
        expect(read.mock.calls.filter(([file]) => file === path)).toHaveLength(2);

        app.customCss.enabledSnippets.delete('print');
        read.mockClear();
        expect(await generate()).not.toContain(snippet);
        expect(read).not.toHaveBeenCalledWith(path);
    });

    it.each(['missing', 'unreadable'])('continues with default styles and a notice for an enabled %s snippet', async (failure) => {
        const app = {
            vault: {
                configDir: '.obsidian',
                adapter: {
                    exists: async () => failure !== 'missing',
                    read: async (path: string) => {
                        if (path.endsWith('/print.css')) throw new Error('Permission denied');
                        return 'body { color: black; }';
                    }
                }
            },
            customCss: { enabledSnippets: new Set(['print']) }
        };
        const notices = (globalThis as typeof globalThis & { __obsidianMockNotices?: string[] });
        notices.__obsidianMockNotices = [];
        const css = await generatePrintStyles(app as never, { dir: 'test-plugin' } as never, DEFAULT_SETTINGS);

        expect(css).toContain('body { color: black; }');
        expect(notices.__obsidianMockNotices).toEqual([
            failure === 'missing'
                ? 'Custom print CSS was not found: .obsidian/snippets/print.css. Printing without custom CSS.'
                : 'Could not read custom print CSS: .obsidian/snippets/print.css. Printing without custom CSS.'
        ]);
    });
});
