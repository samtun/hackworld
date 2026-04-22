export interface MinimapRect {
    x: number;
    z: number;
    width: number;
    depth: number;
    kind: 'room' | 'corridor';
}

export interface StageMinimapLayout {
    rects: MinimapRect[];
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
