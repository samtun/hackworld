import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import type { EnemyArchetypeConfig } from './Enemy';

enum BossAttackType {
    Melee1 = 'Melee1',
    Melee2 = 'Melee2',
    Ranged = 'Ranged'
}

export class BossEnemy extends Enemy {
    private attacks: BossAttackType[] = [BossAttackType.Melee1, BossAttackType.Melee2, BossAttackType.Ranged];
    private currentAttackType: BossAttackType = BossAttackType.Melee1;
    private nextAttackIndex: number = 0;
    
    // Health bar UI
    private healthBarContainer: HTMLDivElement | null = null;
    private healthBarFill: HTMLDivElement | null = null;
    private healthBarVisible: boolean = false;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        position: CANNON.Vec3,
        physicsMaterial: CANNON.Material,
        config: Partial<EnemyArchetypeConfig> = {},
    ) {
        super(scene, world, position, physicsMaterial, {
            maxHp: 500,
            speed: 4.5,
            damage: 25,
            baseExp: 120,
            itemDropChance: 1,
            techDropRateFactor: 1.6,
            xDataDropChanceWeight: 3,
            criticalChance: 0.07,
            criticalHitMultiplier: 1.5,
            blockChance: 0.2,
            size: 2.0,
            color: 0x000000,
            ...config,
        });

        // Create health bar UI
        this.setupHealthBar();
    }

    /**
     * Setup the health bar UI displayed at top center of screen
     */
    private setupHealthBar(): void {
        // Create container
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.style.position = 'fixed';
        this.healthBarContainer.style.top = '20px';
        this.healthBarContainer.style.left = '50%';
        this.healthBarContainer.style.transform = 'translateX(-50%)';
        this.healthBarContainer.style.width = '300px';
        this.healthBarContainer.style.height = '40px';
        this.healthBarContainer.style.zIndex = '1000';
        this.healthBarContainer.style.fontFamily = 'Arial, sans-serif';
        this.healthBarContainer.style.display = 'flex';
        this.healthBarContainer.style.flexDirection = 'column';
        this.healthBarContainer.style.gap = '5px';
        this.healthBarContainer.style.opacity = '0';
        this.healthBarContainer.style.transition = 'opacity 0.3s ease-in-out';
        this.healthBarContainer.style.pointerEvents = 'none';

        // Boss title
        const titleDiv = document.createElement('div');
        titleDiv.style.fontFamily = '"Space Grotesk", Arial, sans-serif';
        titleDiv.textContent = 'CORRUPTED CIPHER CLAW';
        titleDiv.style.color = '#ff4444';
        titleDiv.style.fontSize = '18px'; 
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.textAlign = 'center';
        this.healthBarContainer.appendChild(titleDiv);

        // Health bar background
        const barBg = document.createElement('div');
        barBg.style.width = '100%';
        barBg.style.height = '24px';
        barBg.style.backgroundColor = '#333333';
        barBg.style.border = '2px solid #ff4444';
        barBg.style.borderRadius = '4px';
        barBg.style.overflow = 'hidden';
        barBg.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.5)';

        // Health bar fill
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.style.width = '100%';
        this.healthBarFill.style.height = '100%';
        this.healthBarFill.style.backgroundColor = '#ff4444';
        this.healthBarFill.style.transition = 'width 0.2s ease-out';
        barBg.appendChild(this.healthBarFill);
        this.healthBarContainer.appendChild(barBg);

        document.body.appendChild(this.healthBarContainer);
    }

    /**
     * Show or hide the health bar
     */
    private setHealthBarVisible(visible: boolean): void {
        if (!this.healthBarContainer || this.healthBarVisible === visible) return;
        
        this.healthBarVisible = visible;
        this.healthBarContainer.style.opacity = visible ? '1' : '0';
        this.healthBarContainer.style.pointerEvents = visible ? 'auto' : 'none';
    }

    /**
     * Update the health bar UI
     */
    private updateHealthBar(): void {
        if (!this.healthBarFill) return;

        const healthPercent = Math.max(0, (this.hp / this.maxHp) * 100);
        this.healthBarFill.style.width = healthPercent + '%';
    }

    /**
     * Select the next attack in a rotating sequence
     */
    private selectNextAttack(): BossAttackType {
        const attack = this.attacks[this.nextAttackIndex];
        this.nextAttackIndex = (this.nextAttackIndex + 1) % this.attacks.length;
        return attack;
    }

    /**
     * Perform the boss's attack with different behaviors based on attack type
     */
    attack(): void {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;
        this.hasDealtDamageThisAttack = false;

        // Select next attack type
        this.currentAttackType = this.selectNextAttack();
        console.log(`Boss is performing attack: ${this.currentAttackType}`);

        // TODO handle different attack behaviors based on this.currentAttackType

        this.fadeToAction('Attack' as any, 0.1); // Use attack animation for all three attack types
    }

    /**
     * Override update to include health bar updates
     */
    update(dt: number): void {
        // Call parent update
        super.update(dt);

        // Update health bar visibility and content
        if (!this.isDead) {
            const shouldShowHealthBar = this.getDistanceToPlayer() < this.aggroRange;
            this.setHealthBarVisible(shouldShowHealthBar);
            this.updateHealthBar();
        } else {
            this.setHealthBarVisible(false);
        }
    }

    /**
     * Override takeDamage to update health bar on damage
     */
    takeDamage(amount: number, isCriticalHit: boolean, sourcePos?: CANNON.Vec3, knockbackFactor: number = 1.0): void {
        super.takeDamage(amount, isCriticalHit, sourcePos, knockbackFactor);
        this.updateHealthBar();
    }

    /**
     * Override die to clean up health bar
     */
    die(): void {
        super.die();
        // Health bar will be removed in cleanup
    }

    /**
     * Clean up boss resources including health bar
     */
    cleanup(): void {
        // Remove health bar from DOM
        if (this.healthBarContainer && this.healthBarContainer.parentNode) {
            this.healthBarContainer.parentNode.removeChild(this.healthBarContainer);
        }

        // Call parent cleanup
        super.cleanup();
    }
}
