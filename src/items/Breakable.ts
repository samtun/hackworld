/**
 * Interface for entities that can be destroyed by player attacks (weapon hits, skills).
 * Breakable entities register themselves with their physics body so the weapon
 * collision system can detect and call {@link onHit}.
 */
export interface Breakable {
    /** Whether this entity has already been destroyed. */
    isDestroyed: boolean;
    /** Called when the entity receives any hit (weapon or skill). A single hit suffices. */
    onHit(): void;
}
