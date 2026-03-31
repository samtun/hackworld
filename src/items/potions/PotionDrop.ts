import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';
import { PotionType, getPotionAmount } from './PotionDefinitions';

const BALL_RADIUS = 0.12;
const BALL_SEGMENTS = 8;
const SPACING = BALL_RADIUS * 1.6;
const HP_COLOR = 0xFF0000;
const TP_COLOR = 0x0055FF;

/**
 * Compute ball positions for a given potion level (1–6 balls in a cluster).
 */
function getBallPositions(level: number): THREE.Vector3[] {
    const s = SPACING;
    const h = s * 0.866; // √3/2 for hexagonal stacking height
    switch (level) {
        case 1: return [new THREE.Vector3(0, 0, 0)];
        case 2: return [
            new THREE.Vector3(-s / 2, 0, 0),
            new THREE.Vector3(s / 2, 0, 0),
        ];
        case 3: return [
            new THREE.Vector3(-s / 2, 0, 0),
            new THREE.Vector3(s / 2, 0, 0),
            new THREE.Vector3(0, h, 0),
        ];
        case 4: return [
            new THREE.Vector3(-s / 2, 0, 0),
            new THREE.Vector3(s / 2, 0, 0),
            new THREE.Vector3(-s / 2, h, 0),
            new THREE.Vector3(s / 2, h, 0),
        ];
        case 5: return [
            new THREE.Vector3(-s, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(s, 0, 0),
            new THREE.Vector3(-s / 2, h, 0),
            new THREE.Vector3(s / 2, h, 0),
        ];
        default: return [
            new THREE.Vector3(-s, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(s, 0, 0),
            new THREE.Vector3(-s, h, 0),
            new THREE.Vector3(0, h, 0),
            new THREE.Vector3(s, h, 0),
        ];
    }
}

/**
 * PotionDrop entity — represents an HP or TP potion on the ground.
 * Collected on contact; restores health or tech points.
 */
export class PotionDrop extends ItemDrop {
    mesh: THREE.Group;
    dropType: ItemDropType;
    interactiveType = InteractiveEntityType.AUTO_PICKUP_DROP;
    potionType: PotionType;
    amount: number;
    level: number;

    private bobTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 2;
    private readonly FLOAT_AMPLITUDE: number = 0.15;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, potionType: PotionType, level: number) {
        super();
        this.potionType = potionType;
        this.level = level;
        this.amount = getPotionAmount(potionType, level);
        this.dropType = potionType === PotionType.HP ? ItemDropType.HP_POTION : ItemDropType.TP_POTION;
        this.baseHeight = position.y;

        const group = new THREE.Group();
        const color = potionType === PotionType.HP ? HP_COLOR : TP_COLOR;
        const geometry = new THREE.SphereGeometry(BALL_RADIUS, BALL_SEGMENTS, BALL_SEGMENTS);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            metalness: 0.3,
            roughness: 0.4,
        });

        for (const pos of getBallPositions(level)) {
            const ball = new THREE.Mesh(geometry, material);
            ball.position.copy(pos);
            group.add(ball);
        }

        group.position.set(position.x, position.y, position.z);
        scene.add(group);
        this.mesh = group;
    }

    update(deltaTime: number, _cameraPosition: THREE.Vector3, _playerPosition: THREE.Vector3): void {
        this.bobTimer += deltaTime;
        const bobOffset = Math.sin(this.bobTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + bobOffset;
        this.mesh.rotation.y += deltaTime * 1.5;
    }

    canPickup(playerStats: { hp: number; maxHp: number; tp: number; maxTp: number }): boolean {
        if (this.potionType === PotionType.HP) {
            return playerStats.hp < playerStats.maxHp;
        }
        return playerStats.tp < playerStats.maxTp;
    }
}
