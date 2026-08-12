import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian';

const mocks = vi.hoisted(() => ({
    createIosPdfDocument: vi.fn()
}));

vi.mock('../src/utils/iosPdfDocument', () => ({
    createIosPdfDocument: mocks.createIosPdfDocument
}));

import { openIosPrintDocument } from '../src/utils/iosPrintDocument';

const PDF_BYTES = [
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
    0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46
];

type ShareNavigator = Navigator & {
    share: (data?: ShareData) => Promise<void>;
    canShare: (data?: ShareData) => boolean;
};

function createApp(): App {
    return {
        vault: {
            readBinary: vi.fn(),
            getAbstractFileByPath: vi.fn(() => null)
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
        .find((candidate) => candidate.textContent === 'Continue to print');

    if (!(button instanceof HTMLButtonElement)) {
        throw new Error('The iOS share button was not found.');
    }

    return button;
}

function readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as ArrayBuffer));
        reader.addEventListener('error', () => reject(reader.error));
        reader.readAsArrayBuffer(file);
    });
}

function createPdfData(): ArrayBuffer {
    return new Uint8Array(PDF_BYTES).buffer;
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
        mocks.createIosPdfDocument.mockResolvedValue(createPdfData());
        delete (navigator as Partial<ShareNavigator>).share;
        delete (navigator as Partial<ShareNavigator>).canShare;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (navigator as Partial<ShareNavigator>).share;
        delete (navigator as Partial<ShareNavigator>).canShare;
    });

    it('shares only one prepared PDF directly from a fresh tap', async () => {
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
        expect(document.querySelectorAll('button')).toHaveLength(1);
        expect(document.body.textContent).toContain('Ready to print');
        expect(document.querySelector('.obsidian-print-ios-content')).not.toBeNull();
        expect(document.querySelector('.obsidian-print-ios-button')).toBe(getShareButton());
        expect(mocks.createIosPdfDocument).toHaveBeenCalledWith(
            expect.stringContaining('Quarterly report')
        );
        expect(mocks.createIosPdfDocument).toHaveBeenCalledWith(
            expect.stringContaining('body { color: black; }')
        );

        insideClick = true;
        getShareButton().click();
        insideClick = false;

        expect(share).toHaveBeenCalledOnce();
        const shareData = share.mock.calls[0]?.[0];
        expect(Object.keys(shareData ?? {})).toEqual(['files']);
        expect(shareData?.files).toHaveLength(1);

        const file = shareData?.files?.[0];
        expect(file).toBeInstanceOf(File);
        expect(file?.name).toBe('Report- Q3.pdf');
        expect(file?.type).toBe('application/pdf');

        const fileData = new Uint8Array(await readFile(file as File));
        expect(Array.from(fileData)).toEqual(PDF_BYTES);
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

        expect(getMockNotices()).not.toContain('Could not open the iOS share sheet. Try again.');
        expect(document.body.contains(shareButton)).toBe(true);
    });

    it('reports when iOS cannot share the PDF', async () => {
        const share = vi.fn(() => Promise.resolve());
        setShareApi(share, () => false);

        await openIosPrintDocument(
            createApp(),
            'Unsupported print',
            document.createElement('div'),
            ''
        );

        expect(share).not.toHaveBeenCalled();
        expect(getMockNotices()).toContain(
            'This device cannot share the print PDF.'
        );
        expect(document.querySelector('button')).toBeNull();
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

        expect(consoleError).toHaveBeenCalledWith('Could not open the iOS share sheet:', error);
        expect(getMockNotices()).toContain('Could not open the iOS share sheet. Try again.');
        expect(document.body.contains(shareButton)).toBe(true);
    });

    it('reports a PDF generation failure without opening the share modal', async () => {
        const error = new Error('Renderer failed');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mocks.createIosPdfDocument.mockRejectedValue(error);
        const share = vi.fn(() => Promise.resolve());
        setShareApi(share);

        await openIosPrintDocument(
            createApp(),
            'Failed PDF',
            document.createElement('div'),
            ''
        );

        expect(consoleError).toHaveBeenCalledWith('Could not create the iOS print PDF:', error);
        expect(getMockNotices()).toContain('Could not create the printable PDF.');
        expect(share).not.toHaveBeenCalled();
        expect(document.querySelector('button')).toBeNull();
    });
});
