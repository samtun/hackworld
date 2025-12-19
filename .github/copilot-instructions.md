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
For breaking changes, add `BREAKING CHANGE:` in the commit body or use `!` after the type:
```
feat!: redesign player movement system

BREAKING CHANGE: Player movement now requires new input handling
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

### 3. Code Organization
- Keep related functionality together in appropriate files and split into new files as responsibilities shift into another entity
- Use the existing file structure:
  - `Game.ts` - Main game loop and coordination
  - `World.ts` - Main world management
  - Stage files (`Dungeon1.ts`, `Lobby.ts`) - Individual stages of the game
  - Entity files (`Player.ts`, `Enemy.ts`, etc.) - Individual game entities
  - Manager files (`InputManager.ts`, `UIManager.ts`, etc.) - System management
- When adding new features, consider if they belong in an existing file or need a new module
- Maintain separation of concerns between rendering, physics, and game logic

### 4. TypeScript Best Practices
- Use explicit types for all function parameters and return values
- Leverage TypeScript's type system for compile-time safety
- Define interfaces for complex data structures
- Use enums for fixed sets of values (e.g., WeaponType)
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