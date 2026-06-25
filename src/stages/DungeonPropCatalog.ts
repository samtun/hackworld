export interface DungeonPropDefinition {
    modelName: string;
    width: number;
    height: number;
    depth: number;
}

export const DUNGEON_PROP_DEFINITIONS: DungeonPropDefinition[] = [
    { modelName: 'ac', width: 2, height: 2, depth: 1 },
    { modelName: 'barrier', width: 2, height: 1, depth: 1 },
    { modelName: 'dataspire', width: 1, height: 2, depth: 1 },
    { modelName: 'energycells', width: 1, height: 1, depth: 1 },
    { modelName: 'pile', width: 2, height: 1, depth: 2 },
    { modelName: 'router', width: 1, height: 1, depth: 1 },
    { modelName: 'serverrack', width: 1, height: 2, depth: 1 },
    { modelName: 'vent', width: 2, height: 1, depth: 1 },
    { modelName: 'coolingtank', width: 2, height: 2, depth: 2 },
];

export const DUNGEON_PROP_ASSET_PATHS: string[] = DUNGEON_PROP_DEFINITIONS.flatMap(({ modelName }) => [
    `models/props/${modelName}.glb`,
    `models/props/${modelName}.collider.glb`,
]);
