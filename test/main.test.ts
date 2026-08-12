import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    generatePreviewContent: vi.fn(),
    generatePrintStyles: vi.fn(),
    openPrintModal: vi.fn(),
    getFolderByActiveFile: vi.fn()
}));

vi.mock('../src/settings', () => ({
    PrintSettingTab: class PrintSettingTab {}
}));

vi.mock('../src/utils/generatePreviewContent', () => ({
    generatePreviewContent: mocks.generatePreviewContent
}));

vi.mock('../src/utils/generatePrintStyles', () => ({
    generatePrintStyles: mocks.generatePrintStyles
}));

vi.mock('../src/utils/printModal', () => ({
    openPrintModal: mocks.openPrintModal
}));

vi.mock('../src/utils/getFolderByActiveFile', () => ({
    getFolderByActiveFile: mocks.getFolderByActiveFile
}));

import PrintPlugin from '../src/main';
import { DEFAULT_SETTINGS } from '../src/types';
import { MarkdownView, Platform, TFile, TFolder } from 'obsidian';

function createApp() {
    const app: any = {
        workspace: {
            on: vi.fn(() => ({})),
            getActiveFile: vi.fn(() => null),
            getActiveViewOfType: vi.fn(() => null),
            getActiveFileView: vi.fn(() => null)
        },
        metadataCache: {
            getFileCache: vi.fn(() => undefined)
        },
        customCss: {
            setCssEnabledStatus: vi.fn(),
            enabledSnippets: new Set<string>(),
            snippets: {
                contains: vi.fn(() => false)
            },
            csscache: new Map<string, string>()
        }
    };

    return app;
}

function createPlugin(app = createApp()) {
    return new PrintPlugin(app as never, { dir: 'test-plugin' } as never);
}

function createFolder(name: string) {
    return Object.assign(new TFolder(), {
        name,
        children: [] as Array<TFile | TFolder>
    });
}

function createFile(path: string, basename: string, parent: TFolder) {
    return Object.assign(new TFile(), {
        path,
        basename,
        extension: path.split('.').pop() ?? 'md',
        parent
    });
}

function createMarkdownView(file: TFile, selection: string) {
    return Object.assign(Object.create(MarkdownView.prototype), {
        file,
        editor: {
            getSelection: () => selection
        },
        save: vi.fn(async () => undefined)
    });
}

function getMockNotices(): string[] {
    const globalWithNoticeStore = globalThis as typeof globalThis & {
        __obsidianMockNotices?: string[];
    };

    if (!globalWithNoticeStore.__obsidianMockNotices) {
        globalWithNoticeStore.__obsidianMockNotices = [];
    }

    return globalWithNoticeStore.__obsidianMockNotices;
}

describe('PrintPlugin cssclasses behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getMockNotices().length = 0;
        Platform.isDesktop = true;
        Platform.isMobile = false;
        Platform.isDesktopApp = true;
        Platform.isMobileApp = false;
        Platform.isIosApp = false;
        Platform.isAndroidApp = false;
        mocks.generatePrintStyles.mockResolvedValue('body { color: black; }');
    });

    it('migrates the old extraClasses setting on load', async () => {
        const plugin = createPlugin();
        vi.spyOn(plugin, 'loadData').mockResolvedValue({
            extraClasses: true
        } as never);

        await plugin.onload();

        expect(plugin.settings.inheritNoteCssClasses).toBe(true);
    });

    it('applies note cssclasses when printing a note', async () => {
        const app = createApp();
        const folder = createFolder('Invoices');
        const file = createFile('Invoices/note.md', 'note', folder);
        const content = document.createElement('div');
        content.className = 'obsidian-print-note';

        app.metadataCache.getFileCache.mockReturnValue({
            frontmatter: {
                cssclasses: 'invoice compact-print'
            }
        });
        mocks.generatePreviewContent.mockResolvedValue(content);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            inheritNoteCssClasses: true
        };

        await plugin.printNote(file);

        expect(content.classList.contains('invoice')).toBe(true);
        expect(content.classList.contains('compact-print')).toBe(true);
        expect(content.getAttribute('data-obsidian-print-source-path')).toBe('Invoices/note.md');
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'note',
            content,
            plugin.settings,
            'body { color: black; }',
            ['invoice', 'compact-print']
        );
    });

    it('applies the active note cssclasses when printing a selection', async () => {
        const app = createApp();
        const folder = createFolder('Invoices');
        const file = createFile('Invoices/note.md', 'note', folder);
        const content = document.createElement('div');
        const activeView = createMarkdownView(file, 'Selected text');

        app.workspace.getActiveViewOfType.mockReturnValue(activeView);
        app.metadataCache.getFileCache.mockReturnValue({
            frontmatter: {
                cssclasses: ['invoice', 'compact-print']
            }
        });
        mocks.generatePreviewContent.mockResolvedValue(content);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            inheritNoteCssClasses: true
        };

        await plugin.printSelection();

        expect(content.classList.contains('invoice')).toBe(true);
        expect(content.classList.contains('compact-print')).toBe(true);
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'note snippet',
            content,
            plugin.settings,
            'body { color: black; }',
            ['invoice', 'compact-print']
        );
    });

    it('keeps each note classes on its own wrapper when printing a folder', async () => {
        const app = createApp();
        const folder = createFolder('Invoices');
        const firstFile = createFile('Invoices/one.md', 'one', folder);
        const secondFile = createFile('Invoices/two.md', 'two', folder);
        folder.children = [firstFile, secondFile];

        const firstContent = document.createElement('div');
        const secondContent = document.createElement('div');

        app.metadataCache.getFileCache.mockImplementation((file: TFile) => {
            if (file === firstFile) {
                return {
                    frontmatter: {
                        cssclasses: 'invoice'
                    }
                };
            }

            return {
                frontmatter: {
                    cssclasses: 'compact-print'
                }
            };
        });

        mocks.generatePreviewContent
            .mockResolvedValueOnce(firstContent)
            .mockResolvedValueOnce(secondContent);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            inheritNoteCssClasses: true
        };

        await plugin.printFolder(folder);

        expect(firstContent.classList.contains('invoice')).toBe(true);
        expect(secondContent.classList.contains('compact-print')).toBe(true);
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'Invoices',
            expect.any(HTMLDivElement),
            plugin.settings,
            'body { color: black; }'
        );
    });

    it('sorts folder printouts like the vault view, with the folder note first', async () => {
        const app = createApp();
        const folder = createFolder('Projects');
        const zetaFile = createFile('Projects/Zeta.md', 'Zeta', folder);
        const quotedTodoFile = createFile('Projects/“ToDo List…”.md', '“ToDo List…”', folder);
        const folderNote = createFile('Projects/Projects.md', 'Projects', folder);
        folder.children = [zetaFile, folderNote, quotedTodoFile];

        const zetaContent = document.createElement('div');
        const todoContent = document.createElement('div');
        const folderNoteContent = document.createElement('div');

        mocks.generatePreviewContent.mockImplementation(async (file: TFile) => {
            if (file === folderNote) {
                return folderNoteContent;
            }

            if (file === quotedTodoFile) {
                return todoContent;
            }

            return zetaContent;
        });

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS
        };

        await plugin.printFolder(folder);

        expect(mocks.generatePreviewContent.mock.calls.map(([file]) => file)).toEqual([
            folderNote,
            quotedTodoFile,
            zetaFile
        ]);
    });

    it('prints the rendered base view instead of markdown source for active base files', async () => {
        const app = createApp();
        const folder = createFolder('Dashboards');
        const file = createFile('Dashboards/books.base', 'books', folder);
        const viewContainer = document.createElement('div');
        const resultsEl = document.createElement('div');
        resultsEl.className = 'bases-view';
        resultsEl.textContent = 'Book list';
        viewContainer.appendChild(resultsEl);

        app.workspace.getActiveFile.mockReturnValue(file);
        app.workspace.getActiveFileView.mockReturnValue({
            file,
            containerEl: viewContainer
        });

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            printTitle: true
        };

        await plugin.printNote(file);

        expect(mocks.generatePreviewContent).not.toHaveBeenCalled();
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'books',
            expect.any(HTMLDivElement),
            plugin.settings,
            'body { color: black; }'
        );

        const [, , renderedContent] = mocks.openPrintModal.mock.calls[0];
        expect((renderedContent as HTMLElement).textContent).toContain('books');
        expect((renderedContent as HTMLElement).textContent).toContain('Book list');
    });

    it('prints the rendered image view instead of reading png bytes as markdown', async () => {
        const app = createApp();
        const folder = createFolder('Assets');
        const file = createFile('Assets/diagram.png', 'diagram', folder);
        const viewContainer = document.createElement('div');
        const contentEl = document.createElement('div');
        contentEl.className = 'view-content';
        const imageEl = document.createElement('img');
        imageEl.setAttribute('src', 'app://local/Assets/diagram.png');
        imageEl.setAttribute('alt', 'diagram');
        contentEl.appendChild(imageEl);
        viewContainer.appendChild(contentEl);

        app.workspace.getActiveFile.mockReturnValue(file);
        app.workspace.getActiveFileView.mockReturnValue({
            file,
            containerEl: viewContainer
        });

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            printTitle: true
        };

        await plugin.printNote(file);

        expect(mocks.generatePreviewContent).not.toHaveBeenCalled();
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'diagram',
            expect.any(HTMLDivElement),
            plugin.settings,
            'body { color: black; }'
        );

        const [, , renderedContent] = mocks.openPrintModal.mock.calls[0];
        expect((renderedContent as HTMLElement).textContent).toContain('diagram');
        expect((renderedContent as HTMLElement).querySelector('img')?.getAttribute('src')).toBe('app://local/Assets/diagram.png');
    });

    it('asks to open a non-markdown file before printing when no rendered view is active', async () => {
        const app = createApp();
        const folder = createFolder('Assets');
        const file = createFile('Assets/diagram.png', 'diagram', folder);

        app.workspace.getActiveFile.mockReturnValue(null);
        app.workspace.getActiveFileView.mockReturnValue(null);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS
        };

        await plugin.printNote(file);

        expect(mocks.generatePreviewContent).not.toHaveBeenCalled();
        expect(mocks.openPrintModal).not.toHaveBeenCalled();
        expect(getMockNotices()).toContain('Open the file first to print its rendered view.');
    });

    it('renders markdown notes from source even when a reading view is active', async () => {
        const app = createApp();
        const folder = createFolder('Notes');
        const file = createFile('Notes/daily.md', 'daily', folder);
        const content = document.createElement('div');
        content.textContent = 'Rendered from markdown source';
        const previewContainer = document.createElement('div');
        previewContainer.className = 'markdown-reading-view';
        previewContainer.innerHTML = `
            <div class="inline-title">daily</div>
            <div class="markdown-preview-view">
                <p>Rendered preview content</p>
            </div>
        `;

        app.workspace.getActiveFile.mockReturnValue(file);
        app.workspace.getActiveFileView.mockReturnValue({
            file,
            getMode: () => 'preview',
            previewMode: {
                containerEl: previewContainer,
                rerender: vi.fn()
            }
        });
        mocks.generatePreviewContent.mockResolvedValue(content);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            printTitle: true
        };

        await plugin.printNote(file);

        expect(mocks.generatePreviewContent).toHaveBeenCalledWith(
            file,
            true,
            app,
            false
        );
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'daily',
            content,
            plugin.settings,
            'body { color: black; }',
            []
        );
    });

    it('falls back to markdown rendering when the active note is not in preview mode', async () => {
        const app = createApp();
        const folder = createFolder('Notes');
        const file = createFile('Notes/daily.md', 'daily', folder);
        const content = document.createElement('div');
        content.textContent = 'Rendered from markdown source';

        app.workspace.getActiveFile.mockReturnValue(file);
        app.workspace.getActiveFileView.mockReturnValue({
            file,
            getMode: () => 'source',
            previewMode: {
                containerEl: document.createElement('div'),
                rerender: vi.fn()
            }
        });
        mocks.generatePreviewContent.mockResolvedValue(content);

        const plugin = createPlugin(app);
        plugin.settings = {
            ...DEFAULT_SETTINGS,
            printTitle: true
        };

        await plugin.printNote(file);

        expect(mocks.generatePreviewContent).toHaveBeenCalledWith(
            file,
            true,
            app,
            false
        );
        expect(mocks.openPrintModal).toHaveBeenCalledWith(
            app,
            'daily',
            content,
            plugin.settings,
            'body { color: black; }',
            []
        );
    });
});
