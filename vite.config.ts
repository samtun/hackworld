import { defineConfig } from 'vite';
import swc from 'unplugin-swc';
import packageJson from './package.json'; // Sicherstellen, dass packageJson importiert ist

export default defineConfig(({ mode }) => {
  const isFresh = mode === 'fresh' || process.argv.includes('--fresh');

  return {
    base: process.env.VITE_BASE_PATH || '/hackworld/',
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __FRESH_START__: JSON.stringify(isFresh),
    },
    plugins: [
      // swc muss vor allen anderen Schritten laufen, um die Metadaten zu generieren
      swc.vite({
        tsconfigFile: true,
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true, // Zwingend erforderlich für TSyringe
          },
        },
      }),
    ],
  };
});