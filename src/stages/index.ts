import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { NetworkMatrix } from './NetworkMatrix';
import { PacketForge } from './PacketForge';
import { CipherNull } from './CipherNull';
import { SecurityCore } from './SecurityCore';
import { KernelTerminus } from './KernelTerminus';
import { GameTest } from './GameTest';

// Re-export for convenience (including legacy aliases still used by some callers)
export { BaseStage, Lobby, NetworkMatrix, PacketForge, CipherNull, SecurityCore, KernelTerminus, NetworkMatrix as CrimsonDepths, SecurityCore as VioletAbyss };

// Registry of all available dungeons for selection UI
// GameTest is only included in dev builds
export const AVAILABLE_DUNGEONS = import.meta.env.DEV 
    ? [NetworkMatrix, PacketForge, CipherNull, SecurityCore, KernelTerminus, GameTest]
    : [NetworkMatrix, PacketForge, CipherNull, SecurityCore, KernelTerminus];

// Stage factory type
type StageConstructor = new (
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    physicsMaterial: CANNON.Material,
    stageId?: string,
) => BaseStage;

interface RegisteredStageConstructor extends StageConstructor {
    getMetadata(): { id: string };
}

interface MultiLevelStageConstructor extends RegisteredStageConstructor {
    getLevelStageIds(): readonly string[];
}

function isMultiLevelStageConstructor(
    StageClass: RegisteredStageConstructor,
): StageClass is MultiLevelStageConstructor {
    return typeof (StageClass as MultiLevelStageConstructor).getLevelStageIds === 'function';
}

function toRegistryEntries(
    StageClass: RegisteredStageConstructor,
): [string, StageConstructor][] {
    const ids = isMultiLevelStageConstructor(StageClass)
        ? StageClass.getLevelStageIds()
        : [StageClass.getMetadata().id];
    return ids.map((stageId) => [stageId, StageClass]);
}

// Stage registry mapping stage IDs to their constructors
const stageRegistry: Map<string, StageConstructor> = new Map<string, StageConstructor>([
    [Lobby.getMetadata().id, Lobby],
    [NetworkMatrix.getMetadata().id, NetworkMatrix],
    [PacketForge.getMetadata().id, PacketForge],
    ...toRegistryEntries(CipherNull),
    ...toRegistryEntries(SecurityCore),
    ...toRegistryEntries(KernelTerminus),
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
    return new StageClass(scene, physicsWorld, physicsMaterial, stageId);
}
