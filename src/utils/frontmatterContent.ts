import { App, TFile } from 'obsidian';

export function createFrontmatterContent(file: TFile, app: App): HTMLElement | null {
    const cachedFrontmatter: unknown = app.metadataCache.getFileCache(file)?.frontmatter;
    const frontmatter = isRecord(cachedFrontmatter) ? cachedFrontmatter : null;

    if (!frontmatter) {
        return null;
    }

    const entries = Object.entries(frontmatter)
        .filter(([key]) => key !== 'position')
        .filter(([, value]) => value !== null && value !== undefined);

    if (entries.length === 0) {
        return null;
    }

    const metadataContainer = createEl('section');
    metadataContainer.className = 'obsidian-print-frontmatter';

    const headingElement = createDiv();
    headingElement.className = 'obsidian-print-frontmatter-heading';
    headingElement.textContent = 'Properties';
    metadataContainer.appendChild(headingElement);

    const metadataProperties = createDiv();
    metadataProperties.className = 'obsidian-print-frontmatter-properties';
    metadataContainer.appendChild(metadataProperties);

    entries.forEach(([key, value]) => {
        const propertyElement = createDiv();
        propertyElement.className = 'obsidian-print-frontmatter-property';
        propertyElement.classList.add(`obsidian-print-frontmatter-property--${getFrontmatterValueKind(value)}`);

        const keyElement = createDiv();
        keyElement.className = 'obsidian-print-frontmatter-key';
        keyElement.textContent = key;

        const valueElement = createDiv();
        valueElement.className = 'obsidian-print-frontmatter-value';
        appendFrontmatterValue(valueElement, value);

        propertyElement.append(keyElement, valueElement);
        metadataProperties.appendChild(propertyElement);
    });

    return metadataContainer;
}

function appendFrontmatterValue(container: HTMLElement, value: unknown): void {
    if (typeof value === 'boolean') {
        const booleanElement = createSpan();
        booleanElement.className = 'obsidian-print-frontmatter-boolean';

        if (value) {
            booleanElement.classList.add('is-checked');
        }

        const indicatorElement = createSpan();
        indicatorElement.className = 'obsidian-print-frontmatter-boolean-indicator';
        indicatorElement.setAttribute('aria-hidden', 'true');

        const textElement = createSpan();
        textElement.className = 'obsidian-print-frontmatter-boolean-text';
        textElement.textContent = String(value);

        booleanElement.append(indicatorElement, textElement);
        container.appendChild(booleanElement);
        return;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        container.appendChild(createInlineValueElement(value));
        return;
    }

    if (Array.isArray(value)) {
        const entries = value.filter((entry) => entry !== null && entry !== undefined);

        if (entries.length === 0) {
            return;
        }

        if (entries.every(isInlineValue)) {
            const chipList = createDiv();
            chipList.className = 'obsidian-print-frontmatter-chip-list';

            entries.forEach((entry) => {
                const chipElement = createSpan();
                chipElement.className = 'obsidian-print-frontmatter-chip';
                chipElement.appendChild(createInlineValueElement(entry));
                chipList.appendChild(chipElement);
            });

            container.appendChild(chipList);
            return;
        }

        if (entries.length === 1) {
            appendFrontmatterValue(container, entries[0]);
            return;
        }

        const listElement = createEl('ul');
        listElement.className = 'obsidian-print-frontmatter-list';

        entries.forEach((entry) => {
            const listItem = createEl('li');
            appendFrontmatterValue(listItem, entry);
            listElement.appendChild(listItem);
        });

        container.appendChild(listElement);
        return;
    }

    if (isRecord(value)) {
        const entries = Object.entries(value)
            .filter(([, entry]) => entry !== null && entry !== undefined);

        if (entries.length === 0) {
            return;
        }

        const objectElement = createEl('dl');
        objectElement.className = 'obsidian-print-frontmatter-object';

        entries.forEach(([key, entry]) => {
            const rowElement = createDiv();
            rowElement.className = 'obsidian-print-frontmatter-object-row';

            const keyElement = createEl('dt');
            keyElement.className = 'obsidian-print-frontmatter-object-key';
            keyElement.textContent = key;

            const valueElement = createEl('dd');
            valueElement.className = 'obsidian-print-frontmatter-object-value';
            appendFrontmatterValue(valueElement, entry);

            rowElement.append(keyElement, valueElement);
            objectElement.appendChild(rowElement);
        });

        container.appendChild(objectElement);
        return;
    }

}

function createInlineValueElement(value: string | number | boolean): HTMLElement {
    if (typeof value === 'boolean') {
        const booleanWrapper = createSpan();
        appendFrontmatterValue(booleanWrapper, value);
        return booleanWrapper;
    }

    if (typeof value === 'string' && isExternalLink(value)) {
        const linkElement = createEl('a');
        linkElement.className = 'obsidian-print-frontmatter-link';
        linkElement.href = value;
        linkElement.textContent = value;
        return linkElement;
    }

    const textElement = createSpan();
    textElement.className = 'obsidian-print-frontmatter-text';
    textElement.textContent = String(value);
    return textElement;
}

function getFrontmatterValueKind(value: unknown): string {
    if (typeof value === 'boolean') {
        return 'boolean';
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return 'scalar';
    }

    if (Array.isArray(value)) {
        const entries = value.filter((entry) => entry !== null && entry !== undefined);
        return entries.every(isInlineValue) ? 'chip-list' : 'list';
    }

    if (value && typeof value === 'object') {
        return 'object';
    }

    return 'scalar';
}

function isInlineValue(value: unknown): value is string | number | boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExternalLink(value: string): boolean {
    return /^(https?:\/\/|mailto:)/i.test(value);
}
