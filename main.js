const { Plugin, PluginSettingTab, Setting } = require("obsidian");

class PrintPlugin extends Plugin {
    async onload() {
        // Load user settings or default values
        this.settings = await this.loadData() || {
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

        this.addCommand({
            id: 'print-note',
            name: 'Print Current Note',
            callback: () => this.printNote(),
        });

        this.addSettingTab(new PrintSettingTab(this.app, this));

        this.addRibbonIcon('printer', 'Print Note', async (event) => {
            this.printNote();
        });
    }

    async revertState(notice = null, originalState, originalMode) {
        if (notice) {
            new Notice(notice);
        }

        // TODO: Change mode to preview programmatically, also for new notes
        //
        // let activeLeaf = this.app.workspace.activeLeaf;

        // if (originalMode !== 'preview') {
        //     originalState.state.mode = originalMode
        //     await activeLeaf.setViewState(originalState);
        // }
    }

    async printNote() {
        let activeLeaf = this.app.workspace.activeLeaf;

        if (!activeLeaf) {
            new Notice('No active note to print.');
            return;
        }

        let currentState = activeLeaf.getViewState();
        const currentMode = activeLeaf.view.currentMode.type;

        if (currentMode !== 'preview') {
            // TODO: Change mode to preview programmatically, also for new notes
            // currentState.state.mode = 'preview'
            // await activeLeaf.setViewState(currentState);
            return this.revertState('Please open the reading view first.')
        }

        activeLeaf = this.app.workspace.activeLeaf;

        let view = activeLeaf.view;
        let container = view.containerEl;

        let content = container.querySelector('.markdown-reading-view');
        let printContent = content.cloneNode(true);

        if (!printContent) {
            return this.revertState('Failed to retrieve note content.', currentState, currentMode)
        }

        let titleElement = printContent.querySelector('.inline-title');

        if (!titleElement) {
            return this.revertState('Failed to retrieve note content.', currentState, currentMode)
        }

        if (!this.settings.printTitle && titleElement) {
            titleElement.remove();
        }

        await this.openPrintModal(printContent.innerHTML);

        return this.revertState(null, currentState, currentMode)
    }

    async openPrintModal(content) {
        const { remote } = window.require("electron");

        return new Promise((resolve) => {

            let printWindow = new remote.BrowserWindow({
                width: 800,
                height: 600,
                show: this.settings.debugMode,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
                <html>
                    <head>
                        <title>Print Note</title>
                        <style>
                            body { 
                                font-family: sans-serif; 
                                margin: 20px; 
                                font-size: ${this.settings.fontSize};
                            }
                            .markdown-preview-sizer {
                                min-height: 0 !important;
                                padding: 0  !important;
                            }

                            h1, .inline-title { font-size: ${this.settings.h1Size}; font-weight: bold }
                            h2 { font-size: ${this.settings.h2Size}; }
                            h3 { font-size: ${this.settings.h3Size}; }
                            h4 { font-size: ${this.settings.h4Size}; }
                            h5 { font-size: ${this.settings.h5Size}; }
                            h6 { font-size: ${this.settings.h6Size}; }
                            .collapse-indicator { display: none; }
                            .metadata-container { display: none; }
                            ${this.settings.customCSS || ''}
                        </style>
                    </head>
                    <body class="obsidian-print">${content}</body>
                </html>
            `)}`);

            printWindow.webContents.on('did-finish-load', () => {

                if (this.settings.debugMode) {
                    printWindow.webContents.openDevTools();
                }

                printWindow.webContents.print({
                    silent: this.settings.directPrint,
                    printBackground: true
                }, (success, failureReason) => {

                    if (!this.settings.debugMode) {
                        printWindow.close();
                    }

                    if (this.settings.debugMode) {
                        console.log(success, failureReason)
                    }

                    resolve()

                });
            });
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('Print Plugin unloaded');
    }
}

class PrintSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName('Print Plugin').setHeading();

        new Setting(containerEl)
            .setName('Print Note Title')
            .setDesc('Check to include the note title in the printout.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.printTitle)
                .onChange(async (value) => {
                    this.plugin.settings.printTitle = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Direct Print')
            .setDesc('Check to print documents directly using the default printer, bypassing the print modal.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.directPrint)
                .onChange(async (value) => {
                    this.plugin.settings.directPrint = value;
                    await this.plugin.saveSettings();
                }));


        new Setting(containerEl)
            .setName('Font Size')
            .setDesc('Set the font size for the printed note.')
            .addText(text => text
                .setPlaceholder('14px')
                .setValue(this.plugin.settings.fontSize)
                .onChange(async (value) => {
                    this.plugin.settings.fontSize = value;
                    await this.plugin.saveSettings();
                }));

        ['h1Size', 'h2Size', 'h3Size', 'h4Size', 'h5Size', 'h6Size'].forEach((heading, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} Size`)
                .setDesc(`Set the size for <h${index + 1}> elements.`)
                .addText(text => text
                    .setPlaceholder(`${this.plugin.settings[heading]}`)
                    .setValue(this.plugin.settings[heading])
                    .onChange(async (value) => {
                        this.plugin.settings[heading] = value;
                        await this.plugin.saveSettings();
                    }));
        });

        new Setting(containerEl)
            .setName('Debug Mode')
            .setDesc('Check to enable the debug mode. This will open the print window so you can inspect the output.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc('Add custom CSS for the printout.')
            .addTextArea(textarea => textarea
                .setPlaceholder('Enter your custom CSS here')
                .setValue(this.plugin.settings.customCSS || '')
                .onChange(async (value) => {
                    this.plugin.settings.customCSS = value;
                    await this.plugin.saveSettings();
                }));
    }
}

// Export the plugin
module.exports = PrintPlugin;