export interface PrintPluginSettings {
    printTitle: boolean;
    directPrint: boolean;
    fontSize: string;
    h1Size: string;
    h2Size: string;
    h3Size: string;
    h4Size: string;
    h5Size: string;
    h6Size: string;
    debugMode: boolean;
    customCSS: string;
}

export const DEFAULT_SETTINGS: PrintPluginSettings = {
    printTitle: true,
    directPrint: false,
    fontSize: '14px',
    h1Size: '20px',
    h2Size: '18px',
    h3Size: '16px',
    h4Size: '14px',
    h5Size: '14px',
    h6Size: '12px',
    debugMode: false,
    customCSS: ''
};