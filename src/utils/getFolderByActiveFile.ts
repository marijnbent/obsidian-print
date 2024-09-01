import { App, TFolder } from 'obsidian';

/**
 * Used to determine the folder if the 'print-folder-notes' action is activated.
 * 
 * @param app
 * @returns 
 */
export async function getFolderByActiveFile(app: App): Promise<TFolder|null> {
    return new Promise((resolve) => {

        const activeFile = app.workspace.getActiveFile();

        if (activeFile) {
            const parentFolder = activeFile.parent;

            if (parentFolder instanceof TFolder) {
                resolve(parentFolder)
            }
        }

        resolve(null)

    });
}