import { syncPrintableCloneState } from './syncPrintableClone';

const TARGET_SELECTOR_PATTERNS = [
    /mjx-/i,
    /mathjax/i,
    /mermaid/i,
    /(^|[^a-z-])pre([^a-z-]|$)/i,
    /(^|[^a-z-])code([^a-z-]|$)/i,
    /(^|[^a-z-])callout([^a-z-]|$)/i,
    /data-callout/i,
    /callout-title/i,
    /callout-content/i,
    /callout-icon/i,
    /callout-fold/i,
    /\.token\b/i,
    /language-/i
];

const CSS_VARIABLE_PATTERN = /var\((--[\w-]+)/g;
const MATCH_ROOT_ATTRIBUTE = 'data-obsidian-print-match-root';
const THEME_CLASS_PATTERN = /\btheme-(?:dark|light)\b/g;
const LIGHT_THEME_CLASS = 'theme-light';

interface SelectorMatchContext {
    structuralMarkers: Set<string>;
    document: Document | null;
}

export function getTargetedRuntimePrintCss(rootElement?: ParentNode): string {
    const collectedRules: string[] = [];
    const seenRules = new Set<string>();
    const usedVariables = new Set<string>();
    const selectorMatchContext = createSelectorMatchContext(rootElement);

    Array.from(document.styleSheets).forEach((sheet) => {
        collectStyleSheetRules(
            sheet,
            collectedRules,
            seenRules,
            usedVariables,
            rootElement,
            selectorMatchContext
        );
    });

    const variableCss = buildVariableCss(usedVariables);

    return [variableCss, ...collectedRules]
        .filter((cssText) => cssText.trim().length > 0)
        .join('\n');
}

export function applyRuntimePrintClasses(doc: Document, includeAppClasses = true): void {
    doc.documentElement.className = includeAppClasses
        ? toLightThemeClassName(document.documentElement.className)
        : '';

    applyRuntimePrintClassesToElement(doc.body, includeAppClasses);
}

export function createStandalonePrintHtml(
    content: HTMLElement,
    cssText: string,
    title = 'Print note',
    bodyClasses: string[] = [],
    includeAppClasses = true
): string {
    const htmlElement = document.createElement('html');
    htmlElement.className = includeAppClasses
        ? toLightThemeClassName(document.documentElement.className)
        : '';

    const headElement = document.createElement('head');
    const metaElement = document.createElement('meta');
    metaElement.setAttribute('charset', 'utf-8');
    headElement.appendChild(metaElement);

    const viewportElement = document.createElement('meta');
    viewportElement.setAttribute('name', 'viewport');
    viewportElement.setAttribute('content', 'width=device-width, initial-scale=1');
    headElement.appendChild(viewportElement);

    const titleElement = document.createElement('title');
    titleElement.textContent = title;
    headElement.appendChild(titleElement);

    const styleElement = document.createElement('style');
    styleElement.textContent = cssText;
    headElement.appendChild(styleElement);

    htmlElement.appendChild(headElement);

    const bodyElement = document.createElement('body');
    applyRuntimePrintClassesToElement(bodyElement, includeAppClasses);
    if (bodyClasses.length > 0) {
        bodyElement.classList.add(...bodyClasses);
    }
    const clonedContent = content.cloneNode(true) as HTMLElement;
    syncPrintableCloneState(content, clonedContent);
    bodyElement.appendChild(clonedContent);

    htmlElement.appendChild(bodyElement);

    return `<!DOCTYPE html>${htmlElement.outerHTML}`;
}

function collectStyleSheetRules(
    sheet: StyleSheet,
    collectedRules: string[],
    seenRules: Set<string>,
    usedVariables: Set<string>,
    rootElement?: ParentNode,
    selectorMatchContext?: SelectorMatchContext
): void {
    const cssSheet = sheet as CSSStyleSheet;
    let rules: CSSRuleList;

    try {
        rules = cssSheet.cssRules;
    } catch (error) {
        return;
    }

    collectRuleList(
        rules,
        collectedRules,
        seenRules,
        usedVariables,
        rootElement,
        selectorMatchContext
    );
}

function collectRuleList(
    rules: CSSRuleList,
    collectedRules: string[],
    seenRules: Set<string>,
    usedVariables: Set<string>,
    rootElement?: ParentNode,
    selectorMatchContext?: SelectorMatchContext
): void {
    Array.from(rules).forEach((rule) => {
        if (rule.type === CSSRule.STYLE_RULE) {
            const styleRule = rule as CSSStyleRule;
            if (!matchesTargetSelector(styleRule.selectorText, rootElement, selectorMatchContext)) {
                return;
            }

            addRuleText(styleRule.cssText, collectedRules, seenRules);
            collectVariables(styleRule.cssText, usedVariables);
            return;
        }

        if (rule.type === CSSRule.MEDIA_RULE) {
            const mediaRule = rule as CSSMediaRule;
            const nestedRules: string[] = [];

            collectRuleList(
                mediaRule.cssRules,
                nestedRules,
                seenRules,
                usedVariables,
                rootElement,
                selectorMatchContext
            );

            if (nestedRules.length > 0) {
                addRuleText(
                    `@media ${mediaRule.conditionText} {\n${nestedRules.join('\n')}\n}`,
                    collectedRules,
                    seenRules
                );
            }
            return;
        }

        if (rule.type === CSSRule.IMPORT_RULE) {
            const importRule = rule as CSSImportRule;
            if (importRule.styleSheet) {
                collectStyleSheetRules(
                    importRule.styleSheet,
                    collectedRules,
                    seenRules,
                    usedVariables,
                    rootElement,
                    selectorMatchContext
                );
            }
        }
    });
}

function matchesTargetSelector(
    selectorText: string,
    rootElement?: ParentNode,
    selectorMatchContext?: SelectorMatchContext
): boolean {
    return TARGET_SELECTOR_PATTERNS.some((pattern) => pattern.test(selectorText))
        || selectorMatchesContent(selectorText, rootElement, selectorMatchContext);
}

function selectorMatchesContent(
    selectorText: string,
    rootElement?: ParentNode,
    selectorMatchContext?: SelectorMatchContext
): boolean {
    if (!rootElement) {
        return false;
    }

    if (querySelectorAgainstRoot(selectorText, rootElement)) {
        return true;
    }

    const normalizedSelector = selectorText.replace(/::[\w-]+/g, '');

    if (normalizedSelector !== selectorText) {
        if (querySelectorAgainstRoot(normalizedSelector, rootElement)) {
            return true;
        }
    }

    return querySelectorAgainstDocument(
        normalizedSelector !== selectorText ? normalizedSelector : selectorText,
        selectorMatchContext
    );
}

function querySelectorAgainstRoot(selectorText: string, rootElement: ParentNode): boolean {
    try {
        const elementRoot = rootElement as Element;

        if ('matches' in elementRoot && typeof elementRoot.matches === 'function' && elementRoot.matches(selectorText)) {
            return true;
        }

        return Boolean(rootElement.querySelector(selectorText));
    } catch (error) {
        return false;
    }
}

function createSelectorMatchContext(rootElement?: ParentNode): SelectorMatchContext {
    const elementRoot = rootElement as Element | undefined;

    if (!elementRoot || typeof elementRoot.cloneNode !== 'function') {
        return {
            structuralMarkers: new Set<string>(),
            document: null
        };
    }

    const selectorMatchDocument = document.implementation.createHTMLDocument('Obsidian Print Selector Match');
    selectorMatchDocument.documentElement.className = toLightThemeClassName(document.documentElement.className);
    selectorMatchDocument.body.className = toLightThemeClassName(document.body.className);

    const clonedRoot = elementRoot.cloneNode(true) as HTMLElement;
    clonedRoot.setAttribute(MATCH_ROOT_ATTRIBUTE, '');
    selectorMatchDocument.body.appendChild(clonedRoot);

    return {
        structuralMarkers: collectStructuralMarkers(clonedRoot),
        document: selectorMatchDocument
    };
}

function querySelectorAgainstDocument(
    selectorText: string,
    selectorMatchContext?: SelectorMatchContext
): boolean {
    if (!selectorMatchContext?.document) {
        return false;
    }

    if (!selectorContainsStructuralMarker(selectorText, selectorMatchContext.structuralMarkers)) {
        return false;
    }

    try {
        const match = selectorMatchContext.document.querySelector(selectorText);

        if (!match) {
            return false;
        }

        return Boolean(match.closest(`[${MATCH_ROOT_ATTRIBUTE}]`));
    } catch (error) {
        return false;
    }
}

function collectStructuralMarkers(rootElement: Element): Set<string> {
    const markers = new Set<string>();
    const elements = [rootElement, ...Array.from(rootElement.querySelectorAll('*'))];

    elements.forEach((element) => {
        element.classList.forEach((className) => {
            markers.add(`.${className}`);
        });

        if (element.id) {
            markers.add(`#${element.id}`);
        }
    });

    return markers;
}

function selectorContainsStructuralMarker(selectorText: string, structuralMarkers: Set<string>): boolean {
    if (structuralMarkers.size === 0) {
        return false;
    }

    for (const marker of structuralMarkers) {
        if (selectorText.includes(marker)) {
            return true;
        }
    }

    return false;
}

function collectVariables(cssText: string, usedVariables: Set<string>): void {
    let match = CSS_VARIABLE_PATTERN.exec(cssText);

    while (match) {
        usedVariables.add(match[1]);
        match = CSS_VARIABLE_PATTERN.exec(cssText);
    }

    CSS_VARIABLE_PATTERN.lastIndex = 0;
}

function buildVariableCss(usedVariables: Set<string>): string {
    if (usedVariables.size === 0) {
        return '';
    }

    const resolvedVariables: string[] = [];

    withLightThemeClasses(() => {
        const computedRoots = [
            getComputedStyle(document.documentElement),
            getComputedStyle(document.body)
        ];

        Array.from(usedVariables).forEach((variableName) => {
            for (const styles of computedRoots) {
                const value = styles.getPropertyValue(variableName).trim();

                if (!value) {
                    continue;
                }

                resolvedVariables.push(`    ${variableName}: ${value};`);
                break;
            }
        });
    });

    if (resolvedVariables.length === 0) {
        return '';
    }

    return `:root {\n${resolvedVariables.join('\n')}\n}`;
}

function withLightThemeClasses<T>(callback: () => T): T {
    const previousHtmlClassName = document.documentElement.className;
    const previousBodyClassName = document.body.className;

    document.documentElement.className = toLightThemeClassName(previousHtmlClassName);
    document.body.className = toLightThemeClassName(previousBodyClassName);

    try {
        return callback();
    } finally {
        document.documentElement.className = previousHtmlClassName;
        document.body.className = previousBodyClassName;
    }
}

function addRuleText(cssText: string, collectedRules: string[], seenRules: Set<string>): void {
    if (seenRules.has(cssText)) {
        return;
    }

    seenRules.add(cssText);
    collectedRules.push(cssText);
}

function applyRuntimePrintClassesToElement(bodyElement: HTMLElement, includeAppClasses = true): void {
    const classNames = [
        'obsidian-print',
        includeAppClasses ? toLightThemeClassName(document.body.className) : ''
    ]
        .join(' ')
        .split(/\s+/)
        .filter(Boolean);

    bodyElement.className = Array.from(new Set(classNames)).join(' ');
}

function toLightThemeClassName(className: string): string {
    const normalized = className.replace(THEME_CLASS_PATTERN, '').trim();
    const classNames = [normalized, LIGHT_THEME_CLASS]
        .join(' ')
        .split(/\s+/)
        .filter(Boolean);

    return Array.from(new Set(classNames)).join(' ');
}
