import { Game } from './Game';
import './style.css';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    // Expose game for debugging/testing
    (window as any).game = game;
});
