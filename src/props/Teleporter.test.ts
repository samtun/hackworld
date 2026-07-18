import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('./ParticleShaderUtils', () => ({
    createParticleShaderMaterial: vi.fn(),
    updateParticleScaleFactor: vi.fn(),
}));

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            playTeleport: vi.fn(),
        },
    },
}));

vi.mock('./npcs/Npc', () => ({
    Npc: class {
        update(): void {}
        cleanup(): void {}
    },
}));

import { Teleporter } from './Teleporter';

function makeTeleporterForParticleUpdate(options?: {
    playerNearby?: boolean;
    lifetime?: number;
    initialSize?: number;
}): any {
    const teleporter = Object.create(Teleporter.prototype) as any;
    const lifetime = options?.lifetime ?? 1;
    const initialSize = options?.initialSize ?? 0.3;

    teleporter.time = 0;
    teleporter.PARTICLE_COUNT = 1;
    teleporter.PARTICLE_LIFETIME = 1.3;
    teleporter.Z_TRAVEL_DISTANCE = 0.9;
    teleporter.Z_OFFSET = 1.3;

    teleporter.mesh = {
        position: { x: 2, y: 3, z: 5 },
        userData: { destination: 'test' },
    };

    teleporter.particleSystem = {
        positions: new Float32Array([0, 0, 0]),
        velocities: new Float32Array(3),
        lifetimes: new Float32Array([lifetime]),
        initialX: new Float32Array([0.2]),
        initialY: new Float32Array([0.4]),
        initialSizes: new Float32Array([initialSize]),
        sizes: new Float32Array([initialSize]),
        count: 1,
    };

    teleporter.resetParticle = vi.fn();
    teleporter.isPlayerNearby = vi.fn(() => options?.playerNearby ?? false);

    const positionAttribute = { needsUpdate: false };
    const sizeAttribute = { needsUpdate: false };

    teleporter.particles = {
        geometry: {
            getAttribute: vi.fn((name: string) => {
                if (name === 'position') return positionAttribute;
                if (name === 'size') return sizeAttribute;
                return null;
            }),
        },
    };

    teleporter.positionAttributeMock = positionAttribute;
    teleporter.sizeAttributeMock = sizeAttribute;

    return teleporter;
}

describe('Teleporter particle size and speed', () => {
    it('applies a smaller size factor when player is not nearby', () => {
        const nearbyTeleporter = makeTeleporterForParticleUpdate({ playerNearby: true, lifetime: 1, initialSize: 0.3 });
        const farTeleporter = makeTeleporterForParticleUpdate({ playerNearby: false, lifetime: 1, initialSize: 0.3 });
        const playerPosition = new THREE.Vector3(0, 0, 0);

        nearbyTeleporter.updateWithPlayerPosition(0.1, playerPosition);
        farTeleporter.updateWithPlayerPosition(0.1, playerPosition);

        expect(nearbyTeleporter.particleSystem.sizes[0]).toBeCloseTo(0.2076923, 5);
        expect(farTeleporter.particleSystem.sizes[0]).toBeCloseTo(0.1246154, 5);
        expect(farTeleporter.particleSystem.sizes[0]).toBeCloseTo(
            nearbyTeleporter.particleSystem.sizes[0] * 0.6,
            5
        );
    });

    it('moves particles faster along negative Z when player is nearby', () => {
        const nearbyTeleporter = makeTeleporterForParticleUpdate({ playerNearby: true, lifetime: 1 });
        const farTeleporter = makeTeleporterForParticleUpdate({ playerNearby: false, lifetime: 1 });
        const playerPosition = new THREE.Vector3(0, 0, 0);

        nearbyTeleporter.updateWithPlayerPosition(0.1, playerPosition);
        farTeleporter.updateWithPlayerPosition(0.1, playerPosition);

        const nearbyZ = nearbyTeleporter.particleSystem.positions[2];
        const farZ = farTeleporter.particleSystem.positions[2];

        expect(nearbyZ).toBeCloseTo(5.3030767, 5);
        expect(farZ).toBeCloseTo(6.2446156, 5);
        expect(nearbyZ).toBeLessThan(farZ);
    });

    it('shrinks particle size as lifetime decreases', () => {
        const teleporter = makeTeleporterForParticleUpdate({ playerNearby: true, lifetime: 1.2, initialSize: 0.3 });
        const playerPosition = new THREE.Vector3(0, 0, 0);

        teleporter.updateWithPlayerPosition(0.1, playerPosition);
        const sizeAfterFirstUpdate = teleporter.particleSystem.sizes[0];

        teleporter.updateWithPlayerPosition(0.1, playerPosition);
        const sizeAfterSecondUpdate = teleporter.particleSystem.sizes[0];

        expect(sizeAfterSecondUpdate).toBeLessThan(sizeAfterFirstUpdate);
    });

    it('marks position and size attributes for geometry updates', () => {
        const teleporter = makeTeleporterForParticleUpdate({ playerNearby: true, lifetime: 1 });
        const playerPosition = new THREE.Vector3(0, 0, 0);

        teleporter.updateWithPlayerPosition(0.1, playerPosition);

        expect(teleporter.positionAttributeMock.needsUpdate).toBe(true);
        expect(teleporter.sizeAttributeMock.needsUpdate).toBe(true);
    });
});
