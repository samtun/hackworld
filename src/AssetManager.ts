import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AssetManager - Singleton class for preloading and caching GLTF models
 * Prevents visual "popping" by loading all assets before they're needed
 */
export class AssetManager {
    private static instance: AssetManager;
    private loader: GLTFLoader;
    private cache: Map<string, GLTF>;
    private loadingPromises: Map<string, Promise<GLTF>>;

    private constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    /**
     * Preload a single model
     */
    async preload(path: string): Promise<GLTF> {
        // Return cached model if available
        if (this.cache.has(path)) {
            return this.cache.get(path)!;
        }

        // Return existing loading promise if in progress
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path)!;
        }

        // Start loading
        const loadPromise = this.loader.loadAsync(path).then(gltf => {
            this.cache.set(path, gltf);
            this.loadingPromises.delete(path);
            console.log(`✓ Preloaded asset: ${path}`);
            return gltf;
        }).catch(error => {
            this.loadingPromises.delete(path);
            console.error(`✗ Failed to preload asset ${path}:`, error);
            throw error;
        });

        this.loadingPromises.set(path, loadPromise);
        return loadPromise;
    }

    /**
     * Preload multiple models at once
     */
    async preloadAll(paths: string[]): Promise<void> {
        console.log(`Preloading ${paths.length} assets...`);
        await Promise.all(paths.map(path => this.preload(path)));
        console.log(`✓ All ${paths.length} assets preloaded`);
    }

    /**
     * Get a preloaded model (clone it to allow multiple instances)
     */
    get(path: string): GLTF | null {
        return this.cache.get(path) || null;
    }

    /**
     * Check if a model is cached
     */
    has(path: string): boolean {
        return this.cache.has(path);
    }

    /**
     * Clear all cached assets
     */
    clear(): void {
        this.cache.clear();
        this.loadingPromises.clear();
    }
}
