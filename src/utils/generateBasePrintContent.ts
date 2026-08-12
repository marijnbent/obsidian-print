import type { BasesPropertyId, RenderContext, Value } from 'obsidian';

interface BaseEntryLike {
    file?: {
        basename?: string;
        path?: string;
    };
    getValue?: (propertyId: BasesPropertyId) => Value | null;
}

interface BaseEntryGroupLike {
    key?: Value | null;
    entries?: BaseEntryLike[];
    hasKey?: () => boolean;
}

interface BaseQueryResultLike {
    data?: BaseEntryLike[];
    groupedData?: BaseEntryGroupLike[];
    properties?: BasesPropertyId[];
}

interface BaseViewConfigLike {
    getOrder?: () => BasesPropertyId[];
    getDisplayName?: (propertyId: BasesPropertyId) => string;
}

interface BaseDataViewLike {
    config?: BaseViewConfigLike;
    data?: BaseQueryResultLike;
}

interface GenerateBasePrintContentOptions {
    leadingElements?: HTMLElement[];
    title?: string;
}

const MAX_BASE_VIEW_SEARCH_DEPTH = 5;
const MAX_BASE_VIEW_SEARCH_PROPERTIES = 80;
const SKIPPED_BASE_VIEW_SEARCH_KEYS = new Set([
    'app',
    'containerEl',
    'contentEl',
    'ownerDocument',
    'parentElement',
    'parentNode'
]);

export function generateBasePrintContent(
    view: unknown,
    options: GenerateBasePrintContentOptions = {}
): HTMLElement | null {
    const baseView = findBaseDataView(view);
    if (!baseView) {
        return null;
    }

    const properties = getBaseProperties(baseView);
    const groups = getBaseEntryGroups(baseView);
    if (properties.length === 0 || groups.every((group) => group.entries.length === 0)) {
        return null;
    }

    const content = createDiv();

    options.leadingElements?.forEach((element) => {
        content.appendChild(element);
    });

    if (options.title) {
        content.createEl('h1', { text: options.title });
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'obsidian-print-note obsidian-print-view obsidian-print-base-view';
    wrapper.appendChild(createBaseTable(baseView, properties, groups));
    content.appendChild(wrapper);

    return content;
}

function findBaseDataView(value: unknown, seen = new WeakSet<object>(), depth = 0): BaseDataViewLike | null {
    if (!isSearchableObject(value) || seen.has(value) || depth > MAX_BASE_VIEW_SEARCH_DEPTH) {
        return null;
    }

    seen.add(value);

    if (isBaseDataView(value)) {
        return value;
    }

    const propertyNames = getSearchablePropertyNames(value);
    for (const propertyName of propertyNames) {
        if (SKIPPED_BASE_VIEW_SEARCH_KEYS.has(propertyName)) {
            continue;
        }

        const nestedValue = getObjectProperty(value, propertyName);
        const match = findBaseDataView(nestedValue, seen, depth + 1);
        if (match) {
            return match;
        }
    }

    return null;
}

function isBaseDataView(value: object): value is BaseDataViewLike {
    const data = getObjectProperty(value, 'data') as BaseQueryResultLike | undefined;
    const config = getObjectProperty(value, 'config') as BaseViewConfigLike | undefined;
    if (!data || !config) {
        return false;
    }

    const entries = getObjectProperty(data, 'data');
    const groupedData = getObjectProperty(data, 'groupedData');
    const properties = getObjectProperty(data, 'properties');

    return typeof config.getOrder === 'function'
        && typeof config.getDisplayName === 'function'
        && (Array.isArray(entries) || Array.isArray(groupedData))
        && (Array.isArray(properties) || Array.isArray(safeCall(config.getOrder, config)));
}

function getBaseProperties(baseView: BaseDataViewLike): BasesPropertyId[] {
    const configuredOrder = safeCall(baseView.config?.getOrder, baseView.config);
    if (Array.isArray(configuredOrder) && configuredOrder.length > 0) {
        return configuredOrder;
    }

    const queryProperties = getObjectProperty(baseView.data, 'properties');
    if (Array.isArray(queryProperties)) {
        return queryProperties;
    }

    return [];
}

function getBaseEntryGroups(baseView: BaseDataViewLike): Array<{ key: Value | null; entries: BaseEntryLike[]; hasKey: boolean }> {
    const groupedData = getObjectProperty(baseView.data, 'groupedData');
    if (Array.isArray(groupedData) && groupedData.length > 0) {
        return groupedData.map((group) => ({
            key: group.key ?? null,
            entries: Array.isArray(group.entries) ? group.entries : [],
            hasKey: hasBaseGroupKey(group)
        }));
    }

    const entries = getObjectProperty(baseView.data, 'data');
    return [{
        key: null,
        entries: Array.isArray(entries) ? entries : [],
        hasKey: false
    }];
}

function createBaseTable(
    baseView: BaseDataViewLike,
    properties: BasesPropertyId[],
    groups: Array<{ key: Value | null; entries: BaseEntryLike[]; hasKey: boolean }>
): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'obsidian-print-base-table';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    properties.forEach((propertyId) => {
        const headerCell = document.createElement('th');
        headerCell.textContent = getBasePropertyDisplayName(baseView, propertyId);
        headerRow.appendChild(headerCell);
    });

    const tbody = table.createTBody();
    groups.forEach((group) => {
        if (group.hasKey) {
            const groupRow = tbody.insertRow();
            groupRow.className = 'obsidian-print-base-group-row';
            const groupCell = document.createElement('th');
            groupCell.colSpan = properties.length;
            groupCell.textContent = getValueText(group.key);
            groupRow.appendChild(groupCell);
        }

        group.entries.forEach((entry) => {
            const row = tbody.insertRow();
            properties.forEach((propertyId) => {
                const cell = row.insertCell();
                renderBaseEntryValue(cell, entry, propertyId);
            });
        });
    });

    return table;
}

function renderBaseEntryValue(cell: HTMLTableCellElement, entry: BaseEntryLike, propertyId: BasesPropertyId): void {
    const value = safeCall(entry.getValue, entry, propertyId);
    if (!value) {
        renderFallbackFileValue(cell, entry, propertyId);
        return;
    }

    if (typeof value.renderTo === 'function') {
        try {
            value.renderTo(cell, { hoverPopover: null } as RenderContext);
            if (cell.childNodes.length > 0) {
                return;
            }
        } catch (error) {
            cell.textContent = '';
        }
    }

    cell.textContent = getValueText(value);
}

function renderFallbackFileValue(cell: HTMLTableCellElement, entry: BaseEntryLike, propertyId: BasesPropertyId): void {
    if (propertyId === 'file.name' && entry.file?.basename) {
        cell.textContent = entry.file.basename;
        return;
    }

    if (propertyId === 'file.path' && entry.file?.path) {
        cell.textContent = entry.file.path;
    }
}

function getBasePropertyDisplayName(baseView: BaseDataViewLike, propertyId: BasesPropertyId): string {
    const displayName = safeCall(baseView.config?.getDisplayName, baseView.config, propertyId);
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
        return displayName;
    }

    return propertyId.replace(/^(?:note|file|formula)\./, '');
}

function hasBaseGroupKey(group: BaseEntryGroupLike): boolean {
    const hasKey = safeCall(group.hasKey, group);
    if (typeof hasKey === 'boolean') {
        return hasKey;
    }

    return Boolean(group.key && getValueText(group.key).trim().length > 0);
}

function getValueText(value: Value | null | undefined): string {
    if (!value) {
        return '';
    }

    try {
        return value.toString();
    } catch (error) {
        return '';
    }
}

function getSearchablePropertyNames(value: object): string[] {
    return Object.getOwnPropertyNames(value).slice(0, MAX_BASE_VIEW_SEARCH_PROPERTIES);
}

function isSearchableObject(value: unknown): value is object {
    return typeof value === 'object'
        && value !== null
        && !(value instanceof Node);
}

function getObjectProperty(value: unknown, propertyName: string): unknown {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
        return undefined;
    }

    try {
        return (value as Record<string, unknown>)[propertyName];
    } catch (error) {
        return undefined;
    }
}

function safeCall<TArgs extends unknown[], TResult>(
    callback: ((...args: TArgs) => TResult) | undefined,
    thisArg: unknown,
    ...args: TArgs
): TResult | undefined {
    if (typeof callback !== 'function') {
        return undefined;
    }

    try {
        return callback.apply(thisArg, args);
    } catch (error) {
        return undefined;
    }
}
