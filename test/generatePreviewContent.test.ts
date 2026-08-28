import { describe, expect, it } from 'vitest';
import { TFile } from 'obsidian';
import { generatePreviewContent } from '../src/utils/generatePreviewContent';

function createFile() {
    return Object.assign(new TFile(), {
        path: 'notes/print-demo.md',
        basename: 'print-demo',
        extension: 'md'
    });
}

describe('generatePreviewContent', () => {
    it('renders frontmatter values with structured markup', async () => {
        const file = createFile();
        const app = {
            vault: {
                cachedRead: async () => `---
title: Quarterly packet
aliases:
  - Q2 packet
---
Body copy`
            },
            metadataCache: {
                getFileCache: () => ({
                    frontmatter: {
                        cssclasses: ['invoice', 'compact-print'],
                        title: 'Quarterly packet',
                        aliases: ['Q2 packet', 'Print regression sample'],
                        tags: ['finance/q2', 'print/testing'],
                        reviewed: true,
                        client: {
                            name: 'Northwind Press',
                            contact: 'Ada Lovelace'
                        },
                        links: {
                            docs: 'https://obsidian.md'
                        },
                        position: {
                            start: {
                                line: 0
                            }
                        }
                    }
                })
            }
        };

        const content = await generatePreviewContent(file, true, app as never, true);

        expect(content).toBeTruthy();
        expect(content?.querySelector('.obsidian-print-frontmatter')).toBeTruthy();
        expect(content?.querySelector('.obsidian-print-frontmatter-heading')?.textContent).toBe('Properties');
        expect(content?.querySelectorAll('.obsidian-print-frontmatter-chip')).toHaveLength(6);
        expect(content?.querySelector('.obsidian-print-frontmatter-object-key')?.textContent).toBe('name');
        expect(content?.querySelector('.obsidian-print-frontmatter-boolean.is-checked')).toBeTruthy();
        expect(content?.querySelector('.obsidian-print-frontmatter-link')?.getAttribute('href')).toBe('https://obsidian.md');
        expect(content?.textContent).toContain('Quarterly packet');
        expect(content?.textContent).toContain('Northwind Press');
        expect(content?.textContent).toContain('Body copy');
        expect(content?.textContent).not.toContain('position');
        expect(content?.textContent).not.toContain('aliases:');
    });

    it('renders mermaid code fences into diagrams', async () => {
        const file = createFile();
        const app = {
            vault: {
                cachedRead: async () => `
\`\`\`mermaid
flowchart TD
    Start --> Finish
\`\`\`
`
            },
            metadataCache: {
                getFileCache: () => undefined
            }
        };

        const content = await generatePreviewContent(file, false, app as never, false);

        expect(content?.querySelector('.mermaid')).toBeTruthy();
        expect(content?.querySelector('svg[data-mermaid-id]')).toBeTruthy();
        expect(content?.querySelector('svg[data-mermaid-id]')?.hasAttribute('onclick')).toBe(false);
        expect(content?.querySelector('script')).toBeNull();
        expect(content?.textContent).toContain('Start --> Finish');
        expect(content?.querySelector('pre code.language-mermaid')).toBeFalsy();
    });

    it('marks rendered content without using live preview pane classes', async () => {
        const file = createFile();
        const app = {
            vault: {
                cachedRead: async () => 'Body copy'
            },
            metadataCache: {
                getFileCache: () => undefined
            }
        };

        const content = await generatePreviewContent(file, false, app as never, false);

        expect(content?.classList.contains('obsidian-print-note')).toBe(true);
        expect(content?.classList.contains('markdown-rendered')).toBe(true);
        expect(content?.classList.contains('markdown-reading-view')).toBe(false);
        expect(content?.classList.contains('markdown-preview-view')).toBe(false);
    });

    it('removes Obsidian native metadata from rendered print content', async () => {
        const file = createFile();
        const app = {
            vault: {
                cachedRead: async () => '[native-metadata-container]\nBody copy'
            },
            metadataCache: {
                getFileCache: () => undefined
            }
        };

        const content = await generatePreviewContent(file, false, app as never, false);

        expect(content?.querySelector('.metadata-container')).toBeFalsy();
        expect(content?.textContent).not.toContain('Native properties');
        expect(content?.textContent).toContain('Body copy');
    });
});
