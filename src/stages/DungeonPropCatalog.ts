export interface DungeonPropDefinition {
    modelName: string;
    width: number;
    height: number;
    depth: number;
}

export const DUNGEON_PROP_DEFINITIONS: DungeonPropDefinition[] = [
    { modelName: 'ac', width: 2, height: 2, depth: 1 },
    { modelName: 'barrier', width: 2, height: 1, depth: 1 },
    { modelName: 'coolingtank', width: 2, height: 2, depth: 2 },
    { modelName: 'coolingtanklarge', width: 3, height: 3, depth: 3 },
    { modelName: 'dataspire', width: 1, height: 2, depth: 1 },
    { modelName: 'desk', width: 2, height: 1, depth: 1 },
    { modelName: 'deskl', width: 2, height: 1, depth: 2 },
    { modelName: 'dronechargingstation', width: 1, height: 2, depth: 1 },
    { modelName: 'dronechargingstationanimated', width: 1, height: 2, depth: 1 },
    { modelName: 'energycells', width: 1, height: 1, depth: 1 },
    { modelName: 'holoprojector', width: 2, height: 2, depth: 2 },
    { modelName: 'pile', width: 2, height: 1, depth: 2 },
    { modelName: 'pipes', width: 2, height: 2, depth: 1 },
    { modelName: 'satellitedish', width: 2, height: 2, depth: 2 },
    { modelName: 'serverrack', width: 1, height: 2, depth: 1 },
    { modelName: 'vent', width: 2, height: 1, depth: 1 },
];

const DUNGEON_PROP_DEFINITION_BY_NAME = new Map<string, DungeonPropDefinition>(
    DUNGEON_PROP_DEFINITIONS.map((definition) => [definition.modelName, definition]),
);

export function getDungeonPropDefinitions(modelNames: readonly string[]): DungeonPropDefinition[] {
    return modelNames.map((modelName) => {
        const definition = DUNGEON_PROP_DEFINITION_BY_NAME.get(modelName);
        if (!definition) {
            throw new Error(`Unknown dungeon prop definition "${modelName}"`);
        }
        return definition;
    });
}

export function getDungeonPropAssetPaths(definitions: readonly DungeonPropDefinition[]): string[] {
    return definitions.flatMap(({ modelName }) => [
        `models/props/${modelName}.glb`,
        `models/props/${modelName}.collider.glb`,
    ]);
}

export const DUNGEON_PROP_ASSET_PATHS: string[] = getDungeonPropAssetPaths(DUNGEON_PROP_DEFINITIONS);
