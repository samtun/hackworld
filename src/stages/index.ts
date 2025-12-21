import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';
import { Lobby } from './Lobby';
import { Dungeon1 } from './Dungeon1';
import { Dungeon2 } from './Dungeon2';

// Re-export for convenience
export { BaseDungeon, Lobby, Dungeon1, Dungeon2 };

// Registry of all available dungeons for selection UI
export const AVAILABLE_DUNGEONS = [
    Dungeon1,
    Dungeon2
];

// Stage factory type
type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material
) => BaseDungeon;

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map([
    ['lobby', Lobby],
    ['dungeon', Dungeon1],
    ['dungeon2', Dungeon2]
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
