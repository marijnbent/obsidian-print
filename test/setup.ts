export {};

const globalWithCreateDiv = globalThis as typeof globalThis & {
    createDiv?: () => HTMLDivElement;
    createSpan?: () => HTMLSpanElement;
};

if (!globalWithCreateDiv.createDiv) {
    globalWithCreateDiv.createDiv = () => document.createElement('div');
}

if (typeof globalThis.createEl !== 'function') {
    Object.defineProperty(globalThis, 'createEl', {
        value: (tagName: string) => document.createElement(tagName)
    });
}

if (!globalWithCreateDiv.createSpan) {
    globalWithCreateDiv.createSpan = () => document.createElement('span');
}

const elementPrototype = Element.prototype as Element & {
    instanceOf?: (constructor: typeof Element) => boolean;
};

if (!elementPrototype.instanceOf) {
    Object.defineProperty(elementPrototype, 'instanceOf', {
        value: function instanceOf(constructor: typeof Element) {
            return this instanceof constructor;
        }
    });
}

const htmlElementPrototype = HTMLElement.prototype as HTMLElement & {
    addClass?: (...classNames: string[]) => void;
    createDiv?: (className?: string) => HTMLDivElement;
    createEl?: (
        tagName: string,
        options?: { text?: string; attr?: Record<string, string> }
    ) => HTMLElement;
};

if (!htmlElementPrototype.addClass) {
    Object.defineProperty(htmlElementPrototype, 'addClass', {
        value: function addClass(...classNames: string[]) {
            this.classList.add(...classNames);
        }
    });
}

if (!htmlElementPrototype.createDiv) {
    Object.defineProperty(htmlElementPrototype, 'createDiv', {
        value: function createDiv(className?: string) {
            const element = document.createElement('div');
            if (className) {
                element.className = className;
            }

            this.appendChild(element);
            return element;
        }
    });
}

if (!htmlElementPrototype.createEl) {
    Object.defineProperty(htmlElementPrototype, 'createEl', {
        value: function createEl(
            tagName: string,
            options?: { text?: string; attr?: Record<string, string> }
        ) {
            const element = document.createElement(tagName);
            if (options?.text) {
                element.textContent = options.text;
            }
            Object.entries(options?.attr ?? {}).forEach(([name, value]) => {
                element.setAttribute(name, value);
            });

            this.appendChild(element);
            return element;
        }
    });
}
