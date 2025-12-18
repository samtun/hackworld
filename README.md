# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- Two unique dungeon stages accessible from the lobby
- Inventory system with looting mechanics

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
