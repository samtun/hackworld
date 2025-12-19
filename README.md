# Hackworld

![Hackworld promo image](public/images/promo.png)

A 3D web game developed with TypeScript, Three.js, and Cannon-es.

## Features

- Hack and slash gameplay
- Hub based game world with multiple dungeon stages
- Two unique dungeon stages accessible from the lobby
- Inventory system with looting mechanics
- **Weapon drops** - Defeated enemies have a chance to drop weapons that can be picked up and added to your inventory
- **Interactive trader** in the lobby - Buy and sell items, manage your bits
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

#### Weapon Drops
Defeated enemies have a chance to drop weapons:
- **Regular enemies**: 2% drop chance
- **Large enemies**: 10% drop chance
- The drop favors your currently equipped weapon type (45% chance), with other types equally distributed
- Dropped weapons have random bonus stats (-10% to +20%), with most drops close to base stats
- Weapons float above the ground with their name displayed, visible when you get close

#### Equipment System
The game features an equipment system that allows you to customize your character:

**Weapons**: Four weapon types are available, each with unique attack patterns and stats
- **Aegis Sword** (Sword) - Balanced weapon with 10 base damage
- **Rune Blade** (Dual Blade) - Fast dual-wielding weapon with 7 base damage
- **Fierce** (Lance) - Long-range weapon with 12 base damage
- **Battle Hawk** (Hammer) - Heavy weapon with 18 base damage

**Cores**: Equippable items that modify your character's stats
- **Herald Core** - Strength +3, Defense +2
- **Swift Core** - Speed +4, Defense -2
- **Defender Core** - Strength -1, Defense +4

Cores and weapons can be equipped at any time through the inventory (press I/Select).

### Item Registry System
The game uses a centralized registry pattern for managing items:
- **WeaponRegistry**: Single source of truth for all weapons. Weapons have random bonus stats on drops.
- **CoreRegistry**: Single source of truth for all cores. Core stats are always fixed.
- Both registries are extensible, allowing new items to be added dynamically via `registerWeapon()` and `registerCore()` methods.

## Development

### Debug Mode
The game includes a debug mode for visualizing physics colliders.
- **Availability**: Development builds only (`npm run dev`)
- **Toggle**: Press **F8** to show/hide colliders

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
