import { describe, expect, it } from 'vitest';
import { EnemyType } from '../enemies/EnemyType';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import { NetworkMatrix } from './NetworkMatrix';
import { PacketForge } from './PacketForge';
import { CipherNull } from './CipherNull';
import { SecurityCore } from './SecurityCore';
import { KernelTerminus } from './KernelTerminus';

describe('dungeon stage enemy pools', () => {
    it('keeps Network Matrix limited to brute enemies', () => {
        const stage = Object.create(NetworkMatrix.prototype) as NetworkMatrix;
        expect((stage as any).getAvailableEnemyTypes(EnemySpawnType.Regular)).toEqual([EnemyType.Brute]);
        expect((stage as any).getAvailableEnemyTypes(EnemySpawnType.Elite)).toEqual([EnemyType.Brute]);
    });

    it('introduces pod enemies in Packet Forge with lower regular stats than brutes', () => {
        const stage = Object.create(PacketForge.prototype) as PacketForge;
        const bruteConfig = (stage as any).getEnemyConfig(EnemySpawnType.Regular);
        const podConfig = {
            ...bruteConfig,
            ...(stage as any).getEnemyTypeConfig(EnemyType.Pod, EnemySpawnType.Regular),
        };

        expect((stage as any).getAvailableEnemyTypes(EnemySpawnType.Regular)).toEqual([EnemyType.Brute, EnemyType.Pod]);
        expect(podConfig.maxHp).toBeLessThan(bruteConfig.maxHp);
        expect(podConfig.speed).toBeLessThan(bruteConfig.speed);
    });

    it('uses all three enemy families in later dungeon stages', () => {
        const expectedTypes = [EnemyType.Brute, EnemyType.Pod, EnemyType.Stalker];
        const laterStages = [
            Object.create(CipherNull.prototype) as CipherNull,
            Object.create(SecurityCore.prototype) as SecurityCore,
            Object.create(KernelTerminus.prototype) as KernelTerminus,
        ];

        for (const stage of laterStages) {
            expect((stage as any).getAvailableEnemyTypes(EnemySpawnType.Regular)).toEqual(expectedTypes);
            expect((stage as any).getAvailableEnemyTypes(EnemySpawnType.Boss)).toEqual([EnemyType.Brute]);
        }
    });
});
