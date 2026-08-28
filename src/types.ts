export interface PrintPluginSettings {
    printTitle: boolean;
    printFrontmatter: boolean;
    fontSize: string;
    h1Size: string;
    h2Size: string;
    h3Size: string;
    h4Size: string;
    h5Size: string;
    h6Size: string;
    combineFolderNotes: boolean;
    hrPageBreaks: boolean;
    debugMode: boolean;
    inheritNoteCssClasses: boolean;
    normalizeStyle: boolean;
}

export const DEFAULT_SETTINGS: PrintPluginSettings = {
    printTitle: true,
    printFrontmatter: false,
    fontSize: '14px',
    h1Size: '20px',
    h2Size: '18px',
    h3Size: '16px',
    h4Size: '14px',
    h5Size: '14px',
    h6Size: '12px',
    combineFolderNotes: false,
    hrPageBreaks: false,
    debugMode: false,
    inheritNoteCssClasses: false,
    normalizeStyle: false
};

export function loadPrintPluginSettings(data: unknown): PrintPluginSettings {
    const stored = isRecord(data) ? data : {};

    return {
        printTitle: getBoolean(stored, 'printTitle', DEFAULT_SETTINGS.printTitle),
        printFrontmatter: getBoolean(stored, 'printFrontmatter', DEFAULT_SETTINGS.printFrontmatter),
        fontSize: getString(stored, 'fontSize', DEFAULT_SETTINGS.fontSize),
        h1Size: getString(stored, 'h1Size', DEFAULT_SETTINGS.h1Size),
        h2Size: getString(stored, 'h2Size', DEFAULT_SETTINGS.h2Size),
        h3Size: getString(stored, 'h3Size', DEFAULT_SETTINGS.h3Size),
        h4Size: getString(stored, 'h4Size', DEFAULT_SETTINGS.h4Size),
        h5Size: getString(stored, 'h5Size', DEFAULT_SETTINGS.h5Size),
        h6Size: getString(stored, 'h6Size', DEFAULT_SETTINGS.h6Size),
        combineFolderNotes: getBoolean(stored, 'combineFolderNotes', DEFAULT_SETTINGS.combineFolderNotes),
        hrPageBreaks: getBoolean(stored, 'hrPageBreaks', DEFAULT_SETTINGS.hrPageBreaks),
        debugMode: getBoolean(stored, 'debugMode', DEFAULT_SETTINGS.debugMode),
        inheritNoteCssClasses: getBoolean(
            stored,
            'inheritNoteCssClasses',
            getBoolean(stored, 'extraClasses', DEFAULT_SETTINGS.inheritNoteCssClasses)
        ),
        normalizeStyle: getBoolean(stored, 'normalizeStyle', DEFAULT_SETTINGS.normalizeStyle)
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
    return typeof record[key] === 'boolean' ? record[key] : fallback;
}

function getString(record: Record<string, unknown>, key: string, fallback: string): string {
    return typeof record[key] === 'string' ? record[key] : fallback;
}
