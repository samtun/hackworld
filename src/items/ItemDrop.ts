import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export abstract class ItemDrop {
    abstract mesh: THREE.Object3D;
    abstract body?: CANNON.Body;

    abstract update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void;
    abstract cleanup(scene: THREE.Scene, world: CANNON.World): void;

    protected readonly PICKUP_DISTANCE: number = 1.5;

    /**
     * Creates a text label using canvas with the correct Share Tech font
     * @param itemName The name of the item to display
     * @param levelChar The level character to display in italic (e.g., 'α', 'β'). Leave empty for no level display.
     * @param textColor The color of the text (default: '#ffffff')
     * @returns A THREE.Mesh with the text label
     */
    protected createTextLabel(itemName: string, levelChar: string = '', textColor: string = '#ffffff'): THREE.Mesh {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 128;

        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const font = 'bold 68px "Share Tech", Arial, sans-serif';
        context.font = font;
        context.fillStyle = textColor;
        context.textBaseline = 'middle';

        // Measure widths to center the combined text
        const nameWidth = context.measureText(itemName).width;

        context.font = font;
        const levelWidth = levelChar ? context.measureText(levelChar).width : 0;

        const spacing = levelChar ? 8 : 0; // gap between name and level char only if level char exists
        const totalWidth = nameWidth + spacing + levelWidth;

        // Draw with left alignment starting at computed X so combined text is centered
        const startX = canvas.width / 2 - totalWidth / 2;
        const centerY = canvas.height / 2;

        // Draw name
        context.font = font;
        context.textAlign = 'left';
        context.fillText(itemName, startX, centerY);

        // Draw level char right of name (if provided)
        if (levelChar) {
            context.fillText(levelChar, startX + nameWidth + spacing, centerY);
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        const textGeometry = new THREE.PlaneGeometry(2, 0.5);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = 0;
        textMesh.renderOrder = 990;
        textMesh.visible = false; // Start hidden

        return textMesh;
    }
}
