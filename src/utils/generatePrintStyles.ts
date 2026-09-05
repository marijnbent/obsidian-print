import { App, Notice, PluginManifest, normalizePath } from "obsidian";
import { PrintPluginSettings } from "src/types";
import { NORMALIZED_PRINT_STYLES } from "./normalizedPrintStyles";

interface CustomCssLike {
    enabledSnippets: Set<string>;
    setCssEnabledStatus: (name: string, enabled: boolean) => void;
}

/**
 * Retrieves styles.css from plugin and the optional print.css snippet. 
 * Add font size styles from settings and return a css string.
 * 
 * @param app 
 * @param manifest 
 * @param settings 
 * @returns 
 */
export async function generatePrintStyles(app: App, manifest: PluginManifest, settings: PrintPluginSettings): Promise<string> {
    const cssSections = [
        getSizeOverrideStyles(settings),
        getHorizontalRuleStyles(settings),
        await getPluginStyles(app, manifest),
        getNormalizedPrintStyles(settings),
        getPropertiesStyles(settings),
        await getUserSnippetStyles(app)
    ];

    return cssSections
        .filter((cssText) => cssText.trim().length > 0)
        .join('\n');
}

export function setPrintSnippetEnabled(app: App, enabled: boolean): void {
    getCustomCss(app).setCssEnabledStatus('print', enabled);
}

async function getPluginStyles(app: App, manifest: PluginManifest): Promise<string> {
    if (!manifest.dir) {
        new Notice('Could not find the plugin path. No default print styles will be added.');
        return '';
    }

    try {
        return await app.vault.adapter.read(`${manifest.dir}/styles.css`);
    } catch {
        new Notice('Default styling could not be located.');
        return '';
    }
}

async function getUserSnippetStyles(app: App): Promise<string> {
    if (!isPrintSnippetEnabled(app)) {
        return '';
    }

    const path = getPrintSnippetPath(app);
    try {
        if (!await getPrintSnippet(app)) {
            new Notice(`Custom print CSS was not found: ${path}. Printing without custom CSS.`);
            return '';
        }
        return await app.vault.adapter.read(path);
    } catch {
        new Notice(`Could not read custom print CSS: ${path}. Printing without custom CSS.`);
        return '';
    }
}

function getSizeOverrideStyles(settings: PrintPluginSettings): string {
    if (!settings.normalizeStyle) {
        return '';
    }

    return `
        body { font-size: ${settings.fontSize}; }
        h1 { font-size: ${settings.h1Size}; }
        h2 { font-size: ${settings.h2Size}; }
        h3 { font-size: ${settings.h3Size}; }
        h4 { font-size: ${settings.h4Size}; }
        h5 { font-size: ${settings.h5Size}; }
        h6 { font-size: ${settings.h6Size}; }
    `;
}

function getHorizontalRuleStyles(settings: PrintPluginSettings): string {
    return `hr { break-before: ${settings.hrPageBreaks ? 'page' : 'auto'}; border-width: ${settings.hrPageBreaks ? '0' : 'revert-layer'}; }`;
}

function getNormalizedPrintStyles(settings: PrintPluginSettings): string {
    return settings.normalizeStyle
        ? NORMALIZED_PRINT_STYLES
        : '';
}

function getPropertiesStyles(settings: PrintPluginSettings): string {
    if (!settings.printFrontmatter) {
        return '';
    }

    const palette = settings.normalizeStyle
        ? {
            background: '#fcfcfd',
            border: '#d9dee8',
            heading: '#1f2937',
            key: '#5b6574',
            text: '#111827',
            objectBackground: '#f8fafc',
            objectBorder: '#e2e8f0',
            chipBackground: '#eef2ff',
            chipBorder: '#c7d2fe',
            chipText: '#3730a3',
            link: '#1d4ed8',
            booleanAccent: '#2563eb',
            separator: 'rgba(148, 163, 184, 0.24)',
            shadow: '0 1px 2px rgba(15, 23, 42, 0.06)'
        }
        : {
            background: 'var(--background-secondary, rgba(0, 0, 0, 0.03))',
            border: 'var(--background-modifier-border, rgba(0, 0, 0, 0.12))',
            heading: 'var(--text-normal, inherit)',
            key: 'var(--text-muted, rgba(0, 0, 0, 0.65))',
            text: 'var(--text-normal, inherit)',
            objectBackground: 'var(--background-primary-alt, rgba(0, 0, 0, 0.03))',
            objectBorder: 'var(--background-modifier-border, rgba(0, 0, 0, 0.12))',
            chipBackground: 'var(--tag-background, rgba(0, 0, 0, 0.06))',
            chipBorder: 'var(--tag-border-color, var(--background-modifier-border, rgba(0, 0, 0, 0.12)))',
            chipText: 'var(--tag-color, var(--text-accent, inherit))',
            link: 'var(--link-color, var(--text-accent, #2563eb))',
            booleanAccent: 'var(--interactive-accent, #7c3aed)',
            separator: 'var(--background-modifier-border-hover, rgba(0, 0, 0, 0.08))',
            shadow: 'none'
        };

    return `
        .obsidian-print-frontmatter {
            --obsidian-print-frontmatter-background: ${palette.background};
            --obsidian-print-frontmatter-border: ${palette.border};
            --obsidian-print-frontmatter-heading: ${palette.heading};
            --obsidian-print-frontmatter-key: ${palette.key};
            --obsidian-print-frontmatter-text: ${palette.text};
            --obsidian-print-frontmatter-object-background: ${palette.objectBackground};
            --obsidian-print-frontmatter-object-border: ${palette.objectBorder};
            --obsidian-print-frontmatter-chip-background: ${palette.chipBackground};
            --obsidian-print-frontmatter-chip-border: ${palette.chipBorder};
            --obsidian-print-frontmatter-chip-text: ${palette.chipText};
            --obsidian-print-frontmatter-link: ${palette.link};
            --obsidian-print-frontmatter-boolean-accent: ${palette.booleanAccent};
            --obsidian-print-frontmatter-separator: ${palette.separator};
            --obsidian-print-frontmatter-shadow: ${palette.shadow};
            display: block !important;
            margin: 0 0 0.95rem;
            padding: 0.58rem 0.72rem 0.62rem;
            border: 1px solid var(--obsidian-print-frontmatter-border);
            border-radius: ${settings.normalizeStyle ? '12px' : '10px'};
            background: var(--obsidian-print-frontmatter-background);
            box-shadow: var(--obsidian-print-frontmatter-shadow);
            color: var(--obsidian-print-frontmatter-text);
            font-size: ${settings.normalizeStyle ? '0.82rem' : '0.79rem'};
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .obsidian-print-frontmatter-heading {
            margin: 0 0 0.28rem;
            color: var(--obsidian-print-frontmatter-heading);
            font-size: ${settings.normalizeStyle ? '0.74rem' : '0.72rem'};
            font-weight: 700;
            letter-spacing: 0.01em;
            text-transform: uppercase;
            break-after: avoid;
            page-break-after: avoid;
        }
        .obsidian-print-frontmatter-properties {
            display: grid;
            gap: 0.05rem;
            break-inside: auto;
            page-break-inside: auto;
        }
        .obsidian-print-frontmatter-property {
            display: grid;
            grid-template-columns: minmax(84px, 132px) minmax(0, 1fr);
            gap: 0.5rem;
            align-items: start;
            padding: 0.16rem 0;
        }
        .obsidian-print-frontmatter-property + .obsidian-print-frontmatter-property {
            border-top: 1px solid var(--obsidian-print-frontmatter-separator);
        }
        .obsidian-print-frontmatter-key {
            color: var(--obsidian-print-frontmatter-key);
            font-size: 0.83em;
            font-weight: 600;
            line-height: 1.25;
            text-transform: none;
        }
        .obsidian-print-frontmatter-value {
            min-width: 0;
            line-height: 1.25;
        }
        .obsidian-print-frontmatter-text {
            color: var(--obsidian-print-frontmatter-text);
        }
        .obsidian-print-frontmatter-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.22rem 0.28rem;
        }
        .obsidian-print-frontmatter-chip {
            display: inline-flex;
            align-items: center;
            min-height: 1.15rem;
            padding: 0.02rem 0.34rem;
            border: 1px solid var(--obsidian-print-frontmatter-chip-border);
            border-radius: 999px;
            background: var(--obsidian-print-frontmatter-chip-background);
            color: var(--obsidian-print-frontmatter-chip-text);
            font-size: 0.8em;
            line-height: 1.1;
        }
        .obsidian-print-frontmatter-chip .obsidian-print-frontmatter-link {
            color: inherit;
        }
        .obsidian-print-frontmatter-boolean {
            display: inline-flex;
            align-items: center;
            gap: 0.28rem;
            color: var(--obsidian-print-frontmatter-text);
        }
        .obsidian-print-frontmatter-boolean-indicator {
            position: relative;
            width: 0.78rem;
            height: 0.78rem;
            flex: 0 0 0.78rem;
            border: 1.25px solid var(--obsidian-print-frontmatter-boolean-accent);
            border-radius: 0.18rem;
            background: transparent;
        }
        .obsidian-print-frontmatter-boolean.is-checked .obsidian-print-frontmatter-boolean-indicator {
            background: var(--obsidian-print-frontmatter-boolean-accent);
        }
        .obsidian-print-frontmatter-boolean.is-checked .obsidian-print-frontmatter-boolean-indicator::after {
            content: '';
            position: absolute;
            left: 0.22rem;
            top: 0.05rem;
            width: 0.14rem;
            height: 0.36rem;
            border-right: 1.5px solid #fff;
            border-bottom: 1.5px solid #fff;
            transform: rotate(45deg);
        }
        .obsidian-print-frontmatter-link {
            color: var(--obsidian-print-frontmatter-link);
            text-decoration: underline;
            text-decoration-thickness: 0.06em;
            text-underline-offset: 0.16em;
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        .obsidian-print-frontmatter-value > *:first-child,
        .obsidian-print-frontmatter-value > *:last-child {
            margin-block-start: 0;
            margin-block-end: 0;
        }
        .obsidian-print-frontmatter-list {
            margin: 0;
            padding-left: 0.88rem;
            display: grid;
            gap: 0.12rem;
        }
        .obsidian-print-frontmatter-object {
            margin: 0;
            display: grid;
            gap: 0.18rem;
            padding: 0.26rem 0.34rem;
            border: 1px solid var(--obsidian-print-frontmatter-object-border);
            border-radius: ${settings.normalizeStyle ? '10px' : '8px'};
            background: var(--obsidian-print-frontmatter-object-background);
        }
        .obsidian-print-frontmatter-object-row {
            display: grid;
            grid-template-columns: minmax(58px, 104px) minmax(0, 1fr);
            gap: 0.42rem;
            align-items: start;
        }
        .obsidian-print-frontmatter-object-key {
            color: var(--obsidian-print-frontmatter-key);
            font-size: 0.8em;
            font-weight: 600;
        }
        .obsidian-print-frontmatter-object-key,
        .obsidian-print-frontmatter-object-value {
            margin: 0;
        }
        .obsidian-print-frontmatter-property--object .obsidian-print-frontmatter-value,
        .obsidian-print-frontmatter-object-value {
            min-width: 0;
        }
    `;
}

export function getPrintSnippetPath(app: App): string {
    return normalizePath(`${app.vault.configDir}/snippets/print.css`);
}


export function isPrintSnippetEnabled(app: App): boolean {
    return getCustomCss(app).enabledSnippets.has('print');
}

export function getPrintSnippet(app: App): Promise<boolean> {
    return app.vault.adapter.exists(getPrintSnippetPath(app));
}

function getCustomCss(app: App): CustomCssLike {
    return (app as App & { customCss: CustomCssLike }).customCss;
}
