import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MainframeNpc } from './MainframeNpc';
import { GameProgressManager } from '../GameProgressManager';

describe('MainframeNpc', () => {
    beforeEach(() => {
        (GameProgressManager as any).instance = undefined;
    });

    it('unlocks a stage when interacting at progress 0', () => {
        const npc = Object.create(MainframeNpc.prototype) as MainframeNpc;
        npc.updateDialogue = vi.fn();
        GameProgressManager.Instance.progress = 0;

        (npc as any).onInteract();

        expect(GameProgressManager.Instance.progress).toBe(1);
        expect(npc.updateDialogue).toHaveBeenCalledWith(1);
    });

    it('does not unlock a stage when interacting at odd progress', () => {
        const npc = Object.create(MainframeNpc.prototype) as MainframeNpc;
        npc.updateDialogue = vi.fn();
        GameProgressManager.Instance.progress = 3;

        (npc as any).onInteract();

        expect(GameProgressManager.Instance.progress).toBe(3);
        expect(npc.updateDialogue).not.toHaveBeenCalled();
    });

    it('dialogue at progress 8 references Kernel Terminus and two boss sectors', () => {
        const dialogue = (MainframeNpc as any).getDialogueForProgress(8) as string[];
        expect(dialogue.join(' ')).toContain('Kernel Terminus');
        expect(dialogue.join(' ')).toContain('Two boss sectors');
    });
});
