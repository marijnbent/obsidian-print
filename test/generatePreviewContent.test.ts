import { describe, expect, it, vi } from 'vitest';
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

    it('renders frontmatter wikilinks in text, lists, and nested objects', async () => {
        const file = createFile();
        const getFirstLinkpathDest = vi.fn((path: string) => path === 'Client'
            ? { path: 'clients/Client.md' }
            : null);
        const app = {
            vault: {
                cachedRead: async () => 'Body copy',
                getName: () => 'Work & notes'
            },
            metadataCache: {
                getFirstLinkpathDest,
                getFileCache: () => ({
                    frontmatter: {
                        client: '[[Client]]',
                        related: ['[[Client#Overview|Summary]]', '[[Missing note]]'],
                        details: { reference: 'See [[#Local heading|here]] and [[Client#^block-id]].' },
                        mixed: [{ reference: '[[Client|<img src=x onerror=alert(1)>]]' }, '[[Client]]']
                    }
                })
            }
        };

        const content = await generatePreviewContent(file, false, app as never, true);
        const links = Array.from(content?.querySelectorAll<HTMLAnchorElement>('.obsidian-print-frontmatter-link') ?? []);

        expect(links.map((link) => link.textContent)).toEqual([
            'Client', 'Summary', 'Missing note', 'here', 'Client#^block-id',
            '<img src=x onerror=alert(1)>', 'Client'
        ]);
        expect(links.map((link) => {
            const url = new URL(link.href);
            expect(url.protocol).toBe('obsidian:');
            expect(url.hostname).toBe('open');
            expect(url.searchParams.get('vault')).toBe('Work & notes');
            return url.searchParams.get('file');
        })).toEqual([
            'clients/Client.md', 'clients/Client.md#Overview', 'Missing note',
            'notes/print-demo.md#Local heading', 'clients/Client.md#^block-id',
            'clients/Client.md', 'clients/Client.md'
        ]);
        expect(getFirstLinkpathDest).toHaveBeenCalledWith('Client', file.path);
        expect(content?.querySelectorAll('.obsidian-print-frontmatter-chip a')).toHaveLength(2);
        expect(content?.textContent).toContain('See here and Client#^block-id.');
        expect(content?.textContent).not.toContain('[[');
        expect(content?.querySelector('img')).toBeNull();
    });

    it('preserves plain properties and external links when rendering wikilinks', async () => {
        const file = createFile();
        const values = ['[plain brackets]', '[[unfinished', '[[]]', '**literal text**', '<b>literal HTML</b>'];
        const app = {
            vault: { cachedRead: async () => 'Body copy' },
            metadataCache: {
                getFileCache: () => ({
                    frontmatter: {
                        values,
                        website: 'https://example.com/?q=[[literal]]',
                        email: 'mailto:hello@example.com'
                    }
                })
            }
        };

        const content = await generatePreviewContent(file, false, app as never, true);

        expect(Array.from(content?.querySelectorAll('.obsidian-print-frontmatter-chip') ?? [])
            .map((chip) => chip.textContent)).toEqual(values);
        expect(Array.from(content?.querySelectorAll('.obsidian-print-frontmatter-link') ?? [])
            .map((link) => link.getAttribute('href'))).toEqual([
            'https://example.com/?q=[[literal]]', 'mailto:hello@example.com'
        ]);
        expect(content?.querySelector('b, strong')).toBeNull();
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
