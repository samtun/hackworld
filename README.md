# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- Two unique dungeon stages accessible from the lobby
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

## Inspiration & Goal

- The game is a fan project trying to recreate the esthetic and reuse some of the mechanics of the 2005 game Digimon World 4
- It attempts to improve some of the biggest issues the original game had:
   - The hub is a single area without loading screens
   - Loading screens in general are less common and finish quicker
   - New equipment can be equipped at any time. No need to return to the hub
   - The X-Data resource is meant to be implemented, however it should be dropped more frequent on earlier levels already
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

### Combat Mechanics

#### Charged Attack
Hold the attack button for 1 second to charge a powerful dash attack:
- While charging, a particle wall appears around your character in a teardrop pattern
- Particles rise higher once the attack is fully charged
- You cannot move while charging
- Release the attack button after charging to execute a forward dash
- During the dash, you deal **3x damage** to all enemies you touch
- You are **invincible** during the dash
- The dash covers approximately 4 meters at high speed

## Development

### Development Mode Features
Development builds (`npm run dev`) include the following features:

#### Start Screen
- The "Press START" screen is automatically skipped in development mode
- Production builds still show the start screen normally

#### Debug Mode
- Visualize physics colliders by pressing **F8**

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
