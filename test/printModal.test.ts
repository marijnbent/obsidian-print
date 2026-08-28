import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App, Platform } from 'obsidian';

const mocks = vi.hoisted(() => {
    let lastPrintedElement: HTMLElement | null = null;
    const openDesktopPrintDocument = vi.fn((_title, content: HTMLElement) => {
        const element = content.cloneNode(true) as HTMLElement;
        const sourceCanvases = Array.from(content.querySelectorAll('canvas'));
        const clonedCanvases = Array.from(element.querySelectorAll('canvas'));
        sourceCanvases.forEach((canvas, index) => {
            const image = document.createElement('img');
            image.src = canvas.toDataURL();
            image.className = canvas.className;
            Array.from(canvas.attributes).forEach((attribute) => {
                image.setAttribute(attribute.name, attribute.value);
            });
            clonedCanvases[index]?.replaceWith(image);
        });
        lastPrintedElement = element;
    });
    const openAndroidPrintDocument = vi.fn();
    const openIosPrintDocument = vi.fn();

    return {
        openDesktopPrintDocument,
        openAndroidPrintDocument,
        openIosPrintDocument,
        getLastPrintedElement: () => lastPrintedElement,
        resetLastPrintedElement: () => {
            lastPrintedElement = null;
        }
    };
});

vi.mock('../src/utils/desktopPrintDocument', () => ({
    openDesktopPrintDocument: mocks.openDesktopPrintDocument
}));

vi.mock('../src/utils/androidPrintDocument', () => ({
    openAndroidPrintDocument: mocks.openAndroidPrintDocument
}));

vi.mock('../src/utils/iosPrintDocument', () => ({
    openIosPrintDocument: mocks.openIosPrintDocument
}));

import { openPrintModal } from '../src/utils/printModal';
import { DEFAULT_SETTINGS } from '../src/types';

function getMockNotices(): string[] {
    const globalWithNoticeStore = globalThis as typeof globalThis & {
        __obsidianMockNotices?: string[];
    };

    if (!globalWithNoticeStore.__obsidianMockNotices) {
        globalWithNoticeStore.__obsidianMockNotices = [];
    }

    return globalWithNoticeStore.__obsidianMockNotices;
}

describe('openPrintModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.resetLastPrintedElement();
        getMockNotices().length = 0;
        Platform.isDesktop = true;
        Platform.isMobile = false;
        Platform.isDesktopApp = true;
        Platform.isMobileApp = false;
        Platform.isIosApp = false;
        Platform.isAndroidApp = false;
        delete (window as unknown as Window & { require?: unknown }).require;
    });

    it('does not touch Electron when debug mode is enabled on mobile', async () => {
        Platform.isDesktop = false;
        Platform.isMobile = true;
        Platform.isDesktopApp = false;
        Platform.isMobileApp = true;
        Platform.isIosApp = true;

        const app = {} as App;

        const requireSpy = vi.fn();
        (window as unknown as Window & { require?: typeof requireSpy }).require = requireSpy;

        await openPrintModal(
            app,
            'Mobile note',
            document.createElement('div'),
            {
                ...DEFAULT_SETTINGS,
                debugMode: true
            },
            'body { color: black; }'
        );

        expect(requireSpy).not.toHaveBeenCalled();
        expect(getMockNotices()).toContain('Debug mode is only available in Obsidian desktop.');
        expect(mocks.openIosPrintDocument).toHaveBeenCalledWith(
            app,
            'Mobile note',
            expect.any(HTMLElement),
            'body { color: black; }',
            [],
            true
        );
        expect(mocks.openDesktopPrintDocument).not.toHaveBeenCalled();
    });

    it('uses the standalone document path on Android', async () => {
        Platform.isDesktop = false;
        Platform.isMobile = true;
        Platform.isDesktopApp = false;
        Platform.isMobileApp = true;
        Platform.isAndroidApp = true;

        const app = {} as App;
        const content = document.createElement('div');

        await openPrintModal(
            app,
            'Android note',
            content,
            {
                ...DEFAULT_SETTINGS,
                normalizeStyle: true
            },
            'body { color: black; }',
            ['invoice']
        );

        expect(mocks.openAndroidPrintDocument).toHaveBeenCalledWith(
            app,
            'Android note',
            content,
            'body { color: black; }',
            ['invoice'],
            false
        );
        expect(mocks.openDesktopPrintDocument).not.toHaveBeenCalled();
    });

    it('opens the Electron debug preview on desktop when debug mode is enabled', async () => {
        const loadURL = vi.fn();
        const openDevTools = vi.fn();
        const onDidFinishLoad = vi.fn((eventName: string, callback: () => void) => {
            if (eventName === 'did-finish-load') {
                callback();
            }
        });
        const BrowserWindow = vi.fn().mockImplementation(function BrowserWindow() {
            return {
                loadURL,
                webContents: {
                    on: onDidFinishLoad,
                    openDevTools
                }
            };
        });
        const requireSpy = vi.fn(() => ({
            remote: {
                BrowserWindow
            }
        }));

        (window as unknown as Window & { require?: typeof requireSpy }).require = requireSpy;

        const app = {} as App;

        await openPrintModal(
            app,
            'Desktop note',
            document.createElement('div'),
            {
                ...DEFAULT_SETTINGS,
                debugMode: true
            },
            'body { color: black; }'
        );

        expect(requireSpy).toHaveBeenCalledWith('electron');
        expect(BrowserWindow).toHaveBeenCalledOnce();
        expect(loadURL).toHaveBeenCalledOnce();
        expect(openDevTools).toHaveBeenCalledOnce();
        expect(mocks.openDesktopPrintDocument).toHaveBeenCalledOnce();
    });

    it('preserves canvas-rendered content in the printable clone', async () => {
        const content = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        canvas.setAttribute('aria-label', 'Page 1');

        Object.defineProperty(canvas, 'toDataURL', {
            value: vi.fn(() => 'data:image/png;base64,pdf-page')
        });

        content.appendChild(canvas);

        const app = {} as App;

        await openPrintModal(
            app,
            'PDF note',
            content,
            DEFAULT_SETTINGS,
            'body { color: black; }'
        );

        const printedImage = mocks.getLastPrintedElement()?.querySelector('img');
        expect(printedImage?.getAttribute('src')).toBe('data:image/png;base64,pdf-page');
        expect(printedImage?.className).toBe('pdf-page');
        expect(printedImage?.getAttribute('aria-label')).toBe('Page 1');
        expect(mocks.getLastPrintedElement()?.querySelector('canvas')).toBeNull();
    });
});
