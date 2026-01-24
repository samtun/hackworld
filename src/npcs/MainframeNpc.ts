import * as THREE from 'three';
import { Npc } from './Npc';
import { GameProgressManager } from '../GameProgressManager';
import RAPIER from '@dimforge/rapier3d-compat';

export class MainframeNpc extends Npc {
    constructor(
        scene: THREE.Scene,
        world: RAPIER.World,
        physicsMaterial: any,
        position: THREE.Vector3
    ) {
        const progressManager = GameProgressManager.Instance;
        const dialogue = MainframeNpc.getDialogueForProgress(progressManager.progress);

        super(scene, world, physicsMaterial, "models/mainframe.glb", "The Mainframe", "Access System", position, dialogue);

        // bind interaction callback to mainframe-specific logic
        this.interactionCallback = this.onInteract.bind(this);
    }

    updateDialogue(progress: number): void {
        this.dialogue = MainframeNpc.getDialogueForProgress(progress);
    }

    private onInteract(): void {
        const progressManager = GameProgressManager.Instance;
        const currentProgress = progressManager.progress;

        if (currentProgress === 0 || (currentProgress > 0 && currentProgress % 2 === 0)) {
            progressManager.advanceProgress();
            console.log('Mainframe: New stage unlocked! Progress now:', progressManager.progress);
            this.updateDialogue(progressManager.progress);
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
                "The Security Core is the first line of defense. It has been completely overrun.",
                "Navigate to the southern teleporter when you are ready. Eliminate the virus at its source.",
                "The fate of Ometec's entire digital existence rests in your hands."
            ];
        } else if (progress === 1) {
            return [
                "The Security Core awaits cleansing.",
                "Locate and eliminate the primary virus threat within.",
                "Until it is destroyed, the infection will continue to spread.",
                "Use the southern teleporter to access the corrupted sector."
            ];
        } else if (progress === 2) {
            return [
                "POSITIVE FEEDBACK DETECTED...",
                "The Security Core has been successfully sanitized. Excellent work.",
                "However, the malware has already spread to secondary systems.",
                "The Network Matrix - our communication infrastructure - is now under heavy attack.",
                "Multiple malicious entities have established themselves throughout the network.",
                "These must be purged before they can compromise our data integrity.",
                "The Network Matrix is now accessible through the teleporter.",
                "Proceed with extreme caution. The malware is evolving."
            ];
        } else if (progress === 3) {
            return [
                "The Network Matrix infection is severe.",
                "Multiple malware instances detected within the communication hub.",
                "Systematic elimination is required to restore network functionality.",
                "Access the sector via the teleporter when ready."
            ];
        } else if (progress === 4) {
            return [
                "ANALYSIS COMPLETE...",
                "Network Matrix successfully restored. Communication channels are secure.",
                "Further system layers require attention, but diagnostics are still in progress.",
                "Return here when additional sectors come online.",
                "Your efficiency has been... remarkable."
            ];
        } else {
            return [
                "SYSTEM STATUS: STABLE",
                "All currently accessible sectors have been cleansed.",
                "Additional infrastructure layers are being analyzed.",
                "Stand by for further mission parameters.",
                "Your contributions to system integrity are invaluable."
            ];
        }
    }
}
