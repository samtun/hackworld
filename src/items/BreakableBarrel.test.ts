import { describe, it, expect, vi } from 'vitest';

const audioManagerMock = vi.hoisted(() => ({
    playBarrelBreak: vi.fn(),
}));

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: audioManagerMock,
    },
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    class Euler {
        x = 0; y = 0; z = 0;
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    const mockPositionAttr = {
        count: 0,
        getX: vi.fn().mockReturnValue(0),
        getY: vi.fn().mockReturnValue(0),
        getZ: vi.fn().mockReturnValue(0),
        setX: vi.fn(),
        setZ: vi.fn(),
        needsUpdate: false,
    };
    return {
        Vector3: V3,
        BoxGeometry: class { dispose = vi.fn(); },
        CylinderGeometry: class {
            dispose = vi.fn();
            attributes = { position: mockPositionAttr };
            computeVertexNormals = vi.fn();
        },
        MeshStandardMaterial: class {
            color = { setHex: vi.fn() };
            dispose = vi.fn();
            transparent = false;
            opacity = 1;
        },
        Mesh: class {
            position = new V3();
            rotation = new Euler();
            castShadow = false;
            receiveShadow = false;
            geometry = { dispose: vi.fn(), attributes: { position: mockPositionAttr }, computeVertexNormals: vi.fn() };
            material = new (class { dispose = vi.fn(); transparent = false; opacity = 1; })();
        },
        Material: class {},
    };
});

vi.mock('cannon-es', () => {
    class Vec3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    return {
        Vec3,
        Box: class {},
        Cylinder: class {},
        Body: class {
            addShape = vi.fn();
            position = new Vec3();
        },
    };
});

import { BreakableBarrel } from './BreakableBarrel';

function makeBarrel(): { barrel: BreakableBarrel; scene: any; world: any } {
    const scene = { add: vi.fn(), remove: vi.fn() } as any;
    const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
    const CANNON = require('cannon-es');
    const barrel = new BreakableBarrel(scene, world, {} as any, new CANNON.Vec3(5, 0, 5));
    return { barrel, scene, world };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BreakableBarrel', () => {
    it('starts not destroyed', () => {
        const { barrel } = makeBarrel();
        expect(barrel.isDestroyed).toBe(false);
    });

    it('sets entity reference on body', () => {
        const { barrel } = makeBarrel();
        expect((barrel.body as any).entity).toBe(barrel);
    });

    it('onHit sets isDestroyed to true and removes mesh + body', () => {
        const { barrel, scene, world } = makeBarrel();
        audioManagerMock.playBarrelBreak.mockClear();
        barrel.onHit();
        expect(barrel.isDestroyed).toBe(true);
        expect(audioManagerMock.playBarrelBreak).toHaveBeenCalledOnce();
        expect(scene.remove).toHaveBeenCalled();
        expect(world.removeBody).toHaveBeenCalled();
    });

    it('onHit is idempotent (second call is ignored)', () => {
        const { barrel, scene } = makeBarrel();
        audioManagerMock.playBarrelBreak.mockClear();
        barrel.onHit();
        const removeCalls = scene.remove.mock.calls.length;
        barrel.onHit();
        expect(audioManagerMock.playBarrelBreak).toHaveBeenCalledOnce();
        // Second onHit should not add more scene.remove calls (only fragment cleanup later)
        expect(scene.remove.mock.calls.length).toBe(removeCalls);
    });

    it('cleanup removes mesh and body when not destroyed', () => {
        const { barrel, scene, world } = makeBarrel();
        barrel.cleanup();
        expect(scene.remove).toHaveBeenCalled();
        expect(world.removeBody).toHaveBeenCalled();
    });

    it('cleanup does not double-remove when already destroyed', () => {
        const { barrel, scene } = makeBarrel();
        barrel.onHit();
        // Finish the animation first
        barrel.update(1.2);
        const afterAnimCalls = scene.remove.mock.calls.length;
        barrel.cleanup();
        // cleanup should not add more remove calls after animation is done
        expect(scene.remove.mock.calls.length).toBe(afterAnimCalls);
    });

    describe('generateDrop', () => {
        it('only allows weapon/chip/core in the rare roll ranges', () => {
            const { barrel } = makeBarrel();
            const player = { luckDropChanceBonus: 0 } as any;
            const weaponDrop = {} as any;
            const chipDrop = {} as any;
            const coreDrop = {} as any;
            vi.spyOn(barrel as any, 'generateWeaponDrop').mockReturnValue(weaponDrop);
            vi.spyOn(barrel as any, 'generateChipDrop').mockReturnValue(chipDrop);
            vi.spyOn(barrel as any, 'generateCoreDrop').mockReturnValue(coreDrop);
            vi.spyOn(barrel as any, 'generateMoneyDrop').mockReturnValue({} as any);
            vi.spyOn(barrel as any, 'generatePotionDrop').mockReturnValue({} as any);
            const randomSpy = vi.spyOn(Math, 'random');

            randomSpy.mockReturnValueOnce(0.005);
            expect(barrel.generateDrop({} as any, player)).toBe(weaponDrop);

            randomSpy.mockReturnValueOnce(0.015);
            expect(barrel.generateDrop({} as any, player)).toBe(chipDrop);

            randomSpy.mockReturnValueOnce(0.025);
            expect(barrel.generateDrop({} as any, player)).toBe(coreDrop);

            randomSpy.mockReturnValueOnce(0.04);
            barrel.generateDrop({} as any, player);
            expect((barrel as any).generateMoneyDrop).toHaveBeenCalledOnce();

            randomSpy.mockReturnValueOnce(0.2);
            barrel.generateDrop({} as any, player);
            expect((barrel as any).generatePotionDrop).toHaveBeenCalledOnce();

            randomSpy.mockReturnValueOnce(0.5);
            expect(barrel.generateDrop({} as any, player)).toBeNull();

            randomSpy.mockRestore();
        });
    });

    describe('destruction animation', () => {
        it('spawns 8 fragment meshes on hit', () => {
            const { barrel, scene } = makeBarrel();
            barrel.onHit();
            // 1 call for removing original mesh + 8 calls for adding fragments
            const addCalls = scene.add.mock.calls.length;
            // Constructor adds 1 (the barrel mesh), then onHit adds 8 fragments
            expect(addCalls).toBe(1 + 8);
        });

        it('fragments are not removed before FADE_END', () => {
            const { barrel, scene } = makeBarrel();
            barrel.onHit();
            const removeCalls = scene.remove.mock.calls.length;
            barrel.update(0.5);
            expect(scene.remove.mock.calls.length).toBe(removeCalls);
        });

        it('opacity stays at 1 before 0.8s', () => {
            const { barrel } = makeBarrel();
            barrel.onHit();
            barrel.update(0.5);
            // Access private fragments via cast to check opacity
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(8);
            expect(frags[0].mesh.material.opacity).toBe(1);
        });

        it('opacity is between 0 and 1 during fade window (0.8s–1.1s)', () => {
            const { barrel } = makeBarrel();
            barrel.onHit();
            barrel.update(0.95);
            const frags = (barrel as any).fragments;
            expect(frags[0].mesh.material.opacity).toBeGreaterThan(0);
            expect(frags[0].mesh.material.opacity).toBeLessThan(1);
        });

        it('fragments are disposed after 1.1s', () => {
            const { barrel, scene } = makeBarrel();
            barrel.onHit();
            barrel.update(1.2);
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(0);
            // 8 fragments removed from scene (plus the original mesh)
            expect(scene.remove).toHaveBeenCalledTimes(1 + 8);
        });

        it('update is a no-op when barrel is not destroyed', () => {
            const { barrel, scene } = makeBarrel();
            barrel.update(1.0);
            // Only the constructor add call
            expect(scene.add).toHaveBeenCalledTimes(1);
        });

        it('update is a no-op after animation is done', () => {
            const { barrel, scene } = makeBarrel();
            barrel.onHit();
            barrel.update(1.2);
            const removeCalls = scene.remove.mock.calls.length;
            barrel.update(1.0);
            expect(scene.remove.mock.calls.length).toBe(removeCalls);
        });

        it('cleanup disposes in-flight fragments', () => {
            const { barrel, scene } = makeBarrel();
            barrel.onHit();
            barrel.update(0.3);
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(8);
            barrel.cleanup();
            expect((barrel as any).fragments.length).toBe(0);
            // Original mesh + 8 fragments removed
            expect(scene.remove).toHaveBeenCalledTimes(1 + 8);
        });

        it('fragments move downward under gravity', () => {
            const { barrel } = makeBarrel();
            barrel.onHit();
            const frags = (barrel as any).fragments;
            const initialY = frags[0].mesh.position.y;
            // Step enough frames to let gravity overcome initial upward velocity
            // (max initial vy is 4 m/s, gravity is 9.8 m/s²; 25 × 0.05 = 1.25s is enough)
            for (let i = 0; i < 25; i++) barrel.update(0.05);
            expect(frags[0].mesh.position.y).toBeLessThan(initialY);
        });
    });
});
