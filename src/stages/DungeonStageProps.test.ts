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
        const expectedStagePropSets = new Map<string, string[]>([
            ['NetworkMatrix', ['serverrack', 'barrier', 'energycells', 'pile']],
            ['PacketForge', ['pipes', 'desk', 'deskl', 'barrier', 'serverrack']],
            ['CipherNull', ['satellitedish', 'vent', 'ac', 'barrier', 'receiverstation']],
            ['SecurityCore', ['dronechargingstation', 'dronechargingstationanimated', 'pipes', 'vent', 'serverrack']],
            ['KernelTerminus', ['holoprojector', 'coolingtanklarge', 'dataspire', 'serverrack', 'coolingtank']],
        ]);
        const actualStagePropSets = new Map<string, Set<string>>([
            ['NetworkMatrix', new Set(getPropNames(Object.create(NetworkMatrix.prototype) as NetworkMatrix))],
            ['PacketForge', new Set(getPropNames(Object.create(PacketForge.prototype) as PacketForge))],
            ['CipherNull', new Set(getPropNames(Object.create(CipherNull.prototype) as CipherNull))],
            ['SecurityCore', new Set(getPropNames(Object.create(SecurityCore.prototype) as SecurityCore))],
            ['KernelTerminus', new Set(getPropNames(Object.create(KernelTerminus.prototype) as KernelTerminus))],
        ]);

        for (const [stageName, expectedProps] of expectedStagePropSets) {
            const actualProps = actualStagePropSets.get(stageName);
            expect(actualProps).toBeDefined();
            expect(actualProps!.size).toBeGreaterThanOrEqual(4);
            expect(actualProps!.size).toBeLessThan(DUNGEON_PROP_DEFINITIONS.length);
            expect(actualProps).toEqual(new Set(expectedProps));
        }
    });
});
