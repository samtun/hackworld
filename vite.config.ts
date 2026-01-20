import { defineConfig } from 'vite'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isFresh = mode === 'fresh' || process.argv.includes('--fresh');

  return {
    base: process.env.VITE_BASE_PATH || '/hackworld/',
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __FRESH_START__: JSON.stringify(isFresh),
    },
  };
})
