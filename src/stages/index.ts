import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';
import { Lobby } from './Lobby';
import { CrimsonDepths } from './CrimsonDepths';
import { VioletAbyss } from './VioletAbyss';

// Re-export for convenience
export { BaseDungeon, Lobby, CrimsonDepths, VioletAbyss };

// Registry of all available dungeons for selection UI
export const AVAILABLE_DUNGEONS = [
    CrimsonDepths,
    VioletAbyss
];

// Stage factory type
type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material
) => BaseDungeon;

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map([
    [Lobby.getMetadata().id, Lobby],
    [CrimsonDepths.getMetadata().id, CrimsonDepths],
    [VioletAbyss.getMetadata().id, VioletAbyss]
]);

/**
 * Create a stage instance by ID
 */
export function createStage(
    stageId: string,
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material
): BaseDungeon | null {
    const StageClass = stageRegistry.get(stageId);
    if (!StageClass) {
        console.warn(`Unknown stage ID: ${stageId}`);
        return null;
    }
    return new StageClass(scene, physicsWorld, physicsMaterial);
}
