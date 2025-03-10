import { Modal, App } from 'obsidian';
import { PrintPluginSettings } from 'src/types';

export class PrintModeModal extends Modal {
    constructor(
        app: App,
        private settings: PrintPluginSettings,
        private useAdvancedPrint: boolean,
        private onSubmit: (printMode: string | null) => void,
        private saveSettings: () => Promise<void>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        // Set modal size
        this.modalEl.style.width = '400px';
        this.modalEl.style.height = '200px';

        contentEl.empty();
        contentEl.createEl('h2', { text: 'Print Options' });

        // Create options container
        const optionsContainer = contentEl.createDiv();
        optionsContainer.style.display = 'flex';
        optionsContainer.style.justifyContent = 'center';
        optionsContainer.style.gap = '20px';
        optionsContainer.style.marginBottom = '20px';

        // Print title checkbox
        const titleLabel = optionsContainer.createEl('label');
        const titleCheck = titleLabel.createEl('input', { type: 'checkbox' });
        titleCheck.checked = this.settings.printTitle;
        titleLabel.appendText(' Print Title');
        titleCheck.addEventListener('change', async () => {
            this.settings.printTitle = titleCheck.checked;
            await this.saveSettings();
        });

        // Metadata checkbox
        const metadataLabel = optionsContainer.createEl('label');
        const metadataCheck = metadataLabel.createEl('input', { type: 'checkbox' });
        metadataCheck.checked = this.settings.showMetadata;
        metadataLabel.appendText(' Show Metadata');
        metadataCheck.addEventListener('change', async () => {
            this.settings.showMetadata = metadataCheck.checked;
            await this.saveSettings();
        });

        // Page breaks checkbox
        const breaksLabel = optionsContainer.createEl('label');
        const breaksCheck = breaksLabel.createEl('input', { type: 'checkbox' });
        breaksCheck.checked = this.settings.hrPageBreaks;
        breaksLabel.appendText(' Page Breaks at HR');
        breaksCheck.addEventListener('change', async () => {
            this.settings.hrPageBreaks = breaksCheck.checked;
            await this.saveSettings();
        });

        // Create button container
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';

        // Basic Print button (Obsidian native)
        const basicBtn = buttonContainer.createEl('button');
        basicBtn.setText('Basic');
        basicBtn.addEventListener('click', () => {
            this.close();
            this.onSubmit('basic');
        });

        // Standard Print button (in browser)
        if (this.settings.useBrowserPrint) {
            const standardBtn = buttonContainer.createEl('button');
            standardBtn.setText('Standard (browser)');
            standardBtn.addEventListener('click', () => {
                this.close();
                this.onSubmit('standard');
            });
        }

        // Advanced Print button (in browser)
        if (this.useAdvancedPrint && this.settings.useBrowserPrint) {
            const advancedBtn = buttonContainer.createEl('button');
            advancedBtn.setText('Advanced (browser)');
            advancedBtn.addEventListener('click', () => {
                this.close();
                this.onSubmit('advanced');
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}