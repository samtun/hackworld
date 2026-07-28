import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; }
    }
    class V2 {
        x = 0; y = 0;
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    }
    class Color {
        r = 0; g = 0; b = 0;
        constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; }
    }
    const mockAttr = {
        needsUpdate: false,
    };
    return {
        Vector3: V3,
        Vector2: V2,
        Color,
        PlaneGeometry: class {
            rotateX = vi.fn();
            dispose = vi.fn();
        },
        BufferGeometry: class {
            setAttribute = vi.fn();
            getAttribute = vi.fn().mockReturnValue(mockAttr);
            dispose = vi.fn();
        },
        BufferAttribute: class {
            needsUpdate = false;
            constructor() { }
        },
        ShaderMaterial: class {
            uniforms: any = {};
            dispose = vi.fn();
            constructor(opts: any) {
                this.uniforms = opts?.uniforms ?? {};
            }
        },
        Mesh: class {
            position = new V3();
            receiveShadow = false;
            castShadow = false;
            geometry = { dispose: vi.fn() };
            material = { dispose: vi.fn() };
        },
        Points: class {
            visible = true;
            geometry = {
                getAttribute: vi.fn().mockReturnValue({ needsUpdate: false }),
                dispose: vi.fn(),
            };
            material = { dispose: vi.fn() };
        },
        DoubleSide: 2,
        AdditiveBlending: 2,
    };
});

vi.mock('cannon-es', () => {
    class Vec3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    }
    return { Vec3 };
});

vi.mock('../ParticleShaderUtils', () => ({
    createParticleShaderMaterial: vi.fn().mockReturnValue({
        uniforms: { scaleFactor: { value: 1 }, color: { value: {} } },
        dispose: vi.fn(),
    }),
    updateParticleScaleFactor: vi.fn(),
}));

import { ElectricTrap, ElectricTrapConfig } from './ElectricTrap';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene() {
    return { add: vi.fn(), remove: vi.fn() } as any;
}

function makeConfig(overrides: Partial<ElectricTrapConfig> = {}): ElectricTrapConfig {
    return {
        x: 5,
        y: 0,
        z: 5,
        width: 4,
        length: 4,
        damage: 10,
        activationInterval: [],
        ...overrides,
    };
}

function makePlayer(x: number, z: number, y: number = 0): Player {
    const p = Object.create(Player.prototype) as Player;
    (p as any).body = { position: { x, y, z } };
    Object.defineProperty(p, 'basePositionY', { get: () => y, configurable: true });
    (p as any).isDead = false;
    (p as any).takeDamage = vi.fn();
    return p;
}

function makeEnemy(x: number, z: number, overrides: Partial<Enemy> = {}): Enemy {
    const e = Object.create(Enemy.prototype) as Enemy;
    (e as any).body = { position: { x, y: 0, z }, velocity: { x: 0, y: 0, z: 0 } };
    (e as any).isDead = false;
    (e as any).isDying = false;
    (e as any).trapImmune = false;
    (e as any).takeDamage = vi.fn();
    Object.assign(e, overrides);
    return e;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ElectricTrap', () => {
    let scene: any;

    beforeEach(() => {
        scene = makeScene();
    });

    // ------------------------------------------------------------------
    // Construction
    // ------------------------------------------------------------------

    describe('constructor', () => {
        it('adds mesh and particles to the scene', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            expect(scene.add).toHaveBeenCalledTimes(2);
            expect(trap.mesh).toBeDefined();
            expect(trap.particles).toBeDefined();
        });

        it('stores centre position and half-extents correctly', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 10, z: 20, width: 6, length: 8 }));
            expect(trap.centerX).toBe(10);
            expect(trap.centerZ).toBe(20);
            expect(trap.halfWidth).toBe(3);
            expect(trap.halfLength).toBe(4);
        });

        it('starts active when activation interval is empty (always on)', () => {
            const trap = new ElectricTrap(scene, makeConfig({ activationInterval: [] }));
            expect(trap.isActive).toBe(true);
        });

        it('starts active at pattern index 0 (first segment is active)', () => {
            const trap = new ElectricTrap(scene, makeConfig({ activationInterval: [500, 500] }));
            expect(trap.isActive).toBe(true);
        });
    });

    // ------------------------------------------------------------------
    // Overlap detection
    // ------------------------------------------------------------------

    describe('overlaps', () => {
        it('returns true for a point inside the trap', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, width: 4, length: 4 }));
            expect(trap.overlaps(5, 5)).toBe(true);
            expect(trap.overlaps(6, 6)).toBe(true);
        });

        it('returns false for a point outside the trap', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, width: 4, length: 4 }));
            expect(trap.overlaps(0, 0)).toBe(false);
            expect(trap.overlaps(10, 10)).toBe(false);
        });

        it('returns true on the exact boundary', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, width: 4, length: 4 }));
            expect(trap.overlaps(7, 7)).toBe(true);
            expect(trap.overlaps(3, 3)).toBe(true);
        });
    });

    // ------------------------------------------------------------------
    // Activation pattern
    // ------------------------------------------------------------------

    describe('activation pattern', () => {
        it('always-on trap stays active after many updates', () => {
            const trap = new ElectricTrap(scene, makeConfig({ activationInterval: [] }));
            const player = makePlayer(0, 0); // outside trap
            for (let i = 0; i < 100; i++) trap.update(0.016, player, []);
            expect(trap.isActive).toBe(true);
        });

        it('toggles between active and inactive phases', () => {
            // 200 ms active, 300 ms pause
            const trap = new ElectricTrap(scene, makeConfig({ activationInterval: [200, 300] }));
            const player = makePlayer(0, 0);
            expect(trap.isActive).toBe(true);

            // After 0.2 s the first active period ends → pause begins
            trap.update(0.201, player, []);
            expect(trap.isActive).toBe(false);

            // After another 0.3 s the pause ends → active again
            trap.update(0.301, player, []);
            expect(trap.isActive).toBe(true);
        });

        it('wraps around when the pattern array is exhausted', () => {
            // 100 ms active, 100 ms pause
            const trap = new ElectricTrap(scene, makeConfig({ activationInterval: [100, 100] }));
            const player = makePlayer(0, 0);

            // Advance through two full cycles: active→pause→active→pause→active
            trap.update(0.101, player, []); // end of first active
            expect(trap.isActive).toBe(false);
            trap.update(0.101, player, []); // end of first pause
            expect(trap.isActive).toBe(true);
            trap.update(0.101, player, []); // end of second active
            expect(trap.isActive).toBe(false);
            trap.update(0.101, player, []); // end of second pause
            expect(trap.isActive).toBe(true);
        });
    });

    // ------------------------------------------------------------------
    // Player damage
    // ------------------------------------------------------------------

    describe('player damage', () => {
        it('damages the player when standing on an active trap', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, width: 4, length: 4, damage: 15 }));
            const player = makePlayer(5, 5);
            trap.update(0.016, player, []);
            expect((player as any).takeDamage).toHaveBeenCalledWith(15, expect.anything());
        });

        it('does not damage the player when outside the trap', () => {
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, width: 4, length: 4 }));
            const player = makePlayer(20, 20);
            trap.update(0.016, player, []);
            expect((player as any).takeDamage).not.toHaveBeenCalled();
        });

        it('does not damage the player when airborne above the trap', () => {
            // Player is above the trap in XZ but has jumped off the ground
            const trap = new ElectricTrap(scene, makeConfig({ x: 5, z: 5, y: 0, width: 4, length: 4 }));
            const player = makePlayer(5, 5, 0.2); // 2 m above trap elevation
            trap.update(0.016, player, []);
            expect((player as any).takeDamage).not.toHaveBeenCalled();
        });

        it('does not damage a dead player', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            const player = makePlayer(5, 5);
            (player as any).isDead = true;
            trap.update(0.016, player, []);
            expect((player as any).takeDamage).not.toHaveBeenCalled();
        });

        it('respects damage cooldown (0.5 s between hits)', () => {
            const trap = new ElectricTrap(scene, makeConfig({ damage: 10 }));
            const player = makePlayer(5, 5);

            trap.update(0.016, player, []); // first hit
            expect((player as any).takeDamage).toHaveBeenCalledTimes(1);

            trap.update(0.1, player, []); // within cooldown
            expect((player as any).takeDamage).toHaveBeenCalledTimes(1);

            trap.update(0.5, player, []); // cooldown expired
            expect((player as any).takeDamage).toHaveBeenCalledTimes(2);
        });

        it('does not damage when the trap is inactive', () => {
            // Start active for 100 ms, then pause for 1 s
            const trap = new ElectricTrap(scene, makeConfig({
                activationInterval: [100, 1000],
                damage: 10,
            }));
            const player = makePlayer(5, 5);

            // Move past the active phase
            trap.update(0.15, player, []);
            expect(trap.isActive).toBe(false);

            // Clear the mock to ignore the first-frame hit
            (player as any).takeDamage.mockClear();

            // Now the trap is inactive — no damage
            trap.update(0.016, player, []);
            expect((player as any).takeDamage).not.toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // Enemy damage
    // ------------------------------------------------------------------

    describe('enemy damage', () => {
        it('damages an enemy standing on the trap', () => {
            const trap = new ElectricTrap(scene, makeConfig({ damage: 10 }));
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(5, 5);
            trap.update(0.016, player, [enemy]);
            expect((enemy as any).takeDamage).toHaveBeenCalledWith(10, false, expect.anything());
        });

        it('does not damage an enemy outside the trap', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(50, 50);
            trap.update(0.016, player, [enemy]);
            expect((enemy as any).takeDamage).not.toHaveBeenCalled();
        });

        it('does not damage a dead enemy', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(5, 5, { isDead: true } as any);
            trap.update(0.016, player, [enemy]);
            expect((enemy as any).takeDamage).not.toHaveBeenCalled();
        });

        it('does not damage a dying enemy', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(5, 5, { isDying: true } as any);
            trap.update(0.016, player, [enemy]);
            expect((enemy as any).takeDamage).not.toHaveBeenCalled();
        });

        it('does not damage a trap-immune enemy', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(5, 5, { trapImmune: true } as any);
            trap.update(0.016, player, [enemy]);
            expect((enemy as any).takeDamage).not.toHaveBeenCalled();
        });

        it('respects damage cooldown on enemies', () => {
            const trap = new ElectricTrap(scene, makeConfig({ damage: 8 }));
            const player = makePlayer(0, 0);
            const enemy = makeEnemy(5, 5);

            trap.update(0.016, player, [enemy]); // first hit
            expect((enemy as any).takeDamage).toHaveBeenCalledTimes(1);

            trap.update(0.1, player, [enemy]); // within cooldown
            expect((enemy as any).takeDamage).toHaveBeenCalledTimes(1);

            trap.update(0.5, player, [enemy]); // after cooldown
            expect((enemy as any).takeDamage).toHaveBeenCalledTimes(2);
        });
    });

    // ------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------

    describe('cleanup', () => {
        it('removes mesh and particles from the scene and disposes resources', () => {
            const trap = new ElectricTrap(scene, makeConfig());
            trap.cleanup();
            // Should remove both mesh and particles (2 removes)
            expect(scene.remove).toHaveBeenCalledTimes(2);
        });
    });
});
