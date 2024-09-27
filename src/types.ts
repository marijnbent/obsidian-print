export interface PrintPluginSettings {
    printTitle: boolean;
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
}

export const DEFAULT_SETTINGS: PrintPluginSettings = {
    printTitle: true,
    fontSize: '14px',
    h1Size: '20px',
    h2Size: '18px',
    h3Size: '16px',
    h4Size: '14px',
    h5Size: '14px',
    h6Size: '12px',
    combineFolderNotes: false,
    hrPageBreaks: false,
    debugMode: false
};