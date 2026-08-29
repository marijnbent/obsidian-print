import { describe, expect, it } from 'vitest';
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
                enabledSnippets: new Set<string>(),
                snippets: {
                    contains: () => false
                },
                csscache: new Map<string, string>()
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
                enabledSnippets: new Set<string>(),
                snippets: {
                    contains: () => false
                },
                csscache: new Map<string, string>()
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
});
