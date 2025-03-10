export interface PrintPluginSettings {
    printTitle: boolean;
    fontSize: string;
    inlineTitleSize: string;
    h1Size: string;
    h2Size: string;
    h3Size: string;
    h4Size: string;
    h5Size: string;
    h6Size: string;
    inlineTitleColor: string;
    h1Color: string;
    h2Color: string;
    h3Color: string;
    h4Color: string;
    h5Color: string;
    h6Color: string;
    hasInitializedColors: boolean;
    hasInitializedSizes: boolean;
    combineFolderNotes: boolean;
    hrPageBreaks: boolean;
    showMetadata: boolean;
    useModal: boolean;
    debugMode: boolean;
    usePreview: boolean;
    useBrowserPrint: boolean;
}

export const DEFAULT_SETTINGS: PrintPluginSettings = {
    printTitle: true,
    fontSize: '12px',
    h6Size: '14px',
    h5Size: '16px',
    h4Size: '18px',
    h3Size: '20px',
    h2Size: '22px',
    h1Size: '24px',
    inlineTitleSize: '26px',
    inlineTitleColor: 'black',
    h1Color: 'black',
    h2Color: 'black',
    h3Color: 'black',
    h4Color: 'black',
    h5Color: 'black',
    h6Color: 'black',
    hasInitializedColors: false,
    hasInitializedSizes: false,
    combineFolderNotes: false,
    hrPageBreaks: false,
    showMetadata: false,
    useModal: true,
    debugMode: false,
    usePreview: true,
    useBrowserPrint: true,
};