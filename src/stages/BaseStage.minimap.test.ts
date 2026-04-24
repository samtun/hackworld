import { describe, it, expect } from 'vitest';
import { BaseStage } from './BaseStage';
import type { StageMinimapLayout } from './StageMinimapLayout';

function makeStage(layout: StageMinimapLayout | null, teleporter?: { position: { x: number; z: number }; isActive: boolean }) {
    const stage = Object.create(BaseStage.prototype) as any;
    stage.minimapLayout = layout;
    stage.teleporter = teleporter;
    stage.dungeonRooms = [];
    stage.enemies = [];
    stage.roomEnemyMap = new Map();
    return stage as BaseStage;
}

describe('BaseStage.getMinimapLayout', () => {
    it('injects teleporter marker with active state when teleporter exists', () => {
        const stage = makeStage(
            {
                rects: [],
                bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
            },
            { position: { x: 12, z: -7 }, isActive: true },
        );

        const layout = stage.getMinimapLayout();

        expect(layout?.teleporter).toEqual({ x: 12, z: -7, active: true });
    });

    it('returns layout without teleporter when teleporter is absent', () => {
        const baseLayout: StageMinimapLayout = {
            rects: [],
            bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
        };
        const stage = makeStage(baseLayout);

        const layout = stage.getMinimapLayout();

        expect(layout).toEqual(baseLayout);
        expect(layout?.teleporter).toBeUndefined();
    });

    it('marks cleared rooms with cleared:true when all their enemies are dead', () => {
        const fakeEnemy = { id: 'e1' } as any;
        const stage = Object.create(BaseStage.prototype) as any;
        stage.teleporter = undefined;
        stage.minimapLayout = {
            rects: [
                { x: 0, z: 0, width: 10, depth: 10, kind: 'room', roomId: 1 },
                { x: 20, z: 0, width: 10, depth: 10, kind: 'room', roomId: 2 },
                { x: 10, z: 0, width: 4, depth: 4, kind: 'corridor' },
            ],
            bounds: { minX: -5, maxX: 25, minZ: -5, maxZ: 5 },
        };
        stage.dungeonRooms = [{ id: 1 }, { id: 2 }];
        // room 1 still has a living enemy; room 2's enemy is dead (not in enemies array)
        stage.enemies = [fakeEnemy];
        stage.roomEnemyMap = new Map([
            [1, [fakeEnemy]],
            [2, []],
        ]);

        const layout = stage.getMinimapLayout()!;
        const room1 = layout.rects.find((r: any) => r.roomId === 1)!;
        const room2 = layout.rects.find((r: any) => r.roomId === 2)!;
        const corridor = layout.rects.find((r: any) => r.kind === 'corridor')!;

        expect(room1.cleared).toBeUndefined();
        expect(room2.cleared).toBe(true);
        expect(corridor.cleared).toBeUndefined();
    });
});
