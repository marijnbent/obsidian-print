import { describe, expect, it } from 'vitest';
import {
    addPageBreakSpacers,
    computePdfPageSlices
} from '../src/utils/iosPdfDocument';

describe('computePdfPageSlices', () => {
    it('divides a document into bounded pages', () => {
        expect(computePdfPageSlices(2500, 1000, [], [])).toEqual([
            { y: 0, height: 1000 },
            { y: 1000, height: 1000 },
            { y: 2000, height: 500 }
        ]);
    });

    it('starts a new page at an explicit page break', () => {
        expect(computePdfPageSlices(1800, 1000, [600], [])).toEqual([
            { y: 0, height: 600 },
            { y: 600, height: 1000 },
            { y: 1600, height: 200 }
        ]);
    });

    it('moves a fitting block that would cross the page edge', () => {
        expect(computePdfPageSlices(1800, 1000, [], [{
            top: 850,
            bottom: 1150
        }])).toEqual([
            { y: 0, height: 850 },
            { y: 850, height: 950 }
        ]);
    });

    it('keeps a small safety area below blocks near the page edge', () => {
        expect(computePdfPageSlices(1500, 1000, [], [{
            top: 900,
            bottom: 940
        }])).toEqual([
            { y: 0, height: 900 },
            { y: 900, height: 600 }
        ]);
    });

    it('splits a block that is taller than one page', () => {
        expect(computePdfPageSlices(2200, 1000, [], [{
            top: 100,
            bottom: 2100
        }])).toEqual([
            { y: 0, height: 1000 },
            { y: 1000, height: 1000 },
            { y: 2000, height: 200 }
        ]);
    });

    it('splits a near-page-height block that cannot fit with safe page space', () => {
        expect(computePdfPageSlices(1600, 1000, [], [{
            top: 100,
            bottom: 1020
        }])).toEqual([
            { y: 0, height: 1000 },
            { y: 1000, height: 600 }
        ]);
    });
});

describe('addPageBreakSpacers', () => {
    it('does not keep moving a near-page-height block', () => {
        const root = document.createElement('div');
        const intro = document.createElement('p');
        const callout = document.createElement('div');
        const footer = document.createElement('p');
        callout.className = 'callout';
        root.append(intro, callout, footer);
        document.body.append(root);

        const getTop = (element: Element): number => {
            let top = 0;
            let current = element.previousElementSibling;
            while (current) {
                top += Number((current as HTMLElement).dataset.testHeight ?? 0);
                current = current.previousElementSibling;
            }
            return top;
        };
        root.dataset.testHeight = '1200';
        intro.dataset.testHeight = '100';
        callout.dataset.testHeight = '1000';
        footer.dataset.testHeight = '100';
        Object.defineProperty(root, 'scrollHeight', { get: () => 1200 });
        Object.defineProperty(root, 'offsetHeight', { get: () => 1200 });
        Object.defineProperty(document.documentElement, 'scrollHeight', { get: () => 1200 });
        root.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
        [intro, callout, footer].forEach((element) => {
            element.getBoundingClientRect = () => {
                const top = getTop(element);
                const height = Number(element.dataset.testHeight);
                return { top, bottom: top + height } as DOMRect;
            };
        });

        expect(() => addPageBreakSpacers(root)).not.toThrow();
        expect(root.children).toHaveLength(3);
    });
});
