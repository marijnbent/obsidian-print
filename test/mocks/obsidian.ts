export class Plugin {
    app: unknown;
    manifest: unknown;

    constructor(app?: unknown, manifest?: unknown) {
        this.app = app;
        this.manifest = manifest;
    }

    addCommand(): void {}

    addSettingTab(): void {}

    addRibbonIcon(): void {}

    registerEvent(callback: unknown): unknown {
        return callback;
    }

    async loadData(): Promise<Record<string, unknown>> {
        return {};
    }

    async saveData(): Promise<void> {}
}

export class Notice {
    message: string;

    constructor(message: string, _timeout?: number) {
        this.message = message;
        getMockNoticeStore().push(message);
    }

    hide(): void {}
}

export class Modal {
    app: unknown;
    containerEl: HTMLDivElement;
    modalEl: HTMLDivElement;
    titleEl: HTMLHeadingElement;
    contentEl: HTMLDivElement;

    constructor(app: unknown) {
        this.app = app;
        this.containerEl = document.createElement('div');
        this.modalEl = document.createElement('div');
        this.titleEl = document.createElement('h2');
        this.contentEl = document.createElement('div');
        this.modalEl.append(this.titleEl, this.contentEl);
        this.containerEl.appendChild(this.modalEl);
    }

    open(): void {
        document.body.appendChild(this.containerEl);
        void this.onOpen();
    }

    close(): void {
        this.containerEl.remove();
        this.onClose();
    }

    onOpen(): void | Promise<void> {}

    onClose(): void {}

    setTitle(title: string): this {
        this.titleEl.textContent = title;
        return this;
    }
}

export class TFile {
    path: string;
    basename: string;
    extension: string;
    parent: TFolder | null;

    constructor(path = '', basename = '', extension = 'md', parent: TFolder | null = null) {
        this.path = path;
        this.basename = basename;
        this.extension = extension;
        this.parent = parent;
    }
}

export class TFolder {
    name: string;
    children: Array<TFile | TFolder>;

    constructor(name = '', children: Array<TFile | TFolder> = []) {
        this.name = name;
        this.children = children;
    }
}

export class MarkdownView {
    file?: TFile;
    editor: { getSelection: () => string };

    constructor(file?: TFile, selection = '') {
        this.file = file;
        this.editor = {
            getSelection: () => selection
        };
    }

    async save(): Promise<void> {}
}

export class Component {
    unload(): void {}
}

export function sanitizeHTMLToDom(html: string): DocumentFragment {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('script').forEach((element) => element.remove());
    template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            if (attribute.name.toLowerCase().startsWith('on')) {
                element.removeAttribute(attribute.name);
            }
        });
    });
    return template.content;
}

export const MarkdownRenderer = {
    async render(
        _app: unknown,
        markdown: string,
        container: HTMLElement
    ): Promise<void> {
        const mermaidBlocks = markdown.match(/```mermaid\s*([\s\S]*?)```/g);

        if (mermaidBlocks?.length) {
            mermaidBlocks.forEach((block) => {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.className = 'language-mermaid';
                code.textContent = block
                    .replace(/^```mermaid\s*/, '')
                    .replace(/```$/, '')
                    .trim();
                pre.appendChild(code);
                container.appendChild(pre);
            });

            return;
        }

        if (markdown.includes('[native-metadata-container]')) {
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            metadataContainer.textContent = 'Native properties';
            container.appendChild(metadataContainer);
        }

        const paragraph = document.createElement('p');
        paragraph.textContent = markdown;
        container.appendChild(paragraph);
    }
};

export async function loadMermaid(): Promise<{
    render: (id: string, source: string) => Promise<{ svg: string }>;
}> {
    return {
        render: async (id: string, source: string) => ({
            svg: `<svg data-mermaid-id="${id}" onclick="alert(1)"><text>${source}</text><script>alert(1)</script></svg>`
        })
    };
}

export function getFrontMatterInfo(content: string): {
    exists: boolean;
    frontmatter: string;
    from: number;
    to: number;
    contentStart: number;
} {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

    if (!match) {
        return {
            exists: false,
            frontmatter: '',
            from: 0,
            to: 0,
            contentStart: 0
        };
    }

    const frontmatterStart = content.indexOf(match[1]);

    return {
        exists: true,
        frontmatter: match[1],
        from: frontmatterStart,
        to: frontmatterStart + match[1].length,
        contentStart: match[0].length
    };
}

export class PluginSettingTab {
    app: unknown;
    plugin: unknown;
    containerEl: HTMLDivElement;

    constructor(app: unknown, plugin: unknown) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }
}

export class Setting {
    constructor(_containerEl: HTMLElement) {}

    setName(): this {
        return this;
    }

    setDesc(): this {
        return this;
    }

    addToggle(callback: (toggle: {
        setValue: (value: boolean) => unknown;
        onChange: (handler: (value: boolean) => void | Promise<void>) => unknown;
    }) => unknown): this {
        callback({
            setValue: () => this,
            onChange: () => this
        });

        return this;
    }

    addText(callback: (text: {
        setPlaceholder: (value: string) => unknown;
        setValue: (value: string) => unknown;
        onChange: (handler: (value: string) => void | Promise<void>) => unknown;
    }) => unknown): this {
        callback({
            setPlaceholder: () => this,
            setValue: () => this,
            onChange: () => this
        });

        return this;
    }

    setDisabled(): this {
        return this;
    }
}

export const Platform = {
    isDesktop: true,
    isMobile: false,
    isDesktopApp: true,
    isMobileApp: false,
    isIosApp: false,
    isAndroidApp: false,
    isPhone: false,
    isTablet: false,
    isMacOS: true,
    isWin: false,
    isLinux: false,
    isSafari: false
};

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary);
}

function getMockNoticeStore(): string[] {
    const globalWithNoticeStore = globalThis as typeof globalThis & {
        __obsidianMockNotices?: string[];
    };

    if (!globalWithNoticeStore.__obsidianMockNotices) {
        globalWithNoticeStore.__obsidianMockNotices = [];
    }

    return globalWithNoticeStore.__obsidianMockNotices;
}
