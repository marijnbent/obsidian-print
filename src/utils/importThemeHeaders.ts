import { App } from "obsidian";

/**
 * Gets all header colors from the current theme, handling dark mode
 */
export function getHeadersCSS(app: App): Map<number, string> {
    const css = getCustomCSS(app);
    const headerColors = extractHeaderColors(css);
    const isDark = isDarkMode();

    const realColors = new Map<number, string>();
    headerColors.forEach((color, level) => {
        const realColor = getCSSVariableValue(color, isDark);
        realColors.set(level, realColor);
    });

    return realColors;
}

/**
 * Gets the custom CSS from the active Obsidian theme
 * Uses Obsidian's customCSS API to access theme styles
 */
export function getCustomCSS(app: App): string {
    const theme = app.customCss.theme;
    return app.customCss.csscache.get(`.obsidian/themes/${theme}/theme.css`) ?? '';
}

function extractHeaderColors(content: string): Map<number, string> {
    const headerColors = new Map<number, string>();
    let foundHeaders = 0;

    // First pass: detect CSS variables (--h1-color...)
    const variableRegex = /--h(\d)-color:\s*([^;]+);/g;
    let match;

    while ((match = variableRegex.exec(content)) !== null && foundHeaders < 6) {
        const [, level, color] = match;
        const headerLevel = parseInt(level);
        if (headerLevel >= 1 && headerLevel <= 6) {
            headerColors.set(headerLevel, color.trim());
            foundHeaders++;
        }
    }

    // Else second pass: detect direct header styles
    if (foundHeaders === 0) {
        const directStyleRegex = /(?:\.cm-header-(\d)|\.markdown-preview-view\s+h(\d))(?:[^{]*,\s*[^{]*)*{[^}]*?color:\s*([^;]+)/g;
        while ((match = directStyleRegex.exec(content)) !== null && foundHeaders < 6) {
            const level = parseInt(match[1] || match[2]);
            const color = match[3].trim();
            if (level >= 1 && level <= 6) {
                headerColors.set(level, color);
                foundHeaders++;
            }
        }
    }

    return headerColors;
}

export function isDarkMode(): boolean {
    return document.body.classList.contains('theme-dark');
}

/**
 * Gets the computed color value for a CSS variable, handling dark mode conversion
 */
export function getCSSVariableValue(variableName: string, isDark: boolean): string {
    return temporaryThemeSwitch(isDark, () => {
        const temp = document.createElement('div');
        document.body.appendChild(temp);

        try {
            if (variableName.startsWith('var(')) {
                temp.style.color = variableName;
            } else if (variableName.startsWith('#')) {
                return variableName;
            } else if (variableName.startsWith('rgb')) {
                return rgbToHex(variableName);
            } else {
                temp.style.color = variableName;
            }

            const computedColor = window.getComputedStyle(temp).color;
            return rgbToHex(computedColor);
        } finally {
            document.body.removeChild(temp);
        }
    });
}

/**
 * Temporarily switches theme to light mode if darkmode and executes a callback.
 */
function temporaryThemeSwitch(isDark: boolean, callback: () => string): string {
    const body = document.body;
    const wasDark = isDarkMode();

    try {
        if (wasDark && isDark) {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
        }

        const result = callback();

        return result;
    } finally {
        if (wasDark && isDark) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
        }
    }
}

export function rgbToHex(rgb: string): string {
    const values = rgb.match(/\d+/g);
    if (!values) return rgb;

    const r = parseInt(values[0]).toString(16).padStart(2, '0');
    const g = parseInt(values[1]).toString(16).padStart(2, '0');
    const b = parseInt(values[2]).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
}