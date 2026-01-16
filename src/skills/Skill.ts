import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';

/**
 * Base class for all player skills
 */
export abstract class Skill {
    name: string;
    cooldown: number; // Cooldown duration in seconds
    tpCost: number; // TP cost to use the skill
    protected cooldownTimer: number = 0; // Current cooldown timer

    constructor(name: string, cooldown: number, tpCost: number = 0) {
        this.name = name;
        this.cooldown = cooldown;
        this.tpCost = tpCost;
    }

    /**
     * Check if the skill is ready to be used (cooldown expired and enough TP)
     */
    canUse(player: Player): boolean {
        return this.cooldownTimer <= 0 && player.tp >= this.tpCost;
    }

    /**
     * Execute the skill
     * @returns true if skill was successfully executed
     */
    use(player: Player, scene: THREE.Scene, world: CANNON.World): boolean {
        if (!this.canUse(player)) {
            return false;
        }

        // Consume TP
        player.tp -= this.tpCost;

        // Start cooldown
        this.cooldownTimer = this.cooldown;

        // Execute skill-specific logic
        this.execute(player, scene, world);

        return true;
    }

    /**
     * Update cooldown timer
     */
    update(dt: number): void {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
    }

    /**
     * Get remaining cooldown time
     */
    getRemainingCooldown(): number {
        return Math.max(0, this.cooldownTimer);
    }

    /**
     * Check if skill is on cooldown
     */
    isOnCooldown(): boolean {
        return this.cooldownTimer > 0;
    }

    /**
     * Skill-specific execution logic
     */
    protected abstract execute(player: Player, scene: THREE.Scene, world: CANNON.World): void;
}
