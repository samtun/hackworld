/**
 * Game Progress Manager - Singleton to track player's quest progression
 * 
 * Manages the main quest line progress through the game's stages.
 * Progress is represented by a number indicating how far the player has advanced:
 * 
 * Progress Values:
 * 0 - Initial state (no stages accessible on teleporter)
 * 1 - Talked to Mainframe for first time (first stage unlocked)
 * 2 - First stage boss defeated
 * 3 - Talked to Mainframe after first boss (second stage unlocked)
 * 4 - Second stage boss defeated
 * 5 - Talked to Mainframe after second boss (third stage unlocked)
 * ... (pattern continues for future stages)
 * 
 * This system allows for incremental unlocking of game content through
 * dialogue and boss defeats, creating a structured progression.
 */
export class GameProgressManager {
    private static instance: GameProgressManager;
    
    private _progress: number = 0;
    
    private constructor() {
        // Private constructor for singleton
    }
    
    public static get Instance(): GameProgressManager {
        if (!GameProgressManager.instance) {
            GameProgressManager.instance = new GameProgressManager();
        }
        return GameProgressManager.instance;
    }
    
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
        // Progress 1,2 = 1 stage unlocked
        // Progress 3,4 = 2 stages unlocked
        // Progress 5,6 = 3 stages unlocked
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
