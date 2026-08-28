import { App, Platform } from 'obsidian';
import { PrintPluginSettings } from '../types';
import {
    createStandalonePrintHtml,
    getTargetedRuntimePrintCss
} from './runtimePrintStyles';
import { openDebugPrintPreview } from './printEnvironment';
import { openAndroidPrintDocument } from './androidPrintDocument';
import { openIosPrintDocument } from './iosPrintDocument';
import { openDesktopPrintDocument } from './desktopPrintDocument';

/** Print prepared content through the platform-specific print flow. */
export async function openPrintModal(
    app: App,
    title: string,
    content: HTMLElement,
    settings: PrintPluginSettings,
    cssString: string,
    bodyClasses: string[] = []
): Promise<void> {
    const includeThemeStyles = !settings.normalizeStyle;
    const runtimeCss = includeThemeStyles
        ? getTargetedRuntimePrintCss(content)
        : '';
    const combinedCssString = [cssString, runtimeCss]
        .filter((value) => value.trim().length > 0)
        .join('\n');
    if (settings.debugMode) {
        const debugContent = createStandalonePrintHtml(
            content,
            combinedCssString,
            title,
            bodyClasses,
            includeThemeStyles
        );

        openDebugPrintPreview({ html: debugContent });
    }

    if (Platform.isAndroidApp) {
        await openAndroidPrintDocument(
            app,
            title,
            content,
            combinedCssString,
            bodyClasses,
            includeThemeStyles
        );
        return;
    }

    if (Platform.isIosApp) {
        await openIosPrintDocument(
            app,
            title,
            content,
            combinedCssString,
            bodyClasses,
            includeThemeStyles
        );
        return;
    }

    await openDesktopPrintDocument(
        title,
        content,
        combinedCssString,
        bodyClasses,
        includeThemeStyles
    );
}
