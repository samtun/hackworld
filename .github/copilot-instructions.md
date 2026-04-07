# GitHub Copilot Instructions for Hackworld

## Core Principles

### 0. Commit Message Standards
This project enforces **Conventional Commits** for all commit messages. Every commit must follow this format:

```
type: description
```

#### Required Format
- **type**: One of the following (required):
  - `feat`: New feature (triggers minor version bump)
  - `fix`: Bug fix (triggers patch version bump)
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, missing semicolons, etc.)
  - `refactor`: Code refactoring without feature or bug changes
  - `perf`: Performance improvements
  - `test`: Adding or updating tests
  - `chore`: Build process, dependencies, or tooling changes
  - `ci`: CI/CD configuration changes

- **description**: Short summary in imperative mood (e.g., "add feature" not "added feature")

#### Examples
- ✅ `feat: add inventory sorting feature`
- ✅ `fix: resolve player collision bug`
- ✅ `docs: update installation instructions`
- ✅ `chore: update dependencies`
- ❌ `Initial plan` (missing type)
- ❌ `added new feature` (missing type separator)
- ❌ `WIP changes` (not conventional format)

#### Breaking Changes
**CRITICAL**: Breaking changes (major version bumps) must **ONLY** be used when the `SaveData` structure in `SaveManager.ts` becomes incompatible with the previous version. This includes adding, removing, or changing the meaning of fields in the `SaveData` interface.

**Do NOT** use breaking changes for any other reason, even if the code change is significant (e.g., redesigning a game system, removing a UI component, or changing game mechanics). These are regular `feat` or `fix` commits.

To mark a save-game-breaking change, add `BREAKING CHANGE:` in the commit body or use `!` after the type:
```
feat!: add player skill tree to save data

BREAKING CHANGE: SaveData structure changed – old saves are incompatible.
```

#### Enforcement
- **Local**: Husky commit-msg hook validates commits before creation
- **CI**: Pull requests are checked to ensure all commits follow conventions
- **Automated Releases**: Conventional commits drive semantic versioning and changelog generation

**CRITICAL**: Always use conventional commit format for all commits. Non-compliant commits will fail CI checks.

### 1. Maintainability First
- Write clean, readable, and self-documenting code
- Follow consistent coding patterns throughout the codebase
- Add clear comments for complex logic, especially in game mechanics and physics calculations
- Keep functions focused on a single responsibility
- Use descriptive variable and function names that clearly indicate their purpose
- Avoid magic numbers - use named constants with clear meanings
- Structure code to be easily testable and debuggable

### 2. Entity-Based Architecture
This project uses an **entity-based architecture** for game logic. Always follow these patterns:

#### Entity Structure
- Each game entity (Player, Enemy, Weapon, etc.) should be a separate class in its own file
- Entities must encapsulate their own state, behavior, and rendering logic
- Each entity class should manage:
  - Visual representation (Three.js meshes)
  - Physics body (Cannon-es body)
  - Internal state (health, position, stats, etc.)
  - Update logic (per-frame behavior)
  - Lifecycle methods (initialization, cleanup)

#### Entity Guidelines
- **Never** put entity-specific logic in the main Game class
- **Always** create new entity types as separate classes following existing patterns (e.g., `Player.ts`, `Enemy.ts`, `Weapon.ts`)
- When adding new game objects, create them as entities with proper encapsulation
- Entities should communicate through well-defined interfaces, not by directly accessing each other's internal state
- Keep entity classes modular and independent where possible
- Use composition over inheritance for entity capabilities

#### Example Entity Pattern
```typescript
export class NewEntity {
    mesh: THREE.Mesh;           // Visual representation
    body: CANNON.Body;          // Physics body
    // Entity-specific state
    private someState: number;
    
    constructor(scene: THREE.Scene, world: CANNON.World, params: any) {
        // Initialize mesh and add to scene
        // Initialize physics body and add to world
        // Set up initial state
    }
    
    update(deltaTime: number): void {
        // Update entity logic
        // Sync mesh position with physics body
    }
    
    cleanup(): void {
        // Remove from scene and world
        // Dispose of resources
    }
}
```

If the entity defines a mesh extend the `BaseMesh` class and use its disposeMesh method inside of the `cleanup` method like this:

```
this.disposeMesh();
```

### 3. Code Organization
- Keep related functionality together in appropriate files and split into new files as responsibilities shift into another entity
- Use the existing file structure:
  - `Game.ts` - Main game loop and coordination
  - `World.ts` - Main world management
  - Stage files (`CrimsonDepths.ts`, `Lobby.ts`) - Individual stages of the game
  - Entity files (`Player.ts`, `Enemy.ts`, etc.) - Individual game entities
  - Manager files (`InputManager.ts`, `UIManager.ts`, etc.) - System management
- When adding new features, consider if they belong in an existing file or need a new module
- Maintain separation of concerns between rendering, physics, and game logic

### 4. TypeScript Best Practices
- Use explicit types for all function parameters and return values
- Leverage TypeScript's type system for compile-time safety
- Define interfaces for complex data structures
- Use object oriented classes instead of exporting plain objects or functions
- Use enums instead of string literal unions for fixed sets of values (e.g., WeaponType)
- Avoid using `any` type unless absolutely necessary

### 5. Documentation

#### Code Comments
- Document non-obvious logic with inline comments
- Add JSDoc comments for public methods and classes
- Explain the "why" not just the "what" in comments
- Keep comments up-to-date when code changes, but do not describe the changes themselves, rather replace a comment with the new status quo

#### README Updates
**CRITICAL**: Always update the README.md when making changes that change high level game behavior. Also edit the readme for changes that include the following:
- Installation or setup procedures
- Build or development commands
- Dependencies or tech stack
- Project structure or architecture
- Usage instructions or controls

When updating README.md:
- Keep the language clear and concise
- Maintain the existing structure and formatting
- Update the appropriate sections (Features, Installation, Tech Stack, etc.)
- Ensure all information is current and accurate
- Test any commands or instructions you document

### 6. Performance Considerations
- Be mindful of per-frame operations (update loops)
- Dispose of Three.js geometries and materials when no longer needed
- Remove physics bodies from the world when entities are destroyed
- Use object pooling for frequently created/destroyed entities where appropriate
- Avoid unnecessary calculations in the game loop

### 7. Dependencies
- Only add new dependencies when necessary
- Prefer built-in or existing dependencies over adding new ones
- Document why a new dependency is needed
- Update package.json appropriately
- Consider bundle size implications

### 8. Testing and Quality
- Test game mechanics manually after changes
- Ensure physics interactions work correctly
- Verify visual rendering is as expected
- Check for console errors or warnings
- Test in development mode before building for production

## Common Patterns in This Project

### Physics and Rendering Sync
Always sync Three.js mesh positions with Cannon-es body positions:
```typescript
// Note: Type casting is used due to compatibility between CANNON.Vec3/Quaternion and THREE.Vector3/Quaternion
this.mesh.position.copy(this.body.position as any);
this.mesh.quaternion.copy(this.body.quaternion as any);
```

### Resource Cleanup
Always clean up resources to prevent memory leaks:
```typescript
scene.remove(this.mesh);
world.removeBody(this.body);
if (this.mesh.geometry) this.mesh.geometry.dispose();
// Check if material has dispose method before calling
const material = this.mesh.material as THREE.Material;
if (material && typeof material.dispose === 'function') {
    material.dispose();
}
```

### Game State Management
Use the existing state management patterns in Game.ts for scene transitions and game state.

### Save System
The game includes a comprehensive save/load system managed by `SaveManager.ts` and `SaveManagerUI.ts`.

#### When Adding New Player Stats or Inventory Items
**CRITICAL**: When adding new player stats, inventory item types, or any persistent game state, you **MUST** update the save system:

1. **Update the SaveData interface** in `SaveManager.ts`:
   - Add new fields to the appropriate section (player stats, inventory, etc.)
   - Include proper TypeScript types for all new fields

2. **Update the save() method** in `SaveManager.ts`:
   - Add code to serialize the new data into the SaveData structure
   - For inventory items, follow the existing pattern with `kind` field:
     ```typescript
     if (i instanceof NewItemType) {
         return {
             kind: 'newitem',
             id: i.id,
             name: i.name,
             level: i.level,
             isEquipped: !!i.isEquipped,
             // Add other relevant properties
         };
     }
     ```

3. **Update the load() method** in `SaveManager.ts`:
   - Add code to restore the new data from the SaveData structure
   - For player stats, directly assign the values
   - For inventory items, create new instances from registries/repositories:
     ```typescript
     else if (itemData.kind === 'newitem') {
         const registry = NewItemRegistry.Instance;
         const def = registry.getByName(itemData.name);
         if (def) {
             const item = new NewItemType(
                 crypto.randomUUID(),
                 def.name,
                 // ... other constructor params
                 itemData.level
             );
             if (itemData.isEquipped) {
                 item.isEquipped = true;
             }
             player.inventory.push(item);
         }
     }
     ```

4. **Test thoroughly**:
   - Save a game with the new data
   - Load the save file and verify all data is restored correctly
   - Check that equipped states and levels are preserved

#### Important Notes
- Items are identified by their base properties (name, type, level), not by UUID
- Weapons are restored using `WeaponRepository.getWeaponByTypeAndLevel()`
- Cores and Chips are restored by looking up their name in their respective registries
- Always create new instances with fresh UUIDs when loading
- Call `player.recalculateStats()` after loading to ensure equipped items apply their effects correctly

#### Save Game Version Compatibility
**CRITICAL**: Save files are only compatible with the same **major** game version. A major version bump must **ONLY** be triggered by changes to the `SaveData` structure — adding fields, removing fields, or changing the meaning of existing fields. No other kind of change (gameplay, UI, rendering, physics, etc.) should ever use a breaking-change commit.

When you make a save-breaking change, you **MUST** use a breaking-change conventional commit:

```
feat!: <description of save-breaking change>

BREAKING CHANGE: Save game structure changed – old saves are incompatible.
```

This ensures `semantic-release` increments the major version (e.g. `1.x.x` → `2.0.0`), and the in-game version check will warn players before they load an incompatible save file.

## Unit Testing

### When to Write / Update Tests
- **ALWAYS** add or update unit tests when changing game logic (player stats, combat, save/load, item drops, trader transactions, etc.).
- When a feature changes, update the corresponding tests so they reflect the new expected behaviour — do not just delete tests that now fail.

### Test File Conventions
- Test files live next to the source file: `src/Foo.ts` → `src/Foo.test.ts`.
- Use `vitest` (`describe`, `it`, `expect`, `vi`) — the existing setup is in `vitest.config.ts`.
- Run tests with `npm test`; run with coverage with `npm run test:coverage`.

### Bypassing Constructors for 3D Classes
Entities like `Player`, `Enemy`, and `BaseTrader` require Three.js scenes, Cannon-es worlds, DOM elements, and `AssetManager` in their constructors — none of which exist in the Node test environment.  
Use `Object.create(ClassName.prototype)` and manually assign only the properties each test needs:

```ts
function makePlayer(overrides = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, { /* minimal required fields */ });
    (player as any).syncPosition = vi.fn();
    return Object.assign(player, overrides);
}
```

### Test Quality Rules
- **NEVER make a property or method `public` just to be able to test it.** Refactor the design to make the behaviour observable through existing public APIs, or test through higher-level methods.
- **Test concrete, hard-coded values** wherever the expected output is deterministic:
  - ✅ `expect(player.getCriticalChance()).toBeCloseTo(0.02053, 4)`
  - ❌ `expect(player.getCriticalChance()).toBeGreaterThan(0)`
- **Use equivalence classes** to find the smallest representative set of inputs:
  - Test one value from each logical partition (e.g., minimum, typical, maximum, boundary).
  - Avoid repeating tests that differ only in unimportant ways.
- **Combine assertions about the same operation** into one test rather than one `it()` per property:
  ```ts
  it('restores all player stats from save data', () => {
      mgr.loadSaveData(data);
      expect(player.level).toBe(10);
      expect(player.bits).toBe(5000);
      expect(player.tech[WeaponType.SWORD]).toBe(300);
  });
  ```

## What to Avoid
- ❌ Don't create monolithic classes with too many responsibilities
- ❌ Don't bypass the entity-based architecture
- ❌ Don't add entity logic directly to Game.ts or World.ts
- ❌ Don't forget to update README.md when changing high level features
- ❌ Don't create tightly coupled components
- ❌ Don't ignore TypeScript type errors
- ❌ Don't leave excessive debug logging (use console.log sparingly for important events only)
- ❌ Don't forget to dispose of resources (geometries, materials, bodies)
- ❌ Don't add or change comments in the code to explain changes to previous versions
- ❌ Don't use breaking-change commits (`!` or `BREAKING CHANGE:`) for anything other than `SaveData` structure changes
- ❌ Don't forget to consider all control schemes when implementing new controls or input features

## Control Schemes
The game supports three control schemes that must all be considered when adding or modifying controls:

### 1. Keyboard Controls
- WASD/Arrow keys for movement
- Space for jump
- K for attack
- Q for modifier (skills)
- I for inventory
- Enter for interact/select
- Escape for cancel/close

### 2. Gamepad Controls (Xbox Controller)
- Left Stick for movement
- A button (button 0) for jump/interact
- B button (button 1) for cancel
- X button (button 2) for attack
- L1 shoulder button (button 4) for skill modifier
- Select (button 8) for inventory
- D-Pad for navigation

### 3. Mobile Touch Controls
- Virtual joystick for movement (bottom-left)
- A, B, X buttons (bottom-right) for jump, cancel, attack
- Skills button (top-left) toggles A/B/X buttons between normal mode and skill mode
- When in skill mode: A=Laser, B=Heal, X=Area
- Buttons automatically revert to normal mode after using a skill
- Inventory button (top-right)

**CRITICAL**: When adding new input features:
1. Implement for all three control schemes (keyboard, gamepad, mobile)
2. Update `InputManager.ts` with keyboard and gamepad mappings
3. Update `MobileControlsManager.ts` with mobile touch controls
4. Test all control schemes to ensure feature parity
5. Update README.md with all control mappings