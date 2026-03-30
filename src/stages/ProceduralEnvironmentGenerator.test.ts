import { describe, it, expect } from 'vitest';
import { ProceduralEnvironmentGenerator } from './ProceduralEnvironmentGenerator';
import type { GenerationConfig } from './ProceduralEnvironmentGenerator';

const bounds = { min: -20, max: 20 };
const exclusionZones = [{ x: 0, z: 0, radius: 3 }];

const baseConfig: GenerationConfig = {
    bounds,
    exclusionZones,
    obstacleCount: { min: 4, max: 6 },
    enemyCounts: { regular: { min: 2, max: 4 }, large: { min: 1, max: 2 } },
};

describe('ProceduralEnvironmentGenerator', () => {
    describe('determinism', () => {
        it('produces identical layouts for the same seed', () => {
            const layout1 = new ProceduralEnvironmentGenerator(42).generateLayout(baseConfig);
            const layout2 = new ProceduralEnvironmentGenerator(42).generateLayout(baseConfig);
            expect(layout1).toEqual(layout2);
        });

        it('produces different positions for different seeds', () => {
            const p1 = new ProceduralEnvironmentGenerator(1).generatePositions(3, bounds, []);
            const p2 = new ProceduralEnvironmentGenerator(999).generatePositions(3, bounds, []);
            expect(p1).not.toEqual(p2);
        });
    });

    describe('generatePositions', () => {
        it('returns the requested number of positions', () => {
            const positions = new ProceduralEnvironmentGenerator(1).generatePositions(5, bounds, exclusionZones);
            expect(positions).toHaveLength(5);
        });

        it('keeps positions within bounds', () => {
            const positions = new ProceduralEnvironmentGenerator(2).generatePositions(20, bounds, []);
            for (const p of positions) {
                expect(p.x).toBeGreaterThanOrEqual(bounds.min);
                expect(p.x).toBeLessThan(bounds.max);
                expect(p.z).toBeGreaterThanOrEqual(bounds.min);
                expect(p.z).toBeLessThan(bounds.max);
            }
        });

        it('respects exclusion zones', () => {
            const zones = [{ x: 0, z: 0, radius: 5 }];
            const positions = new ProceduralEnvironmentGenerator(3).generatePositions(20, bounds, zones);
            for (const p of positions) {
                const dist = Math.sqrt(p.x * p.x + p.z * p.z);
                expect(dist).toBeGreaterThanOrEqual(5);
            }
        });

        it('assigns the provided y value to every position', () => {
            const positions = new ProceduralEnvironmentGenerator(4).generatePositions(3, bounds, [], 1.5);
            for (const p of positions) {
                expect(p.y).toBe(1.5);
            }
        });
    });

    describe('generateObstacles', () => {
        it('returns the requested number of obstacles', () => {
            const obstacles = new ProceduralEnvironmentGenerator(5).generateObstacles(6, bounds, exclusionZones);
            expect(obstacles).toHaveLength(6);
        });

        it('obstacle dimensions are within the expected ranges', () => {
            const obstacles = new ProceduralEnvironmentGenerator(6).generateObstacles(10, bounds, []);
            for (const obs of obstacles) {
                expect(obs.width).toBeGreaterThanOrEqual(1);
                expect(obs.width).toBeLessThan(5);
                expect(obs.height).toBeGreaterThanOrEqual(1);
                expect(obs.height).toBeLessThan(4);
                expect(obs.depth).toBeGreaterThanOrEqual(1);
                expect(obs.depth).toBeLessThan(5);
            }
        });

        it('sets y to half of height so obstacle sits on the floor', () => {
            const obstacles = new ProceduralEnvironmentGenerator(7).generateObstacles(5, bounds, []);
            for (const obs of obstacles) {
                expect(obs.y).toBeCloseTo(obs.height / 2, 10);
            }
        });

        it('respects exclusion zones', () => {
            const zones = [{ x: 0, z: 0, radius: 8 }];
            const obstacles = new ProceduralEnvironmentGenerator(8).generateObstacles(10, bounds, zones);
            for (const obs of obstacles) {
                const dist = Math.sqrt(obs.x * obs.x + obs.z * obs.z);
                expect(dist).toBeGreaterThanOrEqual(8);
            }
        });
    });

    describe('generateLayout', () => {
        it('obstacle count falls within the configured range', () => {
            const layout = new ProceduralEnvironmentGenerator(9).generateLayout(baseConfig);
            expect(layout.obstacles.length).toBeGreaterThanOrEqual(baseConfig.obstacleCount.min);
            expect(layout.obstacles.length).toBeLessThanOrEqual(baseConfig.obstacleCount.max);
        });

        it('regular enemy count falls within the configured range', () => {
            const config: GenerationConfig = { ...baseConfig, enemyCounts: { regular: { min: 3, max: 5 } } };
            const layout = new ProceduralEnvironmentGenerator(10).generateLayout(config);
            expect(layout.enemyPositions.length).toBeGreaterThanOrEqual(3);
            expect(layout.enemyPositions.length).toBeLessThanOrEqual(5);
        });

        it('large enemy count falls within the configured range', () => {
            const config: GenerationConfig = { ...baseConfig, enemyCounts: { large: { min: 1, max: 3 } } };
            const layout = new ProceduralEnvironmentGenerator(11).generateLayout(config);
            expect(layout.largeEnemyPositions.length).toBeGreaterThanOrEqual(1);
            expect(layout.largeEnemyPositions.length).toBeLessThanOrEqual(3);
        });

        it('generates the exact number of bosses when specified', () => {
            const config: GenerationConfig = { ...baseConfig, enemyCounts: { boss: 1 } };
            const layout = new ProceduralEnvironmentGenerator(12).generateLayout(config);
            expect(layout.bossPositions).toHaveLength(1);
        });

        it('returns empty arrays for unspecified enemy types', () => {
            const config: GenerationConfig = { ...baseConfig, enemyCounts: {} };
            const layout = new ProceduralEnvironmentGenerator(13).generateLayout(config);
            expect(layout.enemyPositions).toHaveLength(0);
            expect(layout.largeEnemyPositions).toHaveLength(0);
            expect(layout.bossPositions).toHaveLength(0);
        });

        it('enemy positions respect the player spawn exclusion zone', () => {
            const zones = [{ x: 0, z: 0, radius: 3 }];
            const config: GenerationConfig = {
                bounds,
                exclusionZones: zones,
                obstacleCount: { min: 0, max: 0 },
                enemyCounts: { regular: { min: 10, max: 10 } },
            };
            const layout = new ProceduralEnvironmentGenerator(14).generateLayout(config);
            for (const p of layout.enemyPositions) {
                const dist = Math.sqrt(p.x * p.x + p.z * p.z);
                expect(dist).toBeGreaterThanOrEqual(3);
            }
        });

        it('is fully deterministic with the same seed', () => {
            const l1 = new ProceduralEnvironmentGenerator(42).generateLayout(baseConfig);
            const l2 = new ProceduralEnvironmentGenerator(42).generateLayout(baseConfig);
            expect(l1.obstacles).toEqual(l2.obstacles);
            expect(l1.enemyPositions).toEqual(l2.enemyPositions);
            expect(l1.largeEnemyPositions).toEqual(l2.largeEnemyPositions);
            expect(l1.bossPositions).toEqual(l2.bossPositions);
        });
    });
});
