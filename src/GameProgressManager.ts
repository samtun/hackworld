import { singleton } from "tsyringe";

/**
 * Game Progress Manager - Singleton to track player's quest progression
 * 
 * Manages the main quest line progress through the game's stages.
 * Progress is represented by a number indicating how far the player has advanced:
 * 
 * Progress Values:
 * 0 - Initial state (no stages accessible on teleporter)
 * 1 - Talked to Mainframe for first time (Network Matrix unlocked)
 * 2 - Network Matrix cleared
 * 3 - Talked to Mainframe (Packet Forge unlocked)
 * 4 - Packet Forge cleared
 * 5 - Talked to Mainframe (Cipher Null unlocked)
 * 6 - Cipher Null cleared
 * 7 - Talked to Mainframe (Security Core unlocked)
 * 8 - Security Core cleared
 * 9 - Talked to Mainframe (Kernel Terminus unlocked)
 * 10 - Kernel Terminus cleared
 * ... (pattern continues for future stages)
 * 
 * This system allows for incremental unlocking of game content through
 * dialogue and boss defeats, creating a structured progression.
 */
@singleton()
export class GameProgressManager {
    private _progress: number = 0;

    /**
     * Get the current game progress value
     */
    get progress(): number {
        return this._progress;
    }

    /**
     * Set the game progress value
     * @param value - The progress value to set (will be floored to nearest integer)
     */
    set progress(value: number) {
        // Progress is always an integer value (no fractional progress)
        this._progress = Math.max(0, Math.floor(value));
    }

    /**
     * Advance progress by 1
     */
    advanceProgress(): void {
        this._progress++;
    }

    /**
     * Check if the player has talked to mainframe for the first time
     */
    hasMetMainframe(): boolean {
        return this._progress >= 1;
    }

    /**
     * Check if a stage boss has been defeated
     * @param requiredProgress - The required progress value of the stage
     */
    hasStageBossBeenDefeated(requiredProgress: number): boolean {
        return this._progress >= requiredProgress + 1;
    }

    /**
     * Mark that the player defeated a stage boss
     * @param requiredProgress - The required progress value of the stage
     */
    markBossDefeated(requiredProgress: number): void {
        if (this._progress === requiredProgress) {
            this._progress = requiredProgress + 1;
        }
    }

    /**
     * Get the number of stages currently unlocked
     */
    getUnlockedStageCount(): number {
        // Every odd/even pair unlocks one additional stage
        return Math.ceil(this._progress / 2);
    }

    /**
     * Reset progress to initial state
     */
    reset(): void {
        this._progress = 0;
    }

    /**
     * Load progress from save data
     */
    load(progress: number): void {
        this._progress = Math.max(0, Math.floor(progress));
    }
}
