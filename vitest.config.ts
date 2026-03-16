import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify('test'),
        __FRESH_START__: JSON.stringify(false),
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: './coverage',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
        },
    },
});
