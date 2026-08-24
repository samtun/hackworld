import type * as CANNON from 'cannon-es';
import { singleton } from 'tsyringe';
import type { Enemy } from './enemies/Enemy';
import type { Breakable } from './items/Breakable';

export enum PhysicsBodyKind {
    Enemy = 'enemy',
    Breakable = 'breakable',
    EnemyAttackHitbox = 'enemyAttackHitbox',
}

export type PhysicsBodyMetadata =
    | { kind: PhysicsBodyKind.Enemy; entity: Enemy }
    | { kind: PhysicsBodyKind.Breakable; entity: Breakable }
    | { kind: PhysicsBodyKind.EnemyAttackHitbox };

@singleton()
export class PhysicsBodyMetadataManager {
    private readonly metadataByBody = new WeakMap<CANNON.Body, PhysicsBodyMetadata>();

    registerEnemyBody(body: CANNON.Body, entity: Enemy): void {
        this.metadataByBody.set(body, { kind: PhysicsBodyKind.Enemy, entity });
    }

    registerBreakableBody(body: CANNON.Body, entity: Breakable): void {
        this.metadataByBody.set(body, { kind: PhysicsBodyKind.Breakable, entity });
    }

    registerEnemyAttackHitbox(body: CANNON.Body): void {
        this.metadataByBody.set(body, { kind: PhysicsBodyKind.EnemyAttackHitbox });
    }

    getPhysicsBodyMetadata(body: CANNON.Body): PhysicsBodyMetadata | undefined {
        return this.metadataByBody.get(body);
    }

    unregisterPhysicsBody(body: CANNON.Body): void {
        this.metadataByBody.delete(body);
    }
}