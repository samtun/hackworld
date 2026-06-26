import { describe, expect, it } from 'vitest';
import { CipherNull } from './CipherNull';
import { GameTest } from './GameTest';
import { KernelTerminus } from './KernelTerminus';
import { NetworkMatrix } from './NetworkMatrix';
import { PacketForge } from './PacketForge';
import { SecurityCore } from './SecurityCore';
import { DUNGEON_PROP_DEFINITIONS } from './DungeonPropCatalog';

interface StageAssetProvider {
    getRequiredAssets(): string[];
}

function getPropNames(stage: StageAssetProvider): string[] {
    return stage.getRequiredAssets()
        .filter((assetPath) => assetPath.startsWith('models/props/') && assetPath.endsWith('.glb') && !assetPath.endsWith('.collider.glb'))
        .map((assetPath) => assetPath.replace('models/props/', '').replace('.glb', ''));
}

describe('procedural dungeon prop themes', () => {
    it('GameTest loads the full shared prop catalog', () => {
        const stage = Object.create(GameTest.prototype) as GameTest;
        expect(getPropNames(stage)).toEqual(DUNGEON_PROP_DEFINITIONS.map(({ modelName }) => modelName));
    });

    it('room-based stages preload curated themed subsets instead of the full catalog', () => {
        const stagePropSets = [
            new Set(getPropNames(Object.create(NetworkMatrix.prototype) as NetworkMatrix)),
            new Set(getPropNames(Object.create(PacketForge.prototype) as PacketForge)),
            new Set(getPropNames(Object.create(CipherNull.prototype) as CipherNull)),
            new Set(getPropNames(Object.create(SecurityCore.prototype) as SecurityCore)),
            new Set(getPropNames(Object.create(KernelTerminus.prototype) as KernelTerminus)),
        ];

        for (const propSet of stagePropSets) {
            expect(propSet.size).toBeGreaterThanOrEqual(5);
            expect(propSet.size).toBeLessThan(DUNGEON_PROP_DEFINITIONS.length);
        }

        expect(stagePropSets[0]).not.toEqual(stagePropSets[1]);
        expect(stagePropSets[1]).not.toEqual(stagePropSets[2]);
        expect(stagePropSets[2]).not.toEqual(stagePropSets[3]);
        expect(stagePropSets[3]).not.toEqual(stagePropSets[4]);
    });
});
