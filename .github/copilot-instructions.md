# GitHub Copilot Instructions for Hackworld

## Commit Message Standards
Enforces **Conventional Commits**: `type: description` (imperative mood).

**Types:** `feat` (minor), `fix` (patch), `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

- ✅ `feat: add inventory sorting feature` &nbsp; ❌ `Initial plan` ❌ `added new feature`

**Breaking changes (`!`):** Use **ONLY** when the `SaveData` structure in `SaveManager.ts` becomes incompatible (fields added, removed, or changed). Never for gameplay, UI, or mechanics changes.
```
feat!: add player skill tree to save data
```
Enforcement: Husky commit-msg hook (local) + CI checks + automated semantic versioning.

## Core Principles

### 1. Maintainability
- Clean, readable, self-documenting code with single-responsibility functions
- Named constants (no magic numbers), descriptive names, consistent patterns
- Comment the "why" not the "what"; keep comments current without describing past changes

### 2. Entity-Based Architecture
Each entity (Player, Enemy, Weapon, etc.) is a separate class managing its own mesh, physics body, state, update logic, and cleanup. Never put entity logic in `Game.ts`.

Entities use composition over inheritance and communicate through interfaces, not internal state access.

```typescript
export class NewEntity extends BaseMesh {
    body: CANNON.Body;
    private someState: number;

    constructor(scene: THREE.Scene, world: CANNON.World, params: any) { /* init mesh, body, state */ }
    update(deltaTime: number): void { /* logic + sync mesh to body */ }
    cleanup(): void { this.disposeMesh(); world.removeBody(this.body); }
}
```

### 3. Code Organization
- `Game.ts` — game loop; `World.ts` — world management; stage files — stages; entity files — entities; manager files — systems
- Split files when responsibilities shift; maintain separation between rendering, physics, and logic

### 4. TypeScript
- Explicit types on all parameters and return values; interfaces for complex data; classes over plain objects/functions; enums over string literal unions; avoid `any`

### 5. Documentation
- JSDoc for public methods/classes; inline comments for non-obvious logic
- **Always update README.md** when changing high-level game behavior, controls, setup, build commands, dependencies, or architecture

### 6. Performance
- Minimize per-frame work; dispose geometries/materials and remove physics bodies when entities are destroyed; object-pool frequently created/destroyed entities

### 7. Dependencies
- Add only when necessary; prefer existing; document the reason; consider bundle size

### 8. Testing & Quality
- Manual test after changes: physics, rendering, no console errors

## Common Patterns

### Physics/Rendering Sync
```typescript
// Type casting required for CANNON.Vec3/Quaternion → THREE compatibility
this.mesh.position.copy(this.body.position as any);
this.mesh.quaternion.copy(this.body.quaternion as any);
```

### Resource Cleanup
```typescript
scene.remove(this.mesh);
world.removeBody(this.body);
this.mesh.geometry?.dispose();
(this.mesh.material as THREE.Material)?.dispose();
```

### Save System (`SaveManager.ts` + `SaveManagerUI.ts`)
When adding new player stats or inventory items, update all three:

1. **`SaveData` interface** — add typed fields
2. **`save()` method** — serialize new data (use `kind` discriminant for inventory items)
3. **`load()` method** — restore from saved data (create fresh instances via registries; call `player.recalculateStats()` after load)

Items are identified by name/type/level (not UUID). Weapons: `WeaponRepository.getWeaponByTypeAndLevel()`. Cores/Chips: look up by name in their registry.

**Save compatibility:** Major version changes only from `SaveData` structure changes. Use `feat!` commit; `semantic-release` bumps major version and the in-game check warns players.

## Unit Testing

**Always** add/update tests when changing game logic. Update failing tests — don't delete them.

- Files: `src/Foo.ts` → `src/Foo.test.ts`; framework: `vitest`
- Commands: `npm test` / `npm run test:coverage`

**Bypassing constructors** for 3D classes (no Three.js/Cannon-es in Node):
```ts
function makePlayer(overrides = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, { /* minimal fields */ });
    (player as any).syncPosition = vi.fn();
    return Object.assign(player, overrides);
}
```

**Test quality rules:**
- Never make private members public just for testing — use public APIs
- Use concrete expected values: ✅ `toBeCloseTo(0.02053, 4)` ❌ `toBeGreaterThan(0)`
- Use equivalence classes (boundary, typical, edge) — avoid redundant cases
- Combine related assertions in one `it()` block
- Do NOT test private methods or implementation details; test public behavior only
- Do NOT use any to get around proper test setup

## What to Avoid
- ❌ Monolithic classes; entity logic in `Game.ts`/`World.ts`; tightly coupled components
- ❌ TypeScript errors; `any` type; magic numbers; excessive `console.log`
- ❌ Forgetting to dispose resources, update README, or consider all control schemes
- ❌ Breaking-change commits for anything other than `SaveData` structure changes

## Control Schemes
All three schemes must be implemented for any new input feature. Update `InputManager.ts` (keyboard/gamepad), `MobileControlsManager.ts` (touch), and README.md.

| Action | Keyboard | Gamepad | Mobile |
|---|---|---|---|
| Move | WASD / Arrows | Left Stick | Virtual joystick (bottom-left) |
| Jump / Interact | Space / Enter | A (btn 0) | A button (bottom-right) |
| Attack | K | X (btn 2) | X button (bottom-right) |
| Cancel | Escape | B (btn 1) | B button (bottom-right) |
| Skill modifier | Q | L1 (btn 4) | Skills toggle (top-left) |
| Inventory | I | Select (btn 8) | Inventory button (top-right) |
| Navigate | WASD / Arrows | D-Pad | Virtual joystick (bottom-left) |

Mobile skill mode (toggled by Skills button): A=Laser, B=Heal, X=Area. Reverts to normal after use.