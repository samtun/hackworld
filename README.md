# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- **Level system** - Gain EXP from defeating enemies to level up and increase your stats
- Inventory system with looting mechanics
- **Card Collection** - Collect cards from booster packs found as enemy drops
- **Save system** - Save your game progress to a JSON file through the Save Manager NPC in the lobby

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
   - The combat feels a bit more dynamic while keeping the original feel in many areas

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

### Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent commit messages and enable automated versioning.

#### Commit Message Format
All commit messages must follow this format:
```
type: description
```

Common types:
- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools

Examples:
- `feat: add inventory sorting feature`
- `fix: resolve player collision bug`
- `docs: update installation instructions`

#### Local Enforcement
Commit messages are validated locally via Husky hooks. Invalid commits will be rejected before they reach the repository.

### Debug Mode
The game includes a comprehensive debug mode for development and testing.
- **Availability**: Development builds only (`npm run dev`)
- **Toggle**: Press **F8** to enable/disable debug mode

#### Debug Features
When debug mode is enabled (F8), you get access to:

1. **Physics Colliders Visualization**: Red wireframe boxes show all physics collision boundaries
2. **Debug Value Editor**: A powerful overlay for live editing and testing
   - **Player Stats Editor**: Modify HP, TP, Strength, Defense, Speed, Level, X-Data, and Money in real-time
   - **Add Items**: Add any weapons, cores and chips to the player inventory
   - **Collapsible UI**: Click the arrow button (▼/▲) to expand or collapse the editor panel

## Deployment

Both production and PR preview deployments use the `gh-pages` branch to enable subdirectory-based previews without conflicts.

### CI/CD Workflows

#### Commit Linting
Pull requests are automatically checked to ensure all commits follow the conventional commit format. This ensures consistent commit history and enables automated releases.

#### Automated Releases
When changes are merged to `main`:
1. **semantic-release** analyzes commits since the last release
2. Determines the next version number (major, minor, or patch)
3. Updates `package.json` and `package-lock.json`
4. Generates/updates `CHANGELOG.md`
5. Creates a Git tag and GitHub Release

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
