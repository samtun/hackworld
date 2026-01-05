import { InputManager } from '../InputManager';

/**
 * Utility module for generating dynamic input hints based on connected input method
 */

export interface HintConfig {
    keyboard: string;
    controller: string;
}

/**
 * Returns the appropriate hint text based on whether a controller is connected
 */
export function getHint(config: HintConfig, inputManager: InputManager): string {
    return inputManager.isControllerConnected() ? config.controller : config.keyboard;
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
    enterPortal: {
        keyboard: '<span class="key-icon">ENTER</span> Enter Portal',
        controller: '<span class="btn-icon xbox-a">A</span> Enter Portal'
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
        keyboard: 'Press ENTER to reveal cards',
        controller: 'Press A to reveal cards'
    },
    continuePack: {
        keyboard: 'Press ENTER to continue',
        controller: 'Press A to continue'
    }
};
