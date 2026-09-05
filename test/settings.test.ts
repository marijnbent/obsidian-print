import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileSystemAdapter, Platform, Setting } from 'obsidian';
import { PrintSettingTab } from '../src/settings';
import { DEFAULT_SETTINGS } from '../src/types';

function createSettings(files: string[], enabled = false, desktop = false) {
    const enabledSnippets = new Set(enabled ? ['print'] : []);
    const adapter = Object.assign(desktop ? new FileSystemAdapter() : {}, {
        exists: vi.fn(async (path: string) => files.includes(path)),
        mkdir: vi.fn(async () => undefined),
        getFullPath: vi.fn((path: string) => `/vault/${path}`)
    });
    const setCssEnabledStatus = vi.fn((name: string, value: boolean) => {
        if (value) enabledSnippets.add(name);
        else enabledSnippets.delete(name);
    });
    const app = {
        vault: { configDir: '.custom', adapter },
        customCss: { enabledSnippets, setCssEnabledStatus }
    };
    const tab = new PrintSettingTab(app as never, { settings: DEFAULT_SETTINGS } as never);
    let change: (value: boolean) => Promise<void>;
    let openFolder: () => Promise<void>;
    const toggle = {
        setValue: vi.fn().mockReturnThis(),
        setDisabled: vi.fn().mockReturnThis(),
        onChange: vi.fn((handler) => { change = handler; return toggle; })
    };
    const button = {
        setIcon: vi.fn().mockReturnThis(),
        setTooltip: vi.fn().mockReturnThis(),
        onClick: vi.fn((handler) => { openFolder = handler; return button; })
    };
    const setting = {
        setDesc: vi.fn().mockReturnThis(),
        addToggle: vi.fn((callback) => { callback(toggle); return setting; }),
        addExtraButton: vi.fn((callback) => { callback(button); return setting; })
    };
    const definition = tab.getSettingDefinitions()
        .flatMap<{ name: string; render?: (setting: Setting) => void }>(group => group.items ?? [])
        .find(item => item.name === 'Custom CSS');
    if (!definition?.render) throw new Error('Custom CSS setting not found');
    expect(adapter.exists).not.toHaveBeenCalled();
    definition.render(setting as unknown as Setting);

    return { adapter, enabledSnippets, setCssEnabledStatus, setting, toggle,
        change: (value: boolean) => change(value), openFolder: () => openFolder() };
}

afterEach(() => vi.restoreAllMocks());

describe('Custom CSS settings', () => {
    it('uses the existing Appearance state and allows changes from either switch', async () => {
        const state = createSettings(['.custom/snippets/print.css'], true);
        expect(state.toggle.setValue).toHaveBeenCalledWith(true);
        await state.change(false);
        expect(state.setCssEnabledStatus).toHaveBeenLastCalledWith('print', false);
        expect(state.enabledSnippets.has('print')).toBe(false);
        await state.change(true);
        expect(state.setCssEnabledStatus).toHaveBeenLastCalledWith('print', true);
        expect(state.enabledSnippets.has('print')).toBe(true);
    });

    it('explains a doubled extension and rechecks the file when enabling after a rename', async () => {
        const files = ['.custom/snippets/print.css.css'];
        const state = createSettings(files);
        await state.change(true);
        expect(state.setting.setDesc).toHaveBeenLastCalledWith(expect.stringContaining('Found print.css.css. Rename it to print.css'));
        expect(state.setCssEnabledStatus).not.toHaveBeenCalled();
        expect(state.toggle.setValue).toHaveBeenLastCalledWith(false);

        files[0] = '.custom/snippets/print.css';
        await state.change(true);
        expect(state.setCssEnabledStatus).toHaveBeenCalledWith('print', true);
        expect(state.setting.setDesc).toHaveBeenLastCalledWith(expect.stringContaining('Edit .custom/snippets/print.css.'));
        expect(state.setting.setDesc).not.toHaveBeenLastCalledWith(expect.stringContaining('Rename'));
    });

    it('explains a missing file and lets users disable an enabled missing snippet', async () => {
        const state = createSettings([], true);
        await vi.waitFor(() => expect(state.setting.setDesc).toHaveBeenLastCalledWith(expect.stringContaining('File not found. Create print.css')));
        await state.change(false);
        expect(state.setCssEnabledStatus).toHaveBeenCalledWith('print', false);
    });

    it('opens the configured snippets folder on desktop, creating the folder if needed', async () => {
        const openPath = vi.fn(async () => '');
        vi.stubGlobal('require', vi.fn(() => ({ shell: { openPath } })));
        try {
            const state = createSettings([], false, true);
            await state.openFolder();
            expect(state.adapter.mkdir).toHaveBeenCalledWith('.custom/snippets');
            expect(openPath).toHaveBeenCalledWith('/vault/.custom/snippets');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('keeps file guidance available without a desktop folder button on mobile', async () => {
        vi.spyOn(Platform, 'isDesktopApp', 'get').mockReturnValue(false);
        const state = createSettings([]);
        expect(state.setting.addExtraButton).not.toHaveBeenCalled();
        await vi.waitFor(() => expect(state.setting.setDesc).toHaveBeenLastCalledWith(expect.stringContaining('Appearance > CSS snippets')));
    });
});
