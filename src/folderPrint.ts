import { App, TFile, TFolder, Notice } from 'obsidian';
import { generateHTML } from './normalCapturePreview';
import PrintPlugin from './main';

/**
 * Gets the parent folder of the currently active file
 * 
 * @param app The Obsidian App instance
 * @returns The parent folder of the active file, or null if not found
 */
export async function getFolderByActiveFile(app: App): Promise<TFolder | null> {
    const activeFile = app.workspace.getActiveFile();

    if (activeFile) {
        const parentFolder = activeFile.parent;

        // if file is in root folder, return null
        if (parentFolder instanceof TFolder && !parentFolder.isRoot()) {
            return parentFolder;
        }
    }

    return null;
}


/**
 * Prints all markdown files in the current folder or specified folder
 * @param plugin The PrintPlugin instance
 * @param folder Optional folder to print, defaults to active file's folder
 */
export async function printFolder(plugin: PrintPlugin, folder?: TFolder) {
    const activeFolder = folder || await getFolderByActiveFile(plugin.app);
    if (!activeFolder) {
        new Notice('Could not resolve folder.');
        return;
    }

    const files = activeFolder.children.filter((file) => file instanceof TFile && file.extension === 'md') as TFile[];

    if (files.length === 0) {
        new Notice('No markdown files found in the folder.');
        return;
    }

    const folderContent = createDiv();

    for (const file of files) {
        const content = await generateHTML(plugin.app, plugin.settings, file);
        if (!content) {
            continue;
        }
        if (!plugin.settings.combineFolderNotes) {
            content.addClass('obsidian-print-page-break');
        }
        folderContent.append(content);
    }

    await plugin.handlePrint(false);
}