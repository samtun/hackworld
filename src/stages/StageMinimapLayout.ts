export interface MinimapRect {
    x: number;
    z: number;
    width: number;
    depth: number;
    kind: 'room' | 'corridor';
}

export interface MinimapTeleporterMarker {
    x: number;
    z: number;
    active: boolean;
}

export interface StageMinimapLayout {
    rects: MinimapRect[];
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    teleporter?: MinimapTeleporterMarker;
}
