# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- Two unique dungeon stages accessible from the lobby
- Asset preloading system to prevent visual popping during scene transitions
- Inventory system with looting mechanics
- **Interactive trader** in the lobby - Buy and sell items, manage your bits

## Tech Stack

- **Language**: TypeScript
- **Rendering**: Three.js
- **Physics**: Cannon-es
- **Build Tool**: Vite
- **Hosting**: GitHub Pages

## Live Demo

Play the game at: [https://samtun.github.io/hackworld/](https://samtun.github.io/hackworld/)

## Installation & Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Gameplay

### Controls
- **WASD / Arrow Keys**: Move player
- **Space**: Jump
- **Enter / K**: Attack
- **I**: Toggle inventory
- **Enter / A Button**: Interact with trader or portals
- **ESC / B Button**: Close menus

### Trading System
In the lobby, approach the trader NPC to buy and sell items:
- **Interact**: Press **Enter** or **A** (gamepad) when near the trader
- **Navigate**: Use **Arrow Keys** or **WASD** to move between trader and player inventories
- **Buy/Sell**: Press **Enter** or **A** to complete transactions
- **Close**: Press **ESC** or **B** to exit the trading menu
- All items display their buy and sell prices
- Player starts with 500 bits

## Development

### Debug Mode
The game includes a debug mode for visualizing physics colliders.
- **Availability**: Development builds only (`npm run dev`)
- **Toggle**: Press **F8** to show/hide colliders

## Deployment

The game is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow:
- Builds the project using Vite with base path `/hackworld/`
- Uploads the build artifacts from the `dist` folder
- Deploys to GitHub Pages at [https://samtun.github.io/hackworld/](https://samtun.github.io/hackworld/)
