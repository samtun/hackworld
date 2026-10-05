import * as CANNON from 'cannon-es';

export class PhysicsWorld extends CANNON.World {
    private isStepping: boolean = false;
    private readonly bodiesToRemove = new Set<CANNON.Body>();

    override removeBody(body: CANNON.Body): void {
        if (this.isStepping) {
            this.bodiesToRemove.add(body);
            return;
        }

        super.removeBody(body);
    }

    override step(dt: number, timeSinceLastCalled?: number, maxSubSteps?: number): void {
        this.isStepping = true;
        try {
            super.step(dt, timeSinceLastCalled, maxSubSteps);
        } finally {
            this.isStepping = false;
            for (const body of this.bodiesToRemove) {
                super.removeBody(body);
            }
            this.bodiesToRemove.clear();
        }
    }
}