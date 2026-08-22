import "reflect-metadata";

import { container } from 'tsyringe';

import './style.css';
import { XDataDropStrategy } from './items/xdata/XDataDropStrategy';
import { WeaponDropStrategy } from './items/weapons/WeaponDropStrategy';
import { CoreDropStrategy } from './items/cores/CoreDropStrategy';
import { MoneyDropStrategy } from './items/bits/MoneyDropStrategy';
import { ChipDropStrategy } from './items/chips/ChipDropStrategy';
import { BoosterPackDropStrategy } from './items/cards/BoosterPackDropStrategy';
import { MinimapDropStrategy } from "./items/minimap/MinimapDropStrategy";
import { HPPotionDropStrategy } from "./items/potions/HPPotionDropStrategy";
import { TPPotionDropStrategy } from "./items/potions/TPPotionDropStrategy";
import { Game } from './Game';

function debugContainer(targetClass: any) {
    // Liest die von TypeScript generierten Constructor-Typen aus
    const dependencies = Reflect.getMetadata("design:paramtypes", targetClass);

    console.log(`=== Debugging Dependencies für: ${targetClass.name} ===`);
    if (!dependencies) {
        console.error(`❌ No metadata for ${targetClass.name} found! Missing @injectable() or @singleton()?`);
        return;
    }

    dependencies.forEach((dep: any, index: number) => {
        if (dep === undefined) {
            console.error(`❌ Parameter at index ${index} in ${targetClass.name} is UNDEFINED! That's the culprit.`);
        } else {
            console.log(`✅ Parameter ${index}: ${dep.name}`);
        }
    });
}

// Only for debugging the dependency injection container in development mode
import { WorldFactory } from "./WorldFactory";


function setupDi() {
    // Register item drop strategies
    container.registerSingleton("ItemDropStrategy", WeaponDropStrategy);
    container.registerSingleton("ItemDropStrategy", XDataDropStrategy);
    container.registerSingleton("ItemDropStrategy", CoreDropStrategy);
    container.registerSingleton("ItemDropStrategy", ChipDropStrategy);
    container.registerSingleton("ItemDropStrategy", MoneyDropStrategy);
    container.registerSingleton("ItemDropStrategy", BoosterPackDropStrategy);
    container.registerSingleton("ItemDropStrategy", MinimapDropStrategy);
    container.registerSingleton("ItemDropStrategy", HPPotionDropStrategy);
    container.registerSingleton("ItemDropStrategy", TPPotionDropStrategy);
}

window.addEventListener('DOMContentLoaded', () => {
    setupDi();
    if (import.meta.env.DEV) {
        // Check dependency injection for WorldFactory in development mode
        debugContainer(WorldFactory);
    }
    const game = container.resolve(Game);
    // Expose game for debugging/testing
    (window as any).game = game;
});
