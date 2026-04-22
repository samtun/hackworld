import { describe, it, expect } from 'vitest';
import { BaseStage } from './BaseStage';
import type { StageMinimapLayout } from './StageMinimapLayout';

function makeStage(layout: StageMinimapLayout | null, teleporter?: { position: { x: number; z: number }; isActive: boolean }) {
    const stage = Object.create(BaseStage.prototype) as any;
    stage.minimapLayout = layout;
    stage.teleporter = teleporter;
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

    it('returns layout unchanged when teleporter is absent', () => {
        const baseLayout: StageMinimapLayout = {
            rects: [],
            bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
        };
        const stage = makeStage(baseLayout);

        const layout = stage.getMinimapLayout();

        expect(layout).toBe(baseLayout);
    });
});
