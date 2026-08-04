import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RecoverySkill } from './RecoverySkill';
import { AudioManager } from '../../AudioManager';
import { AssetManager } from '../../AssetManager';
import { Tier } from '../../items/TierManager';
import { SkillTechType } from './SkillType';
import type { Player } from '../Player';
import { UIManager } from '../../ui/UIManager';
import { mock, mockDeep } from 'vitest-mock-extended';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface RecoverySkillTestOverrides {
    onCompletedCallback?: () => void,
    assetManager?: AssetManager,
    audioManager?: AudioManager,
    uiManager?: UIManager,
}

function makePlayer(tier = Tier.STABLE, hp = 50, maxHp = 100) {
    return {
        id: 'p1',
        tp: 1000, maxTp: 1000,
        hp, maxHp,
        skills: [],
        getSkillTier: vi.fn().mockReturnValue(tier),
        heal: vi.fn(),
        tryIncrementSkillTech: vi.fn(),
        body: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } },
        position: { x: 0, y: 0, z: 0 },
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

function makeRecoverySkill(overrides: RecoverySkillTestOverrides = {}) {
    return new RecoverySkill(
        overrides.onCompletedCallback || vi.fn(),
        overrides.assetManager || createDefaultAssetManager(),
        overrides.audioManager || mockDeep<AudioManager>(),
        overrides.uiManager || mockDeep<UIManager>()
    );
}

describe('RecoverySkill', () => {
    let skill: RecoverySkill;

    beforeEach(() => {
        vi.clearAllMocks();
        skill = makeRecoverySkill();
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Recovery');
            expect(skill.cooldown).toBe(5);
            expect(skill.tpCost).toBe(200);
        });
    });

    it('plays the healing skill sound when executed', () => {
        const audioManager = mockDeep<AudioManager>();
        const player = makePlayer(Tier.STABLE);
        const scene = { add: vi.fn(), remove: vi.fn() } as any;
        const world = {} as any;
        const skill = makeRecoverySkill({ audioManager: audioManager });
        skill.use(player, scene, world);
        expect(audioManager.playRecoverySkill).toHaveBeenCalledOnce();
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE, 200],
            [Tier.BROKEN, 200],
            [Tier.MAINTAINED, 400],
            [Tier.OVERCLOCKED, 600],
            [Tier.ZERODAY, 1200],
            [Tier.LEET, 2000],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.RECOVERY);
        });
    });

    describe('execute() via use()', () => {
        it('calls player.heal with BASE_HEAL_AMOUNT at STABLE tier', () => {
            const player = makePlayer(Tier.STABLE, 0, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.heal).toHaveBeenCalledWith(400, 0, true);
        });

        it('calls player.heal with 800 at MAINTAINED tier when hp=0', () => {
            const player = makePlayer(Tier.MAINTAINED, 0, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.heal).toHaveBeenCalledWith(800, 0, true);
        });

        it('calls player.heal capped to remaining HP at MAINTAINED tier', () => {
            const player = makePlayer(Tier.MAINTAINED, 600, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            // healAmount=800, maxHp-hp=400 → actualHeal=400
            expect(player.heal).toHaveBeenCalledWith(400, 0, true);
        });

        it('calls tryIncrementSkillTech when HP < maxHp', () => {
            const player = makePlayer(Tier.STABLE, 500, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.tryIncrementSkillTech).toHaveBeenCalledWith(SkillTechType.RECOVERY);
        });

        it('does NOT call tryIncrementSkillTech when already at full HP', () => {
            const player = makePlayer(Tier.STABLE, 1000, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.tryIncrementSkillTech).not.toHaveBeenCalled();
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE, 500, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('sets recoveryRemaining at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED, 0, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).recoveryRemaining).toBe(5);
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE, 500, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            (skill as any).effectTimer = 0;
            skill.update(0.3);
            expect((skill as any).effectTimer).toBeCloseTo(0.3);
        });

        it('calls cleanup and sets isBeingExecuted=false when effectTimer exceeds duration', () => {
            const player = makePlayer(Tier.STABLE, 500, 1000);
            player.tp = 1000;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            skill.update(100); // Far exceeds effectiveDuration of 1.5s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 2.0;
            skill.update(0.5);
            expect((skill as any).cooldownTimer).toBeCloseTo(1.5);
        });

        it('applies recovery healing over time at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED, 500, 1000);
            // Set up recovery state directly to avoid coupling with execute/use flow
            (skill as any).recoveryPlayer = player;
            (skill as any).recoveryRemaining = 5;
            (skill as any).recoveryHealPerSecond = 32;
            (skill as any).recoveryTimer = 0;

            const callsBefore = (player.heal as ReturnType<typeof vi.fn>).mock.calls.length;
            skill.update(1.0); // 1 second → recovery fires once
            expect((player.heal as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
            expect(player.heal).toHaveBeenCalledWith(32, 0, true);
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
            const skill = makeRecoverySkill({ onCompletedCallback: callback });
            (skill as any).cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 1.2;
            (skill as any).cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
