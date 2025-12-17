# GitHub Copilot Instructions for Hackworld

## Core Principles

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
- Keep related functionality together in appropriate files
- Use the existing file structure:
  - `Game.ts` - Main game loop and coordination
  - `World.ts` - Scene/world management
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
- Keep comments up-to-date when code changes

#### README Updates
**CRITICAL**: Always update the README.md when making changes that affect:
- New features or gameplay mechanics
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
- ❌ Don't forget to update README.md when adding features
- ❌ Don't create tightly coupled components
- ❌ Don't ignore TypeScript type errors
- ❌ Don't leave excessive debug logging (use console.log sparingly for important events only)
- ❌ Don't forget to dispose of resources (geometries, materials, bodies)
