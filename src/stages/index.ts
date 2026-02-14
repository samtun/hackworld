import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { NetwrokMatrix } from './NetworkMatrix';
import { SecurityCore } from './SecurityCore';
import { MovementTest } from './MovementTest';

// Re-export for convenience
export { BaseStage, Lobby, NetwrokMatrix as CrimsonDepths, SecurityCore as VioletAbyss };

// Registry of all available dungeons for selection UI
// MovementTest is only included in dev builds
export const AVAILABLE_DUNGEONS = import.meta.env.DEV 
    ? [NetwrokMatrix, SecurityCore, MovementTest]
    : [NetwrokMatrix, SecurityCore];

type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: RAPIER.World,
    physicsMaterial: any
) => BaseStage;

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map<string, StageConstructor>([
    [Lobby.getMetadata().id, Lobby],
    [NetwrokMatrix.getMetadata().id, NetwrokMatrix],
    [SecurityCore.getMetadata().id, SecurityCore],
    ...(import.meta.env.DEV ? [[MovementTest.getMetadata().id, MovementTest] as [string, StageConstructor]] : [])
]);

/**
 * Create a stage instance by ID
 */
export function createStage(
    stageId: string,
    scene: THREE.Scene,
    physicsWorld: RAPIER.World
): BaseStage | null {
    const StageClass = stageRegistry.get(stageId);
    if (!StageClass) {
        console.warn(`Unknown stage ID: ${stageId}`);
        return null;
    }
    return new StageClass(scene, physicsWorld, null as any);
}
