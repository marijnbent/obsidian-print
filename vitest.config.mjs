import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            obsidian: path.resolve(import.meta.dirname, 'test/mocks/obsidian.ts'),
            src: path.resolve(import.meta.dirname, 'src')
        }
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['test/setup.ts']
    }
});
