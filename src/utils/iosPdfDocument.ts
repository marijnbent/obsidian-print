import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const PAGE_CONTENT_WIDTH_PX = 754;
const PAGE_CONTENT_HEIGHT_PX = 1083;
const PAGE_MARGIN_PT = 15;
const RENDER_SCALE = 1.5;
const ASSET_TIMEOUT_MS = 10000;
const POSITION_TOLERANCE_PX = 1;
const PAGE_EDGE_SAFETY_PX = 72;
const PAGE_START_SPACE_PX = 24;
const MAX_PDF_PAGES = 1000;

const AVOID_PAGE_BREAK_SELECTOR = [
    '.callout',
    '.mermaid',
    '.obsidian-print-frontmatter',
    '.obsidian-print-frontmatter-properties',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'figure',
    'svg',
    'canvas',
    'img',
    'p'
].join(',');

export interface PageBreakBlock {
    top: number;
    bottom: number;
}

interface PositionedPageBreakBlock extends PageBreakBlock {
    element: HTMLElement;
}

export interface PdfPageSlice {
    y: number;
    height: number;
}

/** Render the portable print document as bounded page images in an A4 PDF. */
export async function createIosPdfDocument(html: string): Promise<ArrayBuffer> {
    const frame = createRenderFrame();

    try {
        const frameDocument = frame.contentDocument;
        if (!frameDocument) {
            throw new Error('Could not create the PDF render document.');
        }

        writeRenderDocument(frameDocument, html);
        activatePrintStyles(frameDocument);
        await waitForDocumentAssets(frameDocument);
        await waitForLayout();

        const root = frameDocument.body;
        addPageBreakSpacers(root);
        await waitForLayout();

        const totalHeight = getDocumentHeight(root);
        const pageSlices = computePdfPageSlices(
            totalHeight,
            PAGE_CONTENT_HEIGHT_PX,
            [],
            []
        );

        return await renderPageSlices(root, pageSlices);
    } finally {
        frame.remove();
    }
}

export function computePdfPageSlices(
    totalHeight: number,
    pageHeight: number,
    forcedBreaks: number[],
    avoidBlocks: PageBreakBlock[]
): PdfPageSlice[] {
    const documentHeight = Math.max(1, Math.ceil(totalHeight));
    const safePageHeight = Math.max(1, Math.round(pageHeight));
    const sortedForcedBreaks = Array.from(new Set(
        forcedBreaks
            .map((position) => Math.round(position))
            .filter((position) => position > 0 && position < documentHeight)
    )).sort((left, right) => left - right);
    const normalizedAvoidBlocks = avoidBlocks
        .map((block) => ({
            top: Math.round(block.top),
            bottom: Math.round(block.bottom)
        }))
        .filter((block) => block.bottom > block.top)
        .sort((left, right) => left.top - right.top);
    const slices: PdfPageSlice[] = [];
    let pageStart = 0;

    while (pageStart < documentHeight) {
        const naturalPageEnd = Math.min(pageStart + safePageHeight, documentHeight);
        let pageEnd = findPageEnd(
            pageStart,
            naturalPageEnd,
            documentHeight,
            safePageHeight,
            sortedForcedBreaks,
            normalizedAvoidBlocks
        );

        if (pageEnd <= pageStart + POSITION_TOLERANCE_PX) {
            pageEnd = naturalPageEnd;
        }

        slices.push({
            y: pageStart,
            height: pageEnd - pageStart
        });
        pageStart = pageEnd;
    }

    return slices;
}

function findPageEnd(
    pageStart: number,
    naturalPageEnd: number,
    documentHeight: number,
    pageHeight: number,
    forcedBreaks: number[],
    avoidBlocks: PageBreakBlock[]
): number {
    const forcedBreak = forcedBreaks.find((position) => (
        position > pageStart + POSITION_TOLERANCE_PX
        && position < naturalPageEnd - POSITION_TOLERANCE_PX
    ));

    if (forcedBreak !== undefined) {
        return forcedBreak;
    }

    if (naturalPageEnd >= documentHeight) {
        return naturalPageEnd;
    }

    const crossingBlock = avoidBlocks.find((block) => {
        const blockHeight = block.bottom - block.top;
        return block.top > pageStart + POSITION_TOLERANCE_PX
            && block.top < naturalPageEnd - POSITION_TOLERANCE_PX
            && block.bottom > naturalPageEnd - getPageEdgeSafety(pageHeight)
            && blockHeight <= getMovableBlockHeight(pageHeight);
    });

    return crossingBlock?.top ?? naturalPageEnd;
}

function getMovableBlockHeight(pageHeight: number): number {
    return pageHeight - getPageStartSpace(pageHeight) - getPageEdgeSafety(pageHeight);
}

function getPageStartSpace(pageHeight: number): number {
    return PAGE_START_SPACE_PX * (pageHeight / PAGE_CONTENT_HEIGHT_PX);
}

function getPageEdgeSafety(pageHeight: number): number {
    return PAGE_EDGE_SAFETY_PX * (pageHeight / PAGE_CONTENT_HEIGHT_PX);
}

function createRenderFrame(): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.position = 'fixed';
    frame.style.left = '-100000px';
    frame.style.top = '0';
    frame.style.width = `${PAGE_CONTENT_WIDTH_PX}px`;
    frame.style.height = `${PAGE_CONTENT_HEIGHT_PX}px`;
    frame.style.border = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);
    return frame;
}

function writeRenderDocument(doc: Document, html: string): void {
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
    parsedDocument.querySelectorAll('script').forEach((script) => script.remove());

    const importedHtml = doc.importNode(parsedDocument.documentElement, true);
    doc.replaceChild(importedHtml, doc.documentElement);
}

function activatePrintStyles(doc: Document): void {
    const printRules: string[] = [];

    Array.from(doc.styleSheets).forEach((styleSheet) => {
        let rules: CSSRuleList;

        try {
            rules = styleSheet.cssRules;
        } catch (error) {
            return;
        }

        Array.from(rules).forEach((rule) => {
            if (rule.type !== CSSRule.MEDIA_RULE) {
                return;
            }

            const mediaRule = rule as CSSMediaRule;
            if (!/\bprint\b/i.test(mediaRule.conditionText)) {
                return;
            }

            printRules.push(...Array.from(mediaRule.cssRules, (nestedRule) => nestedRule.cssText));
        });
    });

    const captureStyles = doc.createElement('style');
    captureStyles.textContent = `
${printRules.join('\n')}
html,
body {
    width: ${PAGE_CONTENT_WIDTH_PX}px !important;
    min-width: ${PAGE_CONTENT_WIDTH_PX}px !important;
    max-width: ${PAGE_CONTENT_WIDTH_PX}px !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
}
*,
*::before,
*::after {
    animation: none !important;
    transition: none !important;
}
`;
    doc.head.appendChild(captureStyles);
}

async function waitForDocumentAssets(doc: Document): Promise<void> {
    const imagePromises = Array.from(doc.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
        }));
    const fontPromise = doc.fonts?.ready
        .then(() => undefined)
        .catch(() => undefined) ?? Promise.resolve();
    let timeoutId = 0;
    const timeout = new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, ASSET_TIMEOUT_MS);
    });

    await Promise.race([
        Promise.all([fontPromise, ...imagePromises]).then(() => undefined),
        timeout
    ]);
    window.clearTimeout(timeoutId);
}

async function waitForLayout(): Promise<void> {
    await Promise.race([
        new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => resolve());
            });
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 100))
    ]);
}

function getDocumentHeight(root: HTMLElement): number {
    return Math.max(
        root.scrollHeight,
        root.offsetHeight,
        root.ownerDocument.documentElement.scrollHeight
    );
}

export function addPageBreakSpacers(root: HTMLElement): void {
    const forcedBreakElements = Array.from(root.querySelectorAll<HTMLElement>('*'))
        .filter((element) => {
            const styles = element.ownerDocument.defaultView?.getComputedStyle(element);
            const breakBefore = styles?.breakBefore ?? '';
            const pageBreakBefore = styles?.pageBreakBefore ?? '';
            return /^(?:always|page|left|right)$/i.test(breakBefore)
                || /^(?:always|left|right)$/i.test(pageBreakBefore);
        });
    const avoidBreakElements = Array.from(
        root.querySelectorAll<HTMLElement>(AVOID_PAGE_BREAK_SELECTOR)
    );
    const handledForcedBreaks = new Set<HTMLElement>();
    let pageStart = 0;

    for (let page = 0; page < MAX_PDF_PAGES; page++) {
        const documentHeight = getDocumentHeight(root);
        const naturalPageEnd = pageStart + PAGE_CONTENT_HEIGHT_PX;

        if (naturalPageEnd >= documentHeight) {
            return;
        }

        const forcedBreaks = positionElements(
            root,
            forcedBreakElements.filter((element) => !handledForcedBreaks.has(element))
        );
        const avoidBlocks = positionElements(root, avoidBreakElements);
        const pageEnd = findPageEnd(
            pageStart,
            naturalPageEnd,
            documentHeight,
            PAGE_CONTENT_HEIGHT_PX,
            forcedBreaks.map((block) => block.top),
            avoidBlocks
        );

        if (pageEnd < naturalPageEnd - POSITION_TOLERANCE_PX) {
            const target = [...forcedBreaks, ...avoidBlocks]
                .find((block) => Math.abs(block.top - pageEnd) <= POSITION_TOLERANCE_PX);

            if (target) {
                addSpaceBeforeElement(root, target.element, naturalPageEnd);
                if (forcedBreaks.includes(target)) {
                    handledForcedBreaks.add(target.element);
                }
            }
        }

        pageStart = naturalPageEnd;
    }

    throw new Error(`The PDF is longer than ${MAX_PDF_PAGES} pages.`);
}

function positionElements(
    root: HTMLElement,
    elements: HTMLElement[]
): PositionedPageBreakBlock[] {
    const rootTop = root.getBoundingClientRect().top;

    return elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
            element,
            top: rect.top - rootTop,
            bottom: rect.bottom - rootTop
        };
    });
}

function addSpaceBeforeElement(
    root: HTMLElement,
    element: HTMLElement,
    pageEnd: number
): void {
    const rootTop = root.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top - rootTop;
    const spacer = createPageBreakSpacer(element);
    let spacerHeight = pageEnd + PAGE_START_SPACE_PX - elementTop;

    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.visibility = 'hidden';
    setSpacerHeight(spacer, spacerHeight);
    element.before(spacer);

    const movedElementTop = element.getBoundingClientRect().top - rootTop;
    if (movedElementTop < pageEnd + PAGE_START_SPACE_PX - POSITION_TOLERANCE_PX) {
        spacerHeight += pageEnd + PAGE_START_SPACE_PX - movedElementTop;
        setSpacerHeight(spacer, spacerHeight);
    }
}

function createPageBreakSpacer(element: HTMLElement): HTMLElement {
    const doc = element.ownerDocument;

    const block = doc.createElement('div');
    block.style.display = 'block';
    block.style.width = '100%';
    block.style.flex = '0 0 auto';
    return block;
}

function setSpacerHeight(spacer: HTMLElement, height: number): void {
    const cssHeight = `${Math.max(0, height)}px`;
    spacer.style.setProperty('height', cssHeight, 'important');
    spacer.style.setProperty('min-height', cssHeight, 'important');
}

async function renderPageSlices(root: HTMLElement, slices: PdfPageSlice[]): Promise<ArrayBuffer> {
    const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
        putOnlyUsedFonts: true
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth - (PAGE_MARGIN_PT * 2);
    const imageMaxHeight = pageHeight - (PAGE_MARGIN_PT * 2);

    for (let index = 0; index < slices.length; index++) {
        if (index > 0) {
            pdf.addPage('a4', 'portrait');
        }

        const slice = slices[index];
        const canvas = await html2canvas(root, {
            x: 0,
            y: slice.y,
            width: PAGE_CONTENT_WIDTH_PX,
            height: slice.height,
            scale: RENDER_SCALE,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: false,
            imageTimeout: ASSET_TIMEOUT_MS,
            logging: false,
            removeContainer: true,
            foreignObjectRendering: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: PAGE_CONTENT_WIDTH_PX,
            windowHeight: PAGE_CONTENT_HEIGHT_PX
        });

        try {
            const jpegBytes = await canvasToJpeg(canvas);
            const imageHeight = imageMaxHeight * (slice.height / PAGE_CONTENT_HEIGHT_PX);
            pdf.addImage(
                jpegBytes,
                'JPEG',
                PAGE_MARGIN_PT,
                PAGE_MARGIN_PT,
                imageWidth,
                imageHeight,
                undefined,
                'FAST'
            );
        } finally {
            canvas.width = 1;
            canvas.height = 1;
        }

        await yieldToBrowser();
    }

    return pdf.output('arraybuffer');
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
            } else {
                reject(new Error('Could not encode a PDF page.'));
            }
        }, 'image/jpeg', 0.92);
    });

    return new Uint8Array(await blob.arrayBuffer());
}

async function yieldToBrowser(): Promise<void> {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}
