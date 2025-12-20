import { defineConfig } from 'vite'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/hackworld/',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
})
