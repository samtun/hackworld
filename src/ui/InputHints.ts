import { InputManager } from '../controls/InputManager';

/**
 * Utility module for generating dynamic input hints based on connected input method
 */

export interface HintConfig {
    keyboard: string;
    controller: string;
}

/**
 * Returns the appropriate hint text based on whether a controller is connected or mobile device
 */
export function getHint(config: HintConfig, inputManager: InputManager): string {
    // On mobile devices, always show controller hints (A/B buttons match mobile controls)
    if (inputManager.isMobile) {
        return config.controller;
    }
    // Otherwise, show controller hints if gamepad is connected, keyboard hints otherwise
    return inputManager.isControllerConnected() ? config.controller : config.keyboard;
}

/**
 * Returns the keyboard variant of a hint configuration (useful for fallbacks)
 */
export function getKeyboardHint(config: HintConfig): string {
    return config.keyboard;
}

/**
 * Common hint configurations
 */
export const HintConfigs = {
    interact: {
        keyboard: '<span class="key-icon">ENTER</span> Interact',
        controller: '<span class="btn-icon xbox-a">A</span> Interact'
    },
    pickUp: {
        keyboard: '<span class="key-icon">ENTER</span> Pick up',
        controller: '<span class="btn-icon xbox-a">A</span> Pick up'
    },
    enterTeleporter: {
        keyboard: '<span class="key-icon">ENTER</span> Enter Teleporter',
        controller: '<span class="btn-icon xbox-a">A</span> Enter Teleporter'
    },
    continue: {
        keyboard: '<span class="key-icon">ENTER</span> Continue',
        controller: '<span class="btn-icon xbox-a">A</span> Continue'
    },
    continueExit: {
        keyboard: '<span class="key-icon">ENTER</span> Continue | <span class="key-icon">ESC</span> Exit',
        controller: '<span class="btn-icon xbox-a">A</span> Continue | <span class="btn-icon xbox-b">B</span> Exit'
    },
    closeExit: {
        keyboard: '<span class="key-icon">ENTER</span> Close | <span class="key-icon">ESC</span> Exit',
        controller: '<span class="btn-icon xbox-a">A</span> Close | <span class="btn-icon xbox-b">B</span> Exit'
    },
    buySellClose: {
        keyboard: '<span class="key-icon">ENTER</span> Buy/Sell <span style="margin: 0 15px;"></span> <span class="key-icon">ESC</span> Close',
        controller: '<span class="btn-icon xbox-a">A</span> Buy/Sell <span style="margin: 0 15px;"></span> <span class="btn-icon xbox-b">B</span> Close'
    },
    upgradeClose: {
        keyboard: '<span class="key-icon">ENTER</span> Upgrade <span style="margin: 0 15px;"></span> <span class="key-icon">ESC</span> Close',
        controller: '<span class="btn-icon xbox-a">A</span> Upgrade <span style="margin: 0 15px;"></span> <span class="btn-icon xbox-b">B</span> Close'
    },
    revealContinue: {
        keyboard: '<span class="key-icon">ENTER</span> to reveal cards',
        controller: '<span class="btn-icon xbox-a">A</span> to reveal cards'
    },
    continuePack: {
        keyboard: '<span class="key-icon">ENTER</span> to continue',
        controller: '<span class="btn-icon xbox-a">A</span> to continue'
    },
    inventoryNavigate: {
        keyboard: '<span class="key-icon">UP</span> / <span class="key-icon">DOWN</span> Navigate | <span class="key-icon">ENTER</span> Equip | <span class="key-icon">ESC</span> Close',
        controller: '<span class="btn-icon xbox-dpad">D-PAD</span> Navigate | <span class="btn-icon xbox-a">A</span> Equip | <span class="btn-icon xbox-b">B</span> Close'
    },
    menuNavigate: {
        keyboard: '<span class="key-icon">↑↓</span> Navigate | <span class="key-icon">ENTER</span> Select | <span class="key-icon">ESC</span> Back',
        controller: '<span class="btn-icon xbox-dpad">D-Pad</span> Navigate | <span class="btn-icon xbox-a">A</span> Select | <span class="btn-icon xbox-b">B</span> Back'
    },
    openChest: {
        keyboard: '<span class="key-icon">ENTER</span> Open Chest',
        controller: '<span class="btn-icon xbox-a">A</span> Open Chest'
    }
};
