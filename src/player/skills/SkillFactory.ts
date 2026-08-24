import { AssetManager } from "../../AssetManager";
import { AudioManager } from "../../AudioManager";
import { BlastSkill } from "./BlastSkill";
import { RecoverySkill } from "./RecoverySkill";
import { RangedSkill } from "./RangedSkill";
import { Skill } from "./Skill";
import { SkillTechType } from "./SkillType";
import { singleton } from "tsyringe";
import { UIManager } from "../../ui/UIManager";
import { PhysicsBodyMetadataManager } from "../../PhysicsBodyMetadata";

@singleton()
export class SkillFactory {
    constructor(
        private readonly assetManager: AssetManager,
        private readonly audioManager: AudioManager,
        private readonly uiManager: UIManager,
        private readonly physicsBodyMetadataManager: PhysicsBodyMetadataManager
    ) { }

    public createSkill(skillType: SkillTechType, onCompleteCallback: () => void): Skill {
        switch (skillType) {
            case SkillTechType.RANGED:
                return new RangedSkill(onCompleteCallback, this.assetManager, this.audioManager, this.uiManager, this.physicsBodyMetadataManager);
            case SkillTechType.RECOVERY:
                return new RecoverySkill(onCompleteCallback, this.assetManager, this.audioManager, this.uiManager);
            case SkillTechType.BLAST:
                return new BlastSkill(onCompleteCallback, this.assetManager, this.audioManager, this.uiManager, this.physicsBodyMetadataManager);
            default:
                throw new Error(`Unknown skill type: ${skillType}`);
        }
    }
}