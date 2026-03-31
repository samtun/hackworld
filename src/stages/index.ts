import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { NetworkMatrix } from './NetworkMatrix';
import { SecurityCore } from './SecurityCore';
import { GameTest } from './GameTest';

// Re-export for convenience
export { BaseStage, Lobby, NetworkMatrix as CrimsonDepths, SecurityCore as VioletAbyss };

// Registry of all available dungeons for selection UI
// GameTest is only included in dev builds
export const AVAILABLE_DUNGEONS = import.meta.env.DEV 
    ? [NetworkMatrix, SecurityCore, GameTest]
    : [NetworkMatrix, SecurityCore];

// Stage factory type
type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material
) => BaseStage;

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map<string, StageConstructor>([
    [Lobby.getMetadata().id, Lobby],
    [NetworkMatrix.getMetadata().id, NetworkMatrix],
    [SecurityCore.getMetadata().id, SecurityCore],
    ...(import.meta.env.DEV ? [[GameTest.getMetadata().id, GameTest] as [string, StageConstructor]] : [])
]);

/**
 * Create a stage instance by ID
 */
export function createStage(
    stageId: string,
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material
): BaseStage | null {
    const StageClass = stageRegistry.get(stageId);
    if (!StageClass) {
        console.warn(`Unknown stage ID: ${stageId}`);
        return null;
    }
    return new StageClass(scene, physicsWorld, physicsMaterial);
}
