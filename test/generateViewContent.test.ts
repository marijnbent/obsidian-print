import { describe, expect, it } from 'vitest';
import { generateViewContent } from '../src/utils/generateViewContent';

function createValue(text: string) {
    return {
        toString: () => text,
        isTruthy: () => text.length > 0,
        renderTo: (element: HTMLElement) => {
            element.textContent = text;
        }
    };
}

describe('generateViewContent', () => {
    it('prints complete Bases query data instead of cloning only mounted viewport rows', () => {
        const viewContainer = document.createElement('div');
        const mountedBaseRows = document.createElement('div');
        mountedBaseRows.className = 'bases-view';
        mountedBaseRows.textContent = 'Only mounted row';
        viewContainer.appendChild(mountedBaseRows);

        const firstEntry = {
            getValue: (propertyId: string) => propertyId === 'note.kk'
                ? createValue('1')
                : createValue('Visible row')
        };
        const secondEntry = {
            getValue: (propertyId: string) => propertyId === 'note.kk'
                ? createValue('2')
                : createValue('Off-screen row')
        };
        const baseView = {
            config: {
                getOrder: () => ['note.kk', 'note.ww'],
                getDisplayName: (propertyId: string) => propertyId === 'note.kk'
                    ? 'kk'
                    : 'ww'
            },
            data: {
                data: [firstEntry, secondEntry],
                groupedData: [{
                    key: createValue('test1'),
                    entries: [firstEntry, secondEntry],
                    hasKey: () => true
                }],
                properties: ['note.kk', 'note.ww']
            }
        };

        const activeView = {
            containerEl: viewContainer,
            currentView: baseView
        };

        const content = generateViewContent(activeView as never, {
            title: 'bb'
        });

        expect(content?.querySelector('h1')?.textContent).toBe('bb');
        expect(content?.querySelector('.obsidian-print-base-table')).toBeTruthy();
        expect(content?.textContent).toContain('test1');
        expect(content?.textContent).toContain('Visible row');
        expect(content?.textContent).toContain('Off-screen row');
        expect(content?.textContent).not.toContain('Only mounted row');
    });

    it('falls back to cloning rendered views when no Bases query data is available', () => {
        const viewContainer = document.createElement('div');
        const imageView = document.createElement('div');
        imageView.className = 'view-content';
        const imageElement = document.createElement('img');
        imageElement.src = 'app://local/diagram.png';
        imageView.appendChild(imageElement);
        viewContainer.appendChild(imageView);

        const content = generateViewContent({
            containerEl: viewContainer
        });

        expect(content?.querySelector('.obsidian-print-base-table')).toBeFalsy();
        expect(content?.querySelector('img')?.getAttribute('src')).toBe('app://local/diagram.png');
    });
});
