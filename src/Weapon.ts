import * as THREE from 'three';

export class Weapon {
    mesh: THREE.Mesh;
    isAttacking: boolean = false;
    private attackDuration: number = 0.3; // seconds
    private attackTimer: number = 0;
    private baseRotation: THREE.Euler;

    constructor(parent: THREE.Object3D) {
        // Simple sword shape
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 1.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);

        // Position relative to player (held in hand)
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();

        parent.add(this.mesh);
    }

    attack(): boolean {
        if (this.isAttacking) return false;
        this.isAttacking = true;
        this.attackTimer = 0;
        return true;
    }

    update(dt: number) {
        if (!this.isAttacking) return;

        this.attackTimer += dt;

        // Simple swing animation
        const progress = this.attackTimer / this.attackDuration;

        if (progress >= 1) {
            this.isAttacking = false;
            this.mesh.rotation.copy(this.baseRotation);
            return;
        }

        // Swing arc: Start back, swing forward, return
        // Using a sine wave for smooth swing
        const swingAngle = Math.sin(progress * Math.PI) * 2; // 2 radians swing

        // Rotate around local X axis for a chop
        this.mesh.rotation.x = this.baseRotation.x + swingAngle;
    }
}
