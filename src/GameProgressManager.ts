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
     * Check if a specific stage is unlocked based on current progress
     * @param stageIndex - The 1-based index of the stage (1 for first dungeon, 2 for second, etc.)
     * @returns true if the stage is unlocked
     */
    isStageUnlocked(stageIndex: number): boolean {
        // Stage N is unlocked at progress (2*N - 1)
        // Stage 1 unlocked at progress 1 (talked to mainframe first time)
        // Stage 2 unlocked at progress 3 (defeated boss 1 + talked to mainframe)
        // Stage 3 unlocked at progress 5 (defeated boss 2 + talked to mainframe)
        const requiredProgress = (2 * stageIndex) - 1;
        return this._progress >= requiredProgress;
    }
    
    /**
     * Check if the player has talked to mainframe for the first time
     */
    hasMetMainframe(): boolean {
        return this._progress >= 1;
    }
    
    /**
     * Check if a stage boss has been defeated
     * @param stageIndex - The 1-based index of the stage
     */
    hasStageBossBeenDefeated(stageIndex: number): boolean {
        // Boss N is defeated at progress (2*N)
        const requiredProgress = 2 * stageIndex;
        return this._progress >= requiredProgress;
    }
    
    /**
     * Mark that the player defeated a stage boss
     * @param stageIndex - The 1-based index of the stage
     */
    markBossDefeated(stageIndex: number): void {
        const expectedProgress = (2 * stageIndex) - 1; // Should be at "stage unlocked" state
        if (this._progress === expectedProgress) {
            this._progress = 2 * stageIndex; // Advance to "boss defeated" state
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
