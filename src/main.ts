import "reflect-metadata";

import { container } from 'tsyringe';

import './style.css';
import { XDataDropStrategy } from './items/xdata/XDataDropStrategy';
import { WeaponDropStrategy } from './items/weapons/WeaponDropStrategy';
import { CoreDropStrategy } from './items/cores/CoreDropStrategy';
import { MoneyDropStrategy } from './items/bits/MoneyDropStrategy';
import { ChipDropStrategy } from './items/chips/ChipDropStrategy';
import { BoosterPackDropStrategy } from './items/cards/BoosterPackDropStrategy';
import { CipherNull, KernelTerminus, NetworkMatrix, PacketForge, SecurityCore } from './stages';
import { GameTest } from './stages/GameTest';
import { Game } from './Game';

function debugContainer(targetClass: any) {
    // Liest die von TypeScript generierten Constructor-Typen aus
    const dependencies = Reflect.getMetadata("design:paramtypes", targetClass);

    console.log(`=== Debugging Dependencies für: ${targetClass.name} ===`);
    if (!dependencies) {
        console.error(`❌ Keine Metadaten für ${targetClass.name} gefunden! Fehlt @injectable() oder @singleton()?`);
        return;
    }

    dependencies.forEach((dep: any, index: number) => {
        if (dep === undefined) {
            console.error(`❌ Parameter bei Index ${index} in ${targetClass.name} ist UNDEFINED! Das ist der Übeltäter.`);
        } else {
            console.log(`✅ Parameter ${index}: ${dep.name}`);
        }
    });
}

// Setze hier die Klasse ein, die fehlschlägt (z. B. deine WorldFactory)
import { WorldFactory } from "./WorldFactory";


function setupDi() {
    // Register item drop strategies
    container.registerSingleton("ItemDropStrategy", WeaponDropStrategy);
    container.registerSingleton("ItemDropStrategy", XDataDropStrategy);
    container.registerSingleton("ItemDropStrategy", CoreDropStrategy);
    container.registerSingleton("ItemDropStrategy", ChipDropStrategy);
    container.registerSingleton("ItemDropStrategy", MoneyDropStrategy);
    container.registerSingleton("ItemDropStrategy", BoosterPackDropStrategy);

    // Register mission stages
    container.registerInstance("MissionStage", NetworkMatrix);
    container.registerInstance("MissionStage", PacketForge);
    container.registerInstance("MissionStage", CipherNull);
    container.registerInstance("MissionStage", SecurityCore);
    container.registerInstance("MissionStage", KernelTerminus);
    if (import.meta.env.DEV) {
        container.registerInstance("MissionStage", GameTest);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupDi();
    debugContainer(WorldFactory);
    const game = container.resolve(Game);
    // Expose game for debugging/testing
    (window as any).game = game;
});
