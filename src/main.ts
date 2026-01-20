import { Game } from './Game';
import './style.css';

window.addEventListener('DOMContentLoaded', async () => {
    const game = await Game.create();
    // Expose game for debugging/testing
    (window as any).game = game;
});
