import * as CANNON from 'cannon-es';
import { describe, expect, it } from 'vitest';
import { PhysicsWorld } from './PhysicsWorld';

describe('PhysicsWorld', () => {
    it('defers removals requested during a contact event until the step completes', () => {
        const world = new PhysicsWorld();
        world.gravity.set(0, 0, 0);

        const bodyA = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(1) });
        const bodyB = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(1) });
        bodyB.position.x = 1.5;
        world.addBody(bodyA);
        world.addBody(bodyB);

        let bodyRemainedDuringStep = false;
        world.addEventListener('beginContact', (event: { bodyA: CANNON.Body }) => {
            world.removeBody(event.bodyA);
            bodyRemainedDuringStep = world.bodies.includes(event.bodyA);
        });

        world.step(1 / 60);

        expect(bodyRemainedDuringStep).toBe(true);
        expect(world.bodies).not.toContain(bodyA);
    });

    it('removes bodies immediately when called outside a physics step', () => {
        const world = new PhysicsWorld();
        const body = new CANNON.Body();
        world.addBody(body);

        world.removeBody(body);

        expect(world.bodies).not.toContain(body);
    });
});