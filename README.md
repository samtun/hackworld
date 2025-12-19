# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- Two unique dungeon stages accessible from the lobby
- **Level system** - Gain EXP from defeating enemies to level up and increase your stats
  - Each level increases strength, defense, and speed
  - Max level is 999
  - EXP requirements scale with level
- Inventory system with looting mechanics
- **Weapon drops** - Defeated enemies have a chance to drop weapons that can be picked up and added to your inventory
- **Interactive trader** in the lobby - Buy and sell weapons and cores, manage your bits
- **Chip system** - Equip chips to modify player behavior and weapon properties
  - **Firewire** - Increases weapon range by 10%
  - **Overclock** - Increases walk speed by 10%
  - Chips can be purchased from the chip trader in the lobby
- **X-Data resource system** - Collect X-Data from defeated enemies and use it to permanently upgrade your stats with Ford in the lobby

## Tech Stack

- **Language**: TypeScript
- **Rendering**: Three.js
- **Physics**: Cannon-es
- **Build Tool**: Vite
- **Hosting**: GitHub Pages

## Live Demo

Play the game at: [https://samtun.github.io/hackworld/](https://samtun.github.io/hackworld/)

## Inspiration & Goal

- The game is a fan project trying to recreate the esthetic and reuse some of the mechanics of the 2005 game Digimon World 4
- It attempts to improve some of the biggest issues the original game had:
   - The hub is a single area without loading screens
   - Loading screens in general are less common and finish quicker
   - New equipment can be equipped at any time. No need to return to the hub
   - The X-Data resource system is implemented with drops from enemies that can be used for permanent stat upgrades
   - The combat feels a bit more dynamic while keeping the original feel in many areas
   - Tech (skills) is improved by reducing the amount of skills and using quick access button combinations to them rather than tedious switching via a menu

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

The game is fully playable with keyboard and controller (tested with XBox controller).

- **WASD / Arrow Keys / LStick**: Move player
- **Space / A**: Jump
- **K / X**: Attack (tap for normal attack, hold for 1s then release for charged dash attack)
- **I / Select**: Toggle inventory
- **Enter / A**: Interact and select in menus
- **ESC / B**: Close menus

## Development

### Debug Mode
The game includes a comprehensive debug mode for development and testing.
- **Availability**: Development builds only (`npm run dev`)
- **Toggle**: Press **F8** to enable/disable debug mode

#### Debug Features
When debug mode is enabled (F8), you get access to:

1. **Physics Colliders Visualization**: Red wireframe boxes show all physics collision boundaries
2. **Debug Value Editor**: A powerful overlay for live editing and testing
   - **Player Stats Editor**: Modify HP, TP, Strength, Defense, Speed, Level, X-Data, and Money in real-time
   - **Add Weapons**: Add any weapon from the registry with custom damage values
   - **Add Cores**: Add any core from the registry with their defined stats
   - **Collapsible UI**: Click the arrow button (▼/▲) to expand or collapse the editor panel

The debug value editor is positioned in the top-right corner and can be toggled between expanded and collapsed states for convenience during testing.

## Deployment

Both production and PR preview deployments use the `gh-pages` branch to enable subdirectory-based previews without conflicts.

### Production Deployment
The game is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow:
- Builds the project using Vite with base path `/hackworld/`
- Deploys to the root of the `gh-pages` branch
- Accessible at [https://samtun.github.io/hackworld/](https://samtun.github.io/hackworld/)

### PR Preview Deployments
Pull requests that are marked as "ready for review" automatically get preview deployments:
- Each PR is built with a unique base path (e.g., `/hackworld/pr-123/`)
- Preview is deployed to a subdirectory in the `gh-pages` branch
- A comment with the preview URL is automatically added to the PR
- Preview updates automatically when new commits are pushed to the PR
- **Preview is automatically deleted** when the PR is closed or merged
- Preview URL format: `https://samtun.github.io/hackworld/pr-{number}/`
