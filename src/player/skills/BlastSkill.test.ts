import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlastSkill } from './BlastSkill';
import { AudioManager } from '../../AudioManager';
import { Enemy } from '../../enemies/Enemy';
import { Tier } from '../../items/TierManager';
import { SkillTechType } from './SkillType';
import type { Player } from '../Player';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTF } from 'three/examples/jsm/Addons.js';
import { mock, mockDeep } from 'vitest-mock-extended';
import { AssetManager } from '../../AssetManager';
import { PhysicsBodyMetadataManager } from '../../PhysicsBodyMetadata';

const physicsBodyMetadataManager = new PhysicsBodyMetadataManager();

interface BlastSkillTestOverrides {
    onCompletedCallback?: () => void;
    assetManager?: any;
    audioManager?: AudioManager;
    uiManager?: any;
}

function makeEnemy(x: number, z: number) {
    const enemy = Object.create(Enemy.prototype);
    enemy.isDead = false;
    enemy.isDying = false;
    enemy.takeDamage = vi.fn();
    const body = { position: { x, y: 0, z } } as unknown as CANNON.Body;
    physicsBodyMetadataManager.registerEnemyBody(body, enemy);
    return { enemy, body };
}

function makePlayer(tier = Tier.STABLE) {
    return {
        getSkillTier: vi.fn().mockReturnValue(tier),
        tp: 3000, maxTp: 3300,
        position: { x: 0, y: 0, z: 0 },
        body: { position: { x: 0, y: 0, z: 0 } },
        getCriticalChance: vi.fn().mockReturnValue(0),
        CRITICAL_HIT_MULTIPLIER: 2,
        getCriticalHitMultiplier: vi.fn().mockReturnValue(2),
        tryIncrementSkillTech: vi.fn(),
    } as any;
}

function createDefaultAssetManager(): AssetManager {
    const dummyMesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    const dummyScene = new THREE.Group();
    dummyScene.add(dummyMesh);

    const gltfMock = mock<GLTF>();
    gltfMock.scene = dummyScene;

    const defaultAssetManagerMock = mockDeep<AssetManager>();
    defaultAssetManagerMock.get.mockReturnValue(gltfMock);
    return defaultAssetManagerMock;
}

function makeBlastSkill(overrides: BlastSkillTestOverrides = {}): BlastSkill {
    return new BlastSkill(
        overrides.onCompletedCallback ?? vi.fn(),
        overrides.assetManager ?? createDefaultAssetManager(),
        overrides.audioManager ?? mockDeep<AudioManager>(),
        overrides.uiManager ?? mockDeep<any>(),
        physicsBodyMetadataManager
    );
}

describe('BlastSkill', () => {
    let skill: BlastSkill;

    beforeEach(() => {
        vi.clearAllMocks();
        skill = makeBlastSkill();
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Blast');
            expect(skill.cooldown).toBe(10);
            expect(skill.tpCost).toBe(300);
        });
    });

    it('plays the area attack skill sound when executed', () => {
        const audioManagerMock = mockDeep<AudioManager>();
        const player = makePlayer(Tier.STABLE);
        const scene = { add: vi.fn(), remove: vi.fn() } as any;
        const world = { bodies: [] } as any;
        const skill = makeBlastSkill({ audioManager: audioManagerMock });
        skill.use(player, scene, world);
        expect(audioManagerMock.playBlastSkill).toHaveBeenCalledOnce();
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE, 300],
            [Tier.BROKEN, 300],
            [Tier.MAINTAINED, 600],
            [Tier.OVERCLOCKED, 900],
            [Tier.ZERODAY, 1500],
            [Tier.LEET, 2400],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.BLAST);
        });
    });

    describe('execute()', () => {
        it.each([
            [Tier.STABLE, 320, 1],
            [Tier.MAINTAINED, 640, 2],
            [Tier.OVERCLOCKED, 1280, 3],
            [Tier.ZERODAY, 2560, 3],
            [Tier.LEET, 5120, 4],
        ])('sets effectiveDamage=%i and effectiveWaves=%i at tier %s', (tier, damage, waves) => {
            const player = makePlayer(tier);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            skill.use(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(damage);
            expect((skill as any).effectiveWaves).toBe(waves);
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            skill.use(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('resets effectTimer to 0 even when it had a residual value', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).effectTimer = 0.5;
            skill.use(player, scene, world);
            expect((skill as any).effectTimer).toBe(0);
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            skill.use(player, scene, world);
            skill.update(0.2);
            expect((skill as any).effectTimer).toBeCloseTo(0.2);
        });

        it('calls cleanup when effectTimer exceeds DURATION', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            skill.use(player, scene, world);
            skill.update(100); // Far exceeds DURATION of 0.8s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 5.0;
            skill.update(1.0);
            expect((skill as any).cooldownTimer).toBeCloseTo(4.0);
        });

        it('does not damage enemies beyond RANGE', () => {
            const player = makePlayer(Tier.STABLE);
            const nearEnemy = makeEnemy(2, 0);
            const farEnemy = makeEnemy(20, 0);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [nearEnemy.body, farEnemy.body] } as any;
            skill.use(player, scene, world);

            // Update to about half the duration so wave is expanded
            skill.update(0.4);
            expect(nearEnemy.enemy.takeDamage).toHaveBeenCalled();
            expect(farEnemy.enemy.takeDamage).not.toHaveBeenCalled();
        });

        it('does not hit enemies when execute resets residual effectTimer', () => {
            const player = makePlayer(Tier.STABLE);
            const farEnemy = makeEnemy(4, 0);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [farEnemy.body] } as any;

            // Simulate residual effectTimer from a previous interrupted execution
            (skill as any).effectTimer = 0.7;
            skill.use(player, scene, world);

            // First update with a small dt should produce a small scale, not hit far enemies
            skill.update(0.016);
            expect(farEnemy.enemy.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('cleanup()', () => {
        it('sets isBeingExecuted to false', () => {
            (skill as any).isBeingExecuted = true;
            (skill as any).cleanup();
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('calls onCompletedCallback', () => {
            const callback = vi.fn();
            const skill = makeBlastSkill({ onCompletedCallback: callback });
            skill.cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 0.5;
            skill.cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
