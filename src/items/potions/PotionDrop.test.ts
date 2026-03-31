import { describe, it, expect, vi } from 'vitest';
import { PotionType, getPotionAmount } from './PotionDefinitions';
import { ItemDropType } from '../ItemDropType';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
        copy(v: V3) { this.x = v.x; this.y = v.y; this.z = v.z; }
    }
    return {
        Vector3: V3,
        Group: class {
            children: any[] = [];
            position = new V3();
            rotation = { x: 0, y: 0, z: 0 };
            add(child: any) { this.children.push(child); }
        },
        SphereGeometry: class { dispose = vi.fn(); },
        MeshStandardMaterial: class { dispose = vi.fn(); },
        Mesh: class {
            position = new V3();
            geometry = { dispose: vi.fn() };
            material = { dispose: vi.fn() };
        },
        Material: class {},
    };
});

vi.mock('cannon-es', () => {
    class Vec3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    }
    return { Vec3 };
});

import { PotionDrop } from './PotionDrop';

function makeScene() {
    return { add: vi.fn(), remove: vi.fn() } as any;
}

function makePosition(x = 0, y = 1, z = 0) {
    const CANNON = require('cannon-es');
    return new CANNON.Vec3(x, y, z);
}

// ─── PotionDrop construction ──────────────────────────────────────────────────

describe('PotionDrop', () => {
    it('creates an HP potion with correct properties', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.HP, 3);
        expect(drop.potionType).toBe(PotionType.HP);
        expect(drop.level).toBe(3);
        expect(drop.amount).toBe(getPotionAmount(PotionType.HP, 3));
        expect(drop.dropType).toBe(ItemDropType.HP_POTION);
    });

    it('creates a TP potion with correct properties', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.TP, 5);
        expect(drop.potionType).toBe(PotionType.TP);
        expect(drop.level).toBe(5);
        expect(drop.amount).toBe(getPotionAmount(PotionType.TP, 5));
        expect(drop.dropType).toBe(ItemDropType.TP_POTION);
    });

    it('adds the group to the scene', () => {
        const scene = makeScene();
        new PotionDrop(scene, makePosition(), PotionType.HP, 1);
        expect(scene.add).toHaveBeenCalledOnce();
    });

    it('creates the correct number of balls for each level', () => {
        for (let level = 1; level <= 6; level++) {
            const drop = new PotionDrop(makeScene(), makePosition(), PotionType.HP, level);
            expect(drop.mesh.children).toHaveLength(level);
        }
    });
});

// ─── PotionDrop.canPickup ─────────────────────────────────────────────────────

describe('PotionDrop.canPickup', () => {
    it('HP potion can be picked up when player HP is below max', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.HP, 1);
        expect(drop.canPickup({ hp: 50, maxHp: 170, tp: 60, maxTp: 60 })).toBe(true);
    });

    it('HP potion cannot be picked up when player HP is at max', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.HP, 1);
        expect(drop.canPickup({ hp: 170, maxHp: 170, tp: 30, maxTp: 60 })).toBe(false);
    });

    it('TP potion can be picked up when player TP is below max', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.TP, 1);
        expect(drop.canPickup({ hp: 170, maxHp: 170, tp: 30, maxTp: 60 })).toBe(true);
    });

    it('TP potion cannot be picked up when player TP is at max', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.TP, 1);
        expect(drop.canPickup({ hp: 50, maxHp: 170, tp: 60, maxTp: 60 })).toBe(false);
    });
});

// ─── PotionDrop.update ────────────────────────────────────────────────────────

describe('PotionDrop.update', () => {
    it('applies sinusoidal bobbing animation', () => {
        const drop = new PotionDrop(makeScene(), makePosition(0, 2, 0), PotionType.HP, 1);
        // After a quarter cycle (FLOAT_SPEED=2, period = π), peak at t = π/4 ≈ 0.785s
        drop.update(Math.PI / 4, {} as any, {} as any);
        expect(drop.mesh.position.y).toBeCloseTo(2 + 0.15, 2);
    });

    it('rotates the group at 1.5 rad/s', () => {
        const drop = new PotionDrop(makeScene(), makePosition(), PotionType.TP, 2);
        drop.update(1.0, {} as any, {} as any);
        expect(drop.mesh.rotation.y).toBeCloseTo(1.5, 5);
    });
});
