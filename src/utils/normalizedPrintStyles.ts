export const NORMALIZED_PRINT_STYLES = `
@media print {

    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
        margin: 0;
    }

    .markdown-preview-sizer {
        min-height: 0 !important;
        padding: 0 !important;
    }

    .collapse-indicator {
        display: none;
    }

    .metadata-container {
        display: none;
    }

    pre button {
        display: none;
    }

    pre,
    code {
        font-family: var(--font-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace);
        font-size: 0.92em;
    }

    :not(pre) > code {
        background: var(--code-background, rgba(0, 0, 0, 0.06));
        border-radius: 4px;
        padding: 0.15em 0.35em;
    }

    pre {
        background: var(--code-background, rgba(0, 0, 0, 0.04));
        border: 1px solid var(--background-modifier-border, rgba(0, 0, 0, 0.1));
        border-radius: 8px;
        overflow: visible;
        padding: 12px 14px;
        white-space: pre-wrap;
        overflow-wrap: normal;
        word-break: normal;
        line-height: 1.45;
        tab-size: 4;
    }

    pre code {
        display: block;
        background: transparent;
        padding: 0;
        white-space: inherit;
    }

    .obsidian-print-page-break {
        break-before: page;
    }

    .callout {
        --callout-color: 120, 120, 120;
        margin: 1rem 0;
        padding: 0.85rem 1rem;
        border: 1px solid rgba(var(--callout-color), 0.28);
        border-left: 6px solid rgb(var(--callout-color));
        border-radius: 8px;
        background: rgba(var(--callout-color), 0.08);
    }

    .callout[data-callout="note"] {
        --callout-color: 8, 109, 221;
    }

    .callout[data-callout="abstract"],
    .callout[data-callout="summary"],
    .callout[data-callout="tldr"] {
        --callout-color: 0, 148, 163;
    }

    .callout[data-callout="info"] {
        --callout-color: 8, 109, 221;
    }

    .callout[data-callout="todo"] {
        --callout-color: 139, 92, 246;
    }

    .callout[data-callout="tip"],
    .callout[data-callout="hint"],
    .callout[data-callout="important"] {
        --callout-color: 22, 163, 74;
    }

    .callout[data-callout="success"],
    .callout[data-callout="check"],
    .callout[data-callout="done"] {
        --callout-color: 22, 163, 74;
    }

    .callout[data-callout="question"],
    .callout[data-callout="help"],
    .callout[data-callout="faq"] {
        --callout-color: 217, 119, 6;
    }

    .callout[data-callout="warning"],
    .callout[data-callout="caution"],
    .callout[data-callout="attention"] {
        --callout-color: 234, 88, 12;
    }

    .callout[data-callout="failure"],
    .callout[data-callout="fail"],
    .callout[data-callout="missing"] {
        --callout-color: 220, 38, 38;
    }

    .callout[data-callout="danger"],
    .callout[data-callout="error"] {
        --callout-color: 190, 24, 93;
    }

    .callout[data-callout="bug"] {
        --callout-color: 180, 83, 9;
    }

    .callout[data-callout="example"] {
        --callout-color: 124, 58, 237;
    }

    .callout[data-callout="quote"],
    .callout[data-callout="cite"] {
        --callout-color: 100, 116, 139;
    }

    .callout.is-collapsed .callout-content {
        display: block !important;
    }

    .callout-title {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin-bottom: 0.55rem;
        color: rgb(var(--callout-color));
        font-weight: 700;
    }

    .callout-title-inner,
    .callout-title p,
    .callout-content p:first-child,
    .callout-content > :first-child {
        margin-top: 0;
    }

    .callout-title p,
    .callout-content > :last-child {
        margin-bottom: 0;
    }

    .callout-icon,
    .callout-fold {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: rgb(var(--callout-color));
        flex: 0 0 auto;
    }

    .callout-icon svg,
    .callout-fold svg {
        width: 1rem;
        height: 1rem;
    }

    .callout-content {
        color: inherit;
    }

    .mermaid {
        margin: 1rem 0;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .mermaid svg {
        display: block;
        max-width: 100%;
        height: auto;
        overflow: visible;
        background: transparent;
    }

    .mermaid svg text,
    .mermaid svg foreignObject,
    .mermaid svg .label,
    .mermaid svg .nodeLabel,
    .mermaid svg .edgeLabel {
        font-family: inherit;
    }

    .mermaid svg .edgeLabel,
    .mermaid svg .label {
        background: transparent;
    }

    img {
        max-width: 100%;
    }

    ul.contains-task-list {
        list-style-type: none;
        margin-left: 0;
        padding-left: 1.6rem;
    }

    li.task-list-item {
        list-style: none;
    }

    li.task-list-item > input[type="checkbox"] {
        margin: 0 0.55rem 0 0;
        vertical-align: middle;
        transform: translateY(-0.04em);
    }

    li.task-list-item > ul.contains-task-list {
        margin-top: 0.3rem;
        padding-left: 1.5rem;
        border-left: 1px solid var(--background-modifier-border, rgba(0, 0, 0, 0.12));
    }

    li.task-list-item.is-checked,
    li.task-list-item[data-task="x"],
    li.task-list-item[data-task="X"] {
        color: var(--text-muted, rgba(0, 0, 0, 0.65));
    }

    table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1em;
        break-inside: auto;
        page-break-inside: auto;
    }

    th,
    td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
    }

    thead {
        display: table-header-group;
    }

    tfoot {
        display: table-footer-group;
    }

    th {
        background-color: #f2f2f2;
        font-weight: bold;
    }

    tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    tr,
    img,
    pre,
    blockquote {
        break-inside: avoid;
        page-break-inside: avoid;
    }
}
`;
