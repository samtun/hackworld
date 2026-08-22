import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Npc } from './Npc';
import { GameProgressManager } from '../GameProgressManager';
import { NpcRegistry } from './NpcRegistry';
import { AssetManager } from '../AssetManager';

export class MainframeNpc extends Npc {
    constructor(
        private readonly gameProgressManager: GameProgressManager,
        assetManager: AssetManager,
        npcRegistry: NpcRegistry,
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3
    ) {
        const dialogue = MainframeNpc.getDialogueForProgress(gameProgressManager.progress);
        super(
            assetManager,
            npcRegistry,
            scene,
            physicsWorld,
            physicsMaterial,
            "models/mainframe.glb",
            "The Mainframe",
            "Access System",
            position,
            dialogue
        );

        // bind interaction callback to mainframe-specific logic
        this.interactionCallback = this.onInteract.bind(this);
    }

    updateDialogue(progress: number): void {
        this.dialogue = MainframeNpc.getDialogueForProgress(progress);
    }

    private onInteract(): void {
        const currentProgress = this.gameProgressManager.progress;

        if (currentProgress === 0 || (currentProgress > 0 && currentProgress % 2 === 0)) {
            this.gameProgressManager.advanceProgress();
            console.log('Mainframe: New stage unlocked! Progress now:', this.gameProgressManager.progress);
            this.updateDialogue(this.gameProgressManager.progress);
        }
    }

    private static getDialogueForProgress(progress: number): string[] {
        if (progress === 0) {
            return [
                "CONNECTION ESTABLISHED...",
                "Greetings, consciousness. I am the Mainframe, the central intelligence of the Ometec corporation.",
                "The year is 2053. A catastrophic system failure has begun tearing through our infrastructure.",
                "A technician was summoned when our automated systems failed to contain the corruption.",
                "Upon interfacing with our servers, his neural patterns manifested within our digital realm.",
                "You are that manifestation - his mind given form within the machine.",
                "The world you perceive is the company's vast digital infrastructure, now under siege.",
                "Multiple system layers are infected with aggressive malware, self-replicating and destructive.",
                "I require your assistance to cleanse these corrupted sectors before total system collapse.",
                "The Network Matrix is our first tactical lane. It has been compromised.",
                "Navigate to the southern teleporter when you are ready. Purge all hostile entities in that layer.",
                "The fate of Ometec's entire digital existence rests in your hands."
            ];
        } else if (progress === 1) {
            return [
                "The Network Matrix remains unstable.",
                "Clear every combat room to restore routing integrity.",
                "When the sector is clean, return for your next assignment."
            ];
        } else if (progress === 2) {
            return [
                "POSITIVE FEEDBACK DETECTED...",
                "Network Matrix pathways stabilized. Excellent work.",
                "The malware has moved into Packet Forge, our packet refinement layer.",
                "The next sector is now unlocked via teleporter."
            ];
        } else if (progress === 3) {
            return [
                "Packet Forge is dense with aggressive malware workers.",
                "Expect increased resistance and faster swarm patterns.",
                "Cleanse the forge and report back."
            ];
        } else if (progress === 4) {
            return [
                "Packet Forge sanitized.",
                "Cipher Null has now destabilized and must be contained.",
                "Teleporter coordinates updated."
            ];
        } else if (progress === 5) {
            return [
                "Cipher Null houses archived threat fragments and encrypted predators.",
                "Expect stronger elites and volatile trap activity.",
                "Eliminate all hostiles before escalation."
            ];
        } else if (progress === 6) {
            return [
                "Cipher Null restoration confirmed.",
                "Security Core is now exposed and has entered critical threat status.",
                "Proceed when prepared."
            ];
        } else if (progress === 7) {
            return [
                "Security Core now contains hardened malware guardians.",
                "Survival probability improves with high defense and damage output.",
                "Purge the core and return immediately."
            ];
        } else if (progress === 8) {
            return [
                "Security Core secured.",
                "Final breach detected: Kernel Terminus.",
                "Kernel defenses are splitting into multiple high-threat signatures. Extreme caution advised."
            ];
        } else if (progress === 9) {
            return [
                "Kernel Terminus is the final infected layer currently mapped.",
                "Hostiles there are significantly stronger than prior sectors.",
                "Neutralize every active malware signature and end this outbreak."
            ];
        } else {
            return [
                "SYSTEM STATUS: STABLE",
                "All mapped sectors are currently cleansed.",
                "Kernel integrity is recovering.",
                "Stand by for future mission parameters.",
                "Your contributions to system integrity remain invaluable."
            ];
        }
    }
}
