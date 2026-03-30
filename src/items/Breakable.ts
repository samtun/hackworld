/**
 * Interface for entities that can be destroyed by player attacks (weapon hits, skills).
 * Breakable entities attach themselves to a physics body via `(body as any).entity = this`
 * so the weapon collision system can detect and call {@link onHit}.
 */
export interface Breakable {
    /** Whether this entity has already been destroyed. */
    isDestroyed: boolean;
    /** Called when the entity receives any hit (weapon or skill). A single hit suffices. */
    onHit(): void;
}
