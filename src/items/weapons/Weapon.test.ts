import { describe, it, expect, vi } from 'vitest';

vi.mock('three', () => {
    class V3 {
        x=0;y=0;z=0;
        constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
        copy(v:any){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
        set(x:number,y:number,z:number){this.x=x;this.y=y;this.z=z;return this;}
        clone(){return new V3(this.x,this.y,this.z);}
        add(v:any){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
        sub(v:any){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
        multiplyScalar(s:number){this.x*=s;this.y*=s;this.z*=s;return this;}
        normalize(){return this;}
        length(){return Math.sqrt(this.x**2+this.y**2+this.z**2);}
        applyEuler(){return this;}
        applyQuaternion(){return this;}
        addScaledVector(v:any,s:number){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
    }
    class FakeMesh {
        position=new V3(); quaternion={x:0,y:0,z:0,w:1,copy:vi.fn()};
        geometry={dispose:vi.fn()}; material={dispose:vi.fn()};
        rotation={set:vi.fn(),x:0,y:0,z:0};
        add=vi.fn(); remove=vi.fn(); lookAt=vi.fn();
        traverse=vi.fn(); children=[]; scale={copy:vi.fn(),set:vi.fn()};
        parent=null;
        getWorldPosition=vi.fn((v:any)=>v);
        getWorldQuaternion=vi.fn((q:any)=>q);
    }
    return {
        Mesh:FakeMesh, Group:FakeMesh, Object3D:FakeMesh,
        Vector3:V3, Euler:class{x=0;y=0;z=0;constructor(..._a:any[]){}},
        Quaternion:class{x=0;y=0;z=0;w=1;setFromEuler(){return this;}multiply(){return this;}},
        BoxGeometry:class{dispose=vi.fn();},
        CylinderGeometry:class{dispose=vi.fn();},
        MeshBasicMaterial:class{dispose=vi.fn();color={setHSL:vi.fn()};transparent=false;opacity=1;},
        AnimationMixer:class{update=vi.fn();clipAction=vi.fn(()=>({play:vi.fn(),setLoop:vi.fn(),fadeIn:vi.fn(),fadeOut:vi.fn(),reset:vi.fn(),stop:vi.fn()}));},
        LoopOnce:1, LoopRepeat:2,
        MathUtils:{randFloat:(_a:number,_b:number)=>(_a+_b)/2,randInt:(_a:number,_b:number)=>_a},
    };
});

vi.mock('cannon-es', () => {
    class FV3{
        x=0;y=0;z=0;
        constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
        clone(){return new FV3(this.x,this.y,this.z);}
        copy(v:any){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
        vsub(v:any,out?:any){const r=out||new FV3();r.x=this.x-v.x;r.y=this.y-v.y;r.z=this.z-v.z;return r;}
        normalize(){return this;}
        scale(s:number,out?:any){const r=out||new FV3();r.x=this.x*s;r.y=this.y*s;r.z=this.z*s;return r;}
        vadd(v:any,out?:any){const r=out||new FV3();r.x=this.x+v.x;r.y=this.y+v.y;r.z=this.z+v.z;return r;}
        length(){return Math.sqrt(this.x**2+this.y**2+this.z**2);}
        set(x:number,y:number,z:number){this.x=x;this.y=y;this.z=z;}
    }
    class FQuat{
        x=0;y=0;z=0;w=1;
        set(x:number,y:number,z:number,w:number){this.x=x;this.y=y;this.z=z;this.w=w;}
    }
    class FBody{
        position=new FV3();velocity=new FV3();quaternion=new FQuat();
        type=1;applyForce=vi.fn();applyImpulse=vi.fn();
        addEventListener=vi.fn();removeEventListener=vi.fn();
        collisionFilterGroup=1;collisionFilterMask=0;
        mass=0;
    }
    return {
        Vec3:FV3, Body:FBody,
        World:class{addBody=vi.fn();removeBody=vi.fn();raycastAll=vi.fn();},
        Sphere:class{},Box:class{},Cylinder:class{},
        BODY_TYPES:{DYNAMIC:1,STATIC:2,KINEMATIC:4},
    };
});

vi.mock('../../BaseMesh', () => ({
    BaseMesh:class{
        mesh={
            position:{x:0,y:0,z:0,copy:vi.fn()},
            quaternion:{copy:vi.fn()},
            add:vi.fn(),remove:vi.fn(),
            geometry:{dispose:vi.fn()},material:{dispose:vi.fn()},
            rotation:{set:vi.fn(),x:0,y:0,z:0},
            lookAt:vi.fn(),traverse:vi.fn(),children:[],
            scale:{copy:vi.fn(),set:vi.fn()},parent:null,
            getWorldPosition:vi.fn((v:any)=>v),
            getWorldQuaternion:vi.fn((q:any)=>q),
        };
        body=null;
        disposeMesh=vi.fn();scene:any;world:any;
        update(_dt:number){}
    }
}));

vi.mock('../../AssetManager', () => ({
    AssetManager:{Instance:{getModel:vi.fn(()=>({scene:{clone:vi.fn(()=>({traverse:vi.fn(),children:[]})),animations:[]}})),get:vi.fn(()=>({scene:{clone:vi.fn(()=>({traverse:vi.fn(),children:[]}))},animations:[]}))}}
}));

vi.mock('../WeaponItem', () => ({
    WeaponItem: class {}
}));

import { Weapon } from './Weapon';
import { WeaponType } from './WeaponType';

// ─── Helper ────────────────────────────────────────────────────────────────────

function makeWeapon(overrides: Record<string, any> = {}): any {
    const w = Object.create((Weapon as any).prototype) as any;
    Object.assign(w, {
        isAttacking: false,
        hitboxActive: false,
        pendingRangeMultiplier: 1.0,
        attackDelayTimer: 0.0,
        damage: 10,
        weaponType: WeaponType.SWORD,
        stats: { attackSpeed: 0.3, range: 2.0, attackAngle: Math.PI / 2 },
        body: null,
        physicsWorld: { addBody: vi.fn(), removeBody: vi.fn() },
        parentBone: undefined,
        mesh: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn(), set: vi.fn() },
            quaternion: { copy: vi.fn() },
            add: vi.fn(), remove: vi.fn(),
            children: [], traverse: vi.fn(),
            scale: { copy: vi.fn(), set: vi.fn() },
            rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
            parent: null,
            getWorldPosition: vi.fn((v: any) => v),
            getWorldQuaternion: vi.fn((q: any) => q),
        },
        scene: { add: vi.fn(), remove: vi.fn() },
        disposeMesh: vi.fn(),
        assetManager: { get: vi.fn(() => ({ scene: { clone: vi.fn(() => ({ traverse: vi.fn(), children: [] })) } })) },
    }, overrides);
    return w;
}

// ─── attack() ─────────────────────────────────────────────────────────────────

describe('Weapon – attack()', () => {
    it('sets isAttacking to true', () => {
        const w = makeWeapon();
        w.attack();
        expect(w.isAttacking).toBe(true);
    });

    it('returns true on successful attack', () => {
        const w = makeWeapon();
        expect(w.attack()).toBe(true);
    });

    it('returns false when already attacking', () => {
        const w = makeWeapon({ isAttacking: true });
        expect(w.attack()).toBe(false);
    });

    it('stores pendingRangeMultiplier', () => {
        const w = makeWeapon();
        w.attack(2.5);
        expect(w.pendingRangeMultiplier).toBe(2.5);
    });

    it('resets attackDelayTimer to 0', () => {
        const w = makeWeapon({ attackDelayTimer: 9.9 });
        w.attack();
        expect(w.attackDelayTimer).toBe(0);
    });

    it('resets hitboxActive to false', () => {
        const w = makeWeapon({ hitboxActive: true });
        w.attack();
        expect(w.hitboxActive).toBe(false);
    });

    it('uses 1.0 as default rangeMultiplier', () => {
        const w = makeWeapon();
        w.attack();
        expect(w.pendingRangeMultiplier).toBe(1.0);
    });
});

// ─── stopAttack() ─────────────────────────────────────────────────────────────

describe('Weapon – stopAttack()', () => {
    it('sets isAttacking to false', () => {
        const w = makeWeapon({ isAttacking: true });
        w.stopAttack();
        expect(w.isAttacking).toBe(false);
    });

    it('sets hitboxActive to false', () => {
        const w = makeWeapon({ isAttacking: true, hitboxActive: true });
        w.stopAttack();
        expect(w.hitboxActive).toBe(false);
    });

    it('removes body from physicsWorld when body exists', () => {
        const fakeBody = { collisionFilterGroup: 1 };
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({ isAttacking: true, body: fakeBody, physicsWorld: world });
        w.stopAttack();
        expect(world.removeBody).toHaveBeenCalledWith(fakeBody);
    });

    it('does not call removeBody when body is null', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({ isAttacking: true, body: null, physicsWorld: world });
        w.stopAttack();
        expect(world.removeBody).not.toHaveBeenCalled();
    });

    it('does nothing when not attacking', () => {
        const w = makeWeapon({ isAttacking: false, hitboxActive: false });
        w.stopAttack(); // should not throw
        expect(w.isAttacking).toBe(false);
        expect(w.hitboxActive).toBe(false);
    });
});

// ─── update(dt) ───────────────────────────────────────────────────────────────

describe('Weapon – update(dt)', () => {
    it('does not advance attackDelayTimer when not attacking', () => {
        const w = makeWeapon({ isAttacking: false, attackDelayTimer: 0 });
        w.update(0.1);
        expect(w.attackDelayTimer).toBe(0);
    });

    it('advances attackDelayTimer when attacking and hitbox not yet active', () => {
        const w = makeWeapon({ isAttacking: true, hitboxActive: false, attackDelayTimer: 0 });
        w.update(0.05);
        expect(w.attackDelayTimer).toBeCloseTo(0.05, 5);
    });

    it('activates hitbox when attackDelayTimer reaches the SWORD delay (0.12s)', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: false,
            attackDelayTimer: 0.0,
            weaponType: WeaponType.SWORD,
            physicsWorld: world,
        });
        w.update(0.12);
        expect(w.hitboxActive).toBe(true);
        expect(world.addBody).toHaveBeenCalled();
    });

    it('does not activate hitbox before the delay elapses', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: false,
            attackDelayTimer: 0.0,
            weaponType: WeaponType.SWORD,
            physicsWorld: world,
        });
        w.update(0.05); // 0.05 < 0.12 delay
        expect(w.hitboxActive).toBe(false);
        expect(world.addBody).not.toHaveBeenCalled();
    });

    it('sets body on weapon after hitbox is activated', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: false,
            attackDelayTimer: 0.0,
            weaponType: WeaponType.SWORD,
            physicsWorld: world,
        });
        w.update(0.12);
        expect(w.body).not.toBeNull();
    });

    it('respects per-weapon HAMMER delay (0.3s) — not active at 0.12s', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: false,
            attackDelayTimer: 0.0,
            weaponType: WeaponType.HAMMER,
            physicsWorld: world,
        });
        w.update(0.12);
        expect(w.hitboxActive).toBe(false);
    });

    it('does not re-advance timer once hitbox is active', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: true,
            attackDelayTimer: 0.12,
            weaponType: WeaponType.SWORD,
            physicsWorld: world,
        });
        w.update(0.1);
        // Timer should NOT advance further when hitboxActive is already true
        expect(w.attackDelayTimer).toBeCloseTo(0.12, 5);
    });

    it('removes existing body before creating new hitbox (no double-add)', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const existingBody = {};
        const w = makeWeapon({
            isAttacking: true,
            hitboxActive: false,
            attackDelayTimer: 0.0,
            weaponType: WeaponType.SWORD,
            physicsWorld: world,
            body: existingBody,
        });
        w.update(0.12);
        expect(world.removeBody).toHaveBeenCalledWith(existingBody);
    });
});

// ─── changeWeaponType() ───────────────────────────────────────────────────────

describe('Weapon – changeWeaponType()', () => {
    it('updates weaponType', () => {
        const w = makeWeapon({ weaponType: WeaponType.SWORD });
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.LANCE, 50);
        expect(w.weaponType).toBe(WeaponType.LANCE);
    });

    it('updates damage', () => {
        const w = makeWeapon({ damage: 10 });
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.HAMMER, 99);
        expect(w.damage).toBe(99);
    });

    it('updates stats to match new weapon type', () => {
        const w = makeWeapon({ weaponType: WeaponType.SWORD });
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.LANCE, 50);
        // LANCE attackSpeed is 0.5
        expect(w.stats.attackSpeed).toBe(0.5);
        expect(w.stats.range).toBe(3.0);
    });

    it('calls disposeMesh', () => {
        const w = makeWeapon();
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.DUAL_BLADE, 20);
        expect(w.disposeMesh).toHaveBeenCalled();
    });

    it('adds new mesh to parent', () => {
        const w = makeWeapon();
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.DUAL_BLADE, 20);
        expect(parent.add).toHaveBeenCalled();
    });

    it('removes existing attack body when one exists', () => {
        const world = { addBody: vi.fn(), removeBody: vi.fn() };
        const fakeBody = {};
        const w = makeWeapon({ body: fakeBody, physicsWorld: world });
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.LANCE, 30);
        expect(world.removeBody).toHaveBeenCalledWith(fakeBody);
    });

    it('removes old mesh from parentBone when parentBone is set', () => {
        const parentBone = { remove: vi.fn() };
        const w = makeWeapon({ parentBone });
        const parent = { add: vi.fn(), remove: vi.fn() };
        w.changeWeaponType(parent, WeaponType.SWORD, 15);
        expect(parentBone.remove).toHaveBeenCalled();
    });
});
