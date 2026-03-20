import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { UIManager } from '../ui/UIManager';

/**
 * Base class for all player skills
 */
export abstract class Skill {
    name: string;
    cooldown: number; // Cooldown duration in seconds
    tpCost: number; // TP cost to use the skill
    protected cooldownTimer: number = 0; // Current cooldown timer
    protected onCompletedCallback: () => void; // To be called when skill effect is completed
    // Optional icon path for UI
    icon: string;

    constructor(name: string, cooldown: number, tpCost: number, onCompletedCallback: () => void, icon: string) {
        this.name = name;
        this.cooldown = cooldown;
        this.tpCost = tpCost;
        this.onCompletedCallback = onCompletedCallback;
        this.icon = icon;
    }

    /**
     * Cleanup resources used by the skill and call the onCompleted callback
     */
    abstract cleanup(): void;

    /**
     * Check if the cooldown has completed
     */
    isReady(): boolean {
        return this.cooldownTimer <= 0;
    }

    /**
     * Check if the player has enough TP to use the skill
     */
    canUse(player: Player): boolean {
        return player.tp >= this.getEffectiveTpCost(player);
    }

    /**
     * Returns the effective TP cost for this skill at the player's current tier.
     * Subclasses can override to add tier-based scaling.
     */
    getEffectiveTpCost(_player: Player): number {
        return this.tpCost;
    }

    /**
     * Execute the skill
     * @returns true if skill was successfully executed
     */
    use(player: Player, scene: THREE.Scene, world: CANNON.World): boolean {
        if (!this.isReady()) {
            return false;
        }

        if (!this.canUse(player)) {
            UIManager.Instance.displayInsufficientTPWarning();
            return false;
        }

        // Consume TP
        player.tp -= this.getEffectiveTpCost(player);

        // Start cooldown, reduced by any collection bonus (C.002: 10% reduction)
        this.cooldownTimer = this.cooldown * (1 - player.collectionBonusSkillCooldownReduction);

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
