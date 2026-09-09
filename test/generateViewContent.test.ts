import { describe, expect, it, vi } from 'vitest';
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
        expect(content?.querySelector('.obsidian-print-base-summary-row')).toBeNull();
    });

    it.each([false, true])('prints configured summaries in column order (grouped: %s)', (grouped) => {
        const entries = ['Visible row', 'Off-screen row'].map((name) => ({
            getValue: () => createValue(name)
        }));
        const queryController = {};
        const getSummaryValue = vi.fn((_controller, rows, _property, summary) =>
            createValue(summary === 'Count' ? String(rows.length) : '42')
        );
        const baseView = {
            queryController,
            config: {
                groupBy: grouped ? { property: 'note.status' } : undefined,
                getOrder: () => ['file.name', 'note.price', 'note.status'],
                getDisplayName: (property: string) => property,
                getSummaryKey: (property: string) => ({ 'note.price': 'customTotal', 'note.status': 'Count' })[property]
            },
            data: {
                data: entries,
                groupedData: grouped
                    ? entries.map((entry, index) => ({
                        key: index === 0 ? {
                            toString: () => '[[Group]]',
                            renderTo: (element: HTMLElement) => { element.textContent = 'Group'; }
                        } : null,
                        entries: [entry],
                        hasKey: () => index === 0
                    }))
                    : [{ entries, hasKey: () => false }],
                getSummaryValue
            }
        };

        const content = generateViewContent({ currentView: baseView } as never)!;
        const rows = Array.from(content.querySelectorAll('tbody tr'));
        const summaries = Array.from(content.querySelectorAll('.obsidian-print-base-summary-row'));
        expect(summaries).toHaveLength(grouped ? 2 : 1);
        summaries.forEach((summary) => {
            expect(Array.from(summary.children, (cell) => cell.textContent)).toEqual([
                '', 'customTotal42', grouped ? 'Count1' : 'Count2'
            ]);
        });
        expect(getSummaryValue).toHaveBeenCalledWith(queryController, grouped ? [entries[0]] : entries, 'note.price', 'customTotal');
        if (grouped) {
            expect(rows.map((row) => row.className)).toEqual([
                'obsidian-print-base-group-row', 'obsidian-print-base-summary-row', '', 'obsidian-print-base-summary-row', ''
            ]);
            expect(getSummaryValue).toHaveBeenCalledWith(queryController, [entries[1]], 'note.status', 'Count');
            expect(rows[0].textContent).toBe('Group');
        } else {
            expect(rows[rows.length - 1]).toBe(summaries[0]);
        }
        expect(content.textContent).toContain('Off-screen row');
    });

    it('keeps table data when a summary calculation fails', () => {
        const baseView = {
            queryController: {},
            config: {
                getOrder: () => ['file.name'],
                getDisplayName: () => 'Name',
                getSummaryKey: () => 'Broken formula'
            },
            data: {
                data: [{ getValue: () => createValue('My note') }],
                getSummaryValue: () => { throw new Error('Invalid summary'); }
            }
        };

        const content = generateViewContent({ currentView: baseView } as never);
        expect(content?.textContent).toContain('My note');
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
