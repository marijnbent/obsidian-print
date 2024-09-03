import { App, TFolder } from 'obsidian';

/**
 * Used to determine the folder if the 'print-folder-notes' action is activated.
 * 
 * @param app
 * @returns 
 */
export async function getFolderByActiveFile(app: App): Promise<TFolder|null> {

        const activeFile = app.workspace.getActiveFile();

        if (activeFile) {
            const parentFolder = activeFile.parent;

            if (parentFolder instanceof TFolder) {
                return parentFolder
            }
        }

        return null

}