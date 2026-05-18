import { defineConfig } from 'vite';

// Separate Vite config for the standalone Sound Editor tool.
// Start with: npm run dev:sound-editor  (runs on http://localhost:5174)
export default defineConfig({
    root: 'sound-editor',
    server: {
        port: 5174,
    },
    base: './',
    build: {
        outDir: '../dist-sound-editor',
        emptyOutDir: true,
    },
});
