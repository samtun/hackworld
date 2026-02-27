import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify('test'),
        __FRESH_START__: JSON.stringify(false),
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
