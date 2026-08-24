import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RangedSkill } from './RangedSkill';
import { AudioManager } from '../../AudioManager';
import { Enemy } from '../../enemies/Enemy';
import { Tier } from '../../items/TierManager';
import { SkillTechType } from './SkillType';
import type { Player } from '../Player';
import { GLTF } from 'three/examples/jsm/Addons.js';
import { mock, mockDeep } from 'vitest-mock-extended';
import { AssetManager } from '../../AssetManager';
import { PhysicsBodyMetadataManager } from '../../PhysicsBodyMetadata';

const physicsBodyMetadataManager = new PhysicsBodyMetadataManager();

interface RangedSkillTestOverrides {
    onCompletedCallback?: () => void;
    assetManager?: any;
    audioManager?: AudioManager;
    uiManager?: any;
}

function makeEnemy(x: number, y: number, z: number) {
    const enemy = Object.create(Enemy.prototype);
    enemy.isDead = false;
    enemy.isDying = false;
    enemy.takeDamage = vi.fn();
    const body = { position: { x, y, z } } as any;
    physicsBodyMetadataManager.registerEnemyBody(body, enemy);
    return { enemy, body };
}

function makePlayer(tier = Tier.STABLE) {
    return {
        id: 'p1',
        tp: 2000, maxTp: 2000,
        hp: 50, maxHp: 100,
        skills: [],
        getSkillTier: vi.fn().mockReturnValue(tier),
        getForwardDirection: vi.fn().mockReturnValue({
            x: 0, y: 0, z: 1,
            clone: vi.fn().mockReturnThis(),
            normalize: vi.fn().mockReturnThis(),
            multiplyScalar: vi.fn().mockReturnThis(),
        }),
        getRotationY: vi.fn().mockReturnValue(0),
        body: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } },
        position: { x: 0, y: 0, z: 0 },
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

function makeRangedSkill(overrides: RangedSkillTestOverrides = {}): RangedSkill {
    return new RangedSkill(
        overrides.onCompletedCallback ?? vi.fn(),
        overrides.assetManager ?? createDefaultAssetManager(),
        overrides.audioManager ?? mockDeep<AudioManager>(),
        overrides.uiManager ?? mockDeep<any>(),
        physicsBodyMetadataManager
    );
}

describe('RangedSkill', () => {
    let skill: RangedSkill;

    beforeEach(() => {
        vi.clearAllMocks();
        skill = makeRangedSkill();
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Ranged');
            expect(skill.cooldown).toBe(5);
            expect(skill.tpCost).toBe(250);
        });
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE, 250],
            [Tier.BROKEN, 250],
            [Tier.MAINTAINED, 500],
            [Tier.OVERCLOCKED, 750],
            [Tier.ZERODAY, 1250],
            [Tier.LEET, 2000],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.RANGED);
        });
    });

    describe('execute()', () => {
        it('sets effectiveDamage to BASE_DAMAGE at STABLE tier', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(200);
        });

        it('multiplies effectiveDamage by 3 at MAINTAINED tier', () => {
            const player = makePlayer(Tier.MAINTAINED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(600);
        });

        it('multiplies effectiveDamage by 6 at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(1200);
        });

        it('sets effectiveRadius to 1.5x at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).effectiveRadius).toBe(1.5);
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('sets isLeet to true at LEET tier', () => {
            const player = makePlayer(Tier.LEET);
            player.tp = 5000;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).isLeet).toBe(true);
        });

        it('calls player.getForwardDirection during execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.getForwardDirection).toHaveBeenCalled();
        });

        it('plays the laser beam skill sound when executed', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            const skill = makeRangedSkill({ audioManager: audioManagerMock });
            skill.use(player, scene, world);
            expect(audioManagerMock.playRangedSkill).toHaveBeenCalledOnce();
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE);
            player.tp = 2000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            (skill as any).effectTimer = 0;
            skill.update(0.2);
            expect((skill as any).effectTimer).toBeCloseTo(0.2);
        });

        it('calls cleanup when effectTimer exceeds DURATION', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            skill.update(100); // Far exceeds DURATION of 0.6s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 3.0;
            skill.update(1.0);
            expect((skill as any).cooldownTimer).toBeCloseTo(2.0);
        });

        it('does not hit enemies beyond RANGE even with a large dt', () => {
            const player = makePlayer(Tier.STABLE);
            // Place enemy along Z axis at distance 12 (beyond RANGE=10)
            const farEnemy = makeEnemy(0, 0.5, 12);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [farEnemy.body], addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            // Large dt that pushes progress well past 1, which previously caused
            // currentLength to exceed RANGE
            skill.update(10);
            expect(farEnemy.enemy.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('cleanup()', () => {
        it('sets isBeingExecuted to false', () => {
            (skill as any).isBeingExecuted = true;
            skill.cleanup();
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('calls onCompletedCallback', () => {
            const callback = vi.fn();
            const skill = makeRangedSkill({ onCompletedCallback: callback });
            skill.cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 0.4;
            skill.cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
