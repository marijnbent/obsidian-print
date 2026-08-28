type BasePropertyId = string;

interface BaseValueLike {
    renderTo?: (container: HTMLElement, context: { hoverPopover: null }) => void;
    toString: () => string;
}

interface BaseEntryLike {
    file?: {
        basename?: string;
        path?: string;
    };
    getValue?: (propertyId: BasePropertyId) => BaseValueLike | null;
}

interface BaseEntryGroupLike {
    key?: BaseValueLike | null;
    entries?: BaseEntryLike[];
    hasKey?: () => boolean;
}

interface BaseQueryResultLike {
    data?: BaseEntryLike[];
    groupedData?: BaseEntryGroupLike[];
    properties?: BasePropertyId[];
}

interface BaseViewConfigLike {
    getOrder?: () => BasePropertyId[];
    getDisplayName?: (propertyId: BasePropertyId) => string;
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

    const wrapper = createDiv();
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
    const data = getObjectProperty(value, 'data');
    const config = getObjectProperty(value, 'config');
    if (!isRecord(data) || !isRecord(config)) {
        return false;
    }

    const entries = getObjectProperty(data, 'data');
    const groupedData = getObjectProperty(data, 'groupedData');
    const properties = getObjectProperty(data, 'properties');

    const configuredOrder = safeCall(
        getFunctionProperty(config, 'getOrder'),
        config
    );

    return typeof getObjectProperty(config, 'getOrder') === 'function'
        && typeof getObjectProperty(config, 'getDisplayName') === 'function'
        && (Array.isArray(entries) || Array.isArray(groupedData))
        && (Array.isArray(properties) || Array.isArray(configuredOrder));
}

function getBaseProperties(baseView: BaseDataViewLike): BasePropertyId[] {
    const configuredOrder = safeCall(baseView.config?.getOrder, baseView.config);
    if (Array.isArray(configuredOrder) && configuredOrder.length > 0) {
        return configuredOrder;
    }

    const queryProperties = getObjectProperty(baseView.data, 'properties');
    if (Array.isArray(queryProperties)) {
        return queryProperties.filter((value): value is string => typeof value === 'string');
    }

    return [];
}

function getBaseEntryGroups(baseView: BaseDataViewLike): Array<{ key: BaseValueLike | null; entries: BaseEntryLike[]; hasKey: boolean }> {
    const groupedData = getObjectProperty(baseView.data, 'groupedData');
    if (Array.isArray(groupedData) && groupedData.length > 0) {
        return groupedData.filter(isBaseEntryGroupLike).map((group) => ({
            key: group.key ?? null,
            entries: Array.isArray(group.entries) ? group.entries.filter(isBaseEntryLike) : [],
            hasKey: hasBaseGroupKey(group)
        }));
    }

    const entries = getObjectProperty(baseView.data, 'data');
    return [{
        key: null,
        entries: Array.isArray(entries) ? entries.filter(isBaseEntryLike) : [],
        hasKey: false
    }];
}

function createBaseTable(
    baseView: BaseDataViewLike,
    properties: BasePropertyId[],
    groups: Array<{ key: BaseValueLike | null; entries: BaseEntryLike[]; hasKey: boolean }>
): HTMLTableElement {
    const table = createEl('table');
    table.className = 'obsidian-print-base-table';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    properties.forEach((propertyId) => {
        const headerCell = createEl('th');
        headerCell.textContent = getBasePropertyDisplayName(baseView, propertyId);
        headerRow.appendChild(headerCell);
    });

    const tbody = table.createTBody();
    groups.forEach((group) => {
        if (group.hasKey) {
            const groupRow = tbody.insertRow();
            groupRow.className = 'obsidian-print-base-group-row';
            const groupCell = createEl('th');
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

function renderBaseEntryValue(cell: HTMLTableCellElement, entry: BaseEntryLike, propertyId: BasePropertyId): void {
    const value = safeCall(entry.getValue, entry, propertyId);
    if (!value) {
        renderFallbackFileValue(cell, entry, propertyId);
        return;
    }

    if (typeof value.renderTo === 'function') {
        try {
            value.renderTo(cell, { hoverPopover: null });
            if (cell.childNodes.length > 0) {
                return;
            }
        } catch {
            cell.textContent = '';
        }
    }

    cell.textContent = getValueText(value);
}

function renderFallbackFileValue(cell: HTMLTableCellElement, entry: BaseEntryLike, propertyId: BasePropertyId): void {
    if (propertyId === 'file.name' && entry.file?.basename) {
        cell.textContent = entry.file.basename;
        return;
    }

    if (propertyId === 'file.path' && entry.file?.path) {
        cell.textContent = entry.file.path;
    }
}

function getBasePropertyDisplayName(baseView: BaseDataViewLike, propertyId: BasePropertyId): string {
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

function getValueText(value: BaseValueLike | null | undefined): string {
    if (!value) {
        return '';
    }

    try {
        return value.toString();
    } catch {
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
    } catch {
        return undefined;
    }
}

function getFunctionProperty(value: unknown, propertyName: string): (() => unknown) | undefined {
    const property = getObjectProperty(value, propertyName);
    return typeof property === 'function' ? property as () => unknown : undefined;
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
    } catch {
        return undefined;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isBaseEntryLike(value: unknown): value is BaseEntryLike {
    if (!isRecord(value)) {
        return false;
    }

    const getValue = getObjectProperty(value, 'getValue');
    return getValue === undefined || typeof getValue === 'function';
}

function isBaseEntryGroupLike(value: unknown): value is BaseEntryGroupLike {
    if (!isRecord(value)) {
        return false;
    }

    const key = getObjectProperty(value, 'key');
    const entries = getObjectProperty(value, 'entries');
    const hasKey = getObjectProperty(value, 'hasKey');

    return (key === undefined || key === null || isBaseValueLike(key))
        && (entries === undefined || Array.isArray(entries))
        && (hasKey === undefined || typeof hasKey === 'function');
}

function isBaseValueLike(value: unknown): value is BaseValueLike {
    return isRecord(value) && typeof getObjectProperty(value, 'toString') === 'function';
}
