export enum PlayerActionType {
    Idle = 'Idle',
    RunOneHanded = 'RunOneHanded',
    RunTwoHanded = "RunTwoHanded",
    Jump = 'Jump',
    AttackSword = 'AttackOneHanded',
    // TODO: Add dual blade attack animation
    AttackDualBlade = 'AttackOneHanded',
    // TODO: Add lance attack animation
    AttackLance = 'AttackTwoHanded',
    AttackHammer = 'AttackTwoHanded',
    SkillRanged = 'PowerUp',
    SkillArea = 'PowerUp',
    SkillHeal = 'PowerUp',
    TakeHit = "TakeHit",
    // TODO: Add block animation
    Block = "Idle",
    Death = "Death",
    StartCharge = "StartCharge",
    Dash = "Dash",
    PowerUp = "PowerUp"
};