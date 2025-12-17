# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world
- Inventory system with looting mechanics

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
