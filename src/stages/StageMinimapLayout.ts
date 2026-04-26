export interface MinimapRect {
    x: number;
    z: number;
    width: number;
    depth: number;
    kind: 'room' | 'corridor';
    /** Room id – only set for rects of kind 'room'. Used to track cleared state. */
    roomId?: number;
    /** True when the room has no living enemies left. */
    cleared?: boolean;
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
