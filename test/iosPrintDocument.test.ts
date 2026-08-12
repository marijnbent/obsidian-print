import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian';
import { openIosPrintDocument } from '../src/utils/iosPrintDocument';

type ShareNavigator = Navigator & {
    share: (data?: ShareData) => Promise<void>;
    canShare: (data?: ShareData) => boolean;
};

function createApp(): App {
    return {
        vault: {
            readBinary: vi.fn(),
            getAbstractFileByPath: vi.fn(() => null),
            create: vi.fn(async (path: string) => ({ path }))
        },
        metadataCache: {
            getFirstLinkpathDest: vi.fn()
        }
    } as unknown as App;
}

function setShareApi(
    share: ShareNavigator['share'],
    canShare: ShareNavigator['canShare'] = () => true
): void {
    Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: share
    });
    Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: canShare
    });
}

function getShareButton(): HTMLButtonElement {
    const button = Array.from(document.querySelectorAll('button'))
        .find((candidate) => candidate.textContent === 'Open print options');

    if (!(button instanceof HTMLButtonElement)) {
        throw new Error('The iOS share button was not found.');
    }

    return button;
}

function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result)));
        reader.addEventListener('error', () => reject(reader.error));
        reader.readAsText(file);
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

describe('openIosPrintDocument', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.replaceChildren();
        getMockNotices().length = 0;
        delete (navigator as Partial<ShareNavigator>).share;
        delete (navigator as Partial<ShareNavigator>).canShare;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (navigator as Partial<ShareNavigator>).share;
        delete (navigator as Partial<ShareNavigator>).canShare;
    });

    it('shares only one portable HTML file directly from a fresh tap', async () => {
        let insideClick = false;
        const share = vi.fn((_data?: ShareData) => {
            expect(insideClick).toBe(true);
            return Promise.resolve();
        });
        const canShare = vi.fn(() => true);
        setShareApi(share, canShare);

        const content = document.createElement('div');
        content.textContent = 'Quarterly report';

        await openIosPrintDocument(
            createApp(),
            'Report: Q3',
            content,
            'body { color: black; }',
            ['invoice']
        );

        expect(share).not.toHaveBeenCalled();
        expect(canShare).toHaveBeenCalledOnce();

        insideClick = true;
        getShareButton().click();
        insideClick = false;

        expect(share).toHaveBeenCalledOnce();
        const shareData = share.mock.calls[0]?.[0];
        expect(Object.keys(shareData ?? {})).toEqual(['files']);
        expect(shareData?.files).toHaveLength(1);

        const file = shareData?.files?.[0];
        expect(file).toBeInstanceOf(File);
        expect(file?.name).toBe('Report- Q3.html');
        expect(file?.type).toBe('text/html');

        const html = await readFile(file as File);
        expect(html).toContain('<title>Report: Q3</title>');
        expect(html).toContain('body { color: black; }');
        expect(html).toContain('Quarterly report');
        expect(html).toContain('invoice');
    });

    it('keeps the modal ready for another tap after the share sheet is cancelled', async () => {
        const share = vi.fn(() => Promise.reject(new DOMException('Cancelled', 'AbortError')));
        setShareApi(share);

        await openIosPrintDocument(
            createApp(),
            'Cancelled print',
            document.createElement('div'),
            ''
        );

        const shareButton = getShareButton();
        shareButton.click();
        await vi.waitFor(() => expect(shareButton.disabled).toBe(false));

        expect(getMockNotices()).toEqual([]);
        expect(document.body.contains(shareButton)).toBe(true);
    });

    it('offers a safe vault file when iOS cannot share the HTML file', async () => {
        const share = vi.fn(() => Promise.resolve());
        setShareApi(share, () => false);
        const app = createApp();

        await openIosPrintDocument(
            app,
            'Unsupported print',
            document.createElement('div'),
            ''
        );

        expect(share).not.toHaveBeenCalled();
        expect(document.body.textContent).toContain(
            'This Obsidian version cannot share printable files on iOS.'
        );
        expect(() => getShareButton()).toThrow();

        const saveButton = Array.from(document.querySelectorAll('button'))
            .find((candidate) => candidate.textContent === 'Save printable file');
        expect(saveButton).toBeInstanceOf(HTMLButtonElement);
        (saveButton as HTMLButtonElement).click();

        await vi.waitFor(() => {
            expect(app.vault.create).toHaveBeenCalledWith(
                'obsidian-print-ios-output.html',
                expect.stringContaining('<title>Unsupported print</title>')
            );
            expect(getMockNotices()).toContain(
                'Saved the printable document as "obsidian-print-ios-output.html".'
            );
        });
    });

    it('reports a share failure and allows a retry', async () => {
        const error = new DOMException('Share failed', 'NotAllowedError');
        const share = vi.fn(() => Promise.reject(error));
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        setShareApi(share);

        await openIosPrintDocument(
            createApp(),
            'Failed print',
            document.createElement('div'),
            ''
        );

        const shareButton = getShareButton();
        shareButton.click();
        await vi.waitFor(() => expect(shareButton.disabled).toBe(false));

        expect(consoleError).toHaveBeenCalledWith('Could not open the iOS print options:', error);
        expect(getMockNotices()).toContain('Could not open the iOS print options. Try again.');
        expect(document.body.contains(shareButton)).toBe(true);
    });
});
