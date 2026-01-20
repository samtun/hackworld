import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import RAPIER from '@dimforge/rapier3d-compat';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { CrimsonDepths } from './CrimsonDepths';
import { VioletAbyss } from './VioletAbyss';
import { MovementTest } from './MovementTest';

// Re-export for convenience
export { BaseStage, Lobby, CrimsonDepths, VioletAbyss };

// Registry of all available dungeons for selection UI
// MovementTest is only included in dev builds
export const AVAILABLE_DUNGEONS = import.meta.env.DEV 
    ? [CrimsonDepths, VioletAbyss, MovementTest]
    : [CrimsonDepths, VioletAbyss];

// Stage factory type (uses RAPIER.World now, but still passes CANNON types to entities for backward compatibility)
type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: RAPIER.World,
    physicsMaterial: CANNON.Material
) => BaseStage;

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map<string, StageConstructor>([
    [Lobby.getMetadata().id, Lobby],
    [CrimsonDepths.getMetadata().id, CrimsonDepths],
    [VioletAbyss.getMetadata().id, VioletAbyss],
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
