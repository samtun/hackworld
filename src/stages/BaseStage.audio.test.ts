import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playStageCleared: vi.fn(),
        },
    },
}));

import { BaseStage } from './BaseStage';
import { AudioManager } from '../AudioManager';

describe('BaseStage teleporter activation audio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('plays the stage-clear sound when the teleporter activates', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        const teleporter = {
            isActive: false,
            activate: vi.fn(),
        };

        Object.assign(stage, {
            teleporters: [teleporter],
            enemies: [],
            roomPendingSpawnData: new Map(),
            totalExpectedEnemies: 4,
        });

        stage.checkTeleporterActivation();

        expect(AudioManager.Instance.playStageCleared).toHaveBeenCalledOnce();
        expect(teleporter.activate).toHaveBeenCalledOnce();
    });
});
