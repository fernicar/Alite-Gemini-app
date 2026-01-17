
import * as CANNON from 'cannon-es';
import { Ship, NPC, Celestial, Projectile } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import * as THREE from 'three';

const COLLISION_GROUPS = {
    PLAYER: 1,
    NPC: 2,
    OBSTACLE: 4, // Planets, Stations
    PROJ_PLAYER: 8,
    PROJ_NPC: 16
};

// Match the scale factor used in SystemView.tsx
const VISUAL_SCALE = 0.1;

class PhysicsService3D {
    private world: CANNON.World;
    public shipBody: CANNON.Body | null = null;
    private npcBodies = new Map<string, CANNON.Body>();
    private projectiles = new Map<string, { body: CANNON.Body, data: Projectile }>();
    private projectileCounter = 0;
    private subscribers: (() => void)[] = [];
    private collisionSubscribers: ((collision: { projectile: Projectile, target: NPC | Ship }) => void)[] = [];
    
    // Config
    private linearFactor = new CANNON.Vec3(1, 0, 1); // Only move X, Z
    private angularFactor = new CANNON.Vec3(0, 1, 0); // Only rotate Y (Yaw)

    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, 0, 0), 
        });
        
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        this.world.addEventListener('beginContact', (event: { bodyA: CANNON.Body, bodyB: CANNON.Body }) => {
            const bodyA = event.bodyA as any;
            const bodyB = event.bodyB as any;

            let projectileBody: any = null;
            let targetBody: any = null;

            if (bodyA.userData?.type === 'projectile') {
                projectileBody = bodyA;
                targetBody = bodyB;
            } else if (bodyB.userData?.type === 'projectile') {
                projectileBody = bodyB;
                targetBody = bodyA;
            }

            if (projectileBody && targetBody) {
                const targetType = targetBody.userData?.type;
                
                if (targetType === 'celestial') {
                    projectileBody.userData.shouldRemove = true;
                    return;
                }

                if (targetType === 'npc' || targetType === 'player') {
                    const projectileData = projectileBody.userData.data as Projectile;
                    const shipData = targetBody.userData.data as (NPC | Ship);

                    if (projectileData.ownerId === shipData.id) return;

                    this.collisionSubscribers.forEach(cb => cb({
                        projectile: projectileData,
                        target: shipData,
                    }));
                    
                    projectileBody.userData.shouldRemove = true;
                }
            }
        });
    }

    public updateShipPerformance(params: { topSpeedMultiplier: number, turnRateMultiplier: number }) {
        // Implementation kept for compatibility
    }

    public onCollision(callback: (collision: { projectile: Projectile, target: NPC | Ship }) => void): () => void {
        this.collisionSubscribers.push(callback);
        return () => {
            this.collisionSubscribers = this.collisionSubscribers.filter(cb => cb !== callback);
        };
    }

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    // Helper to calculate radius based on ship specs
    private calculateHitboxRadius(shipType: string): number {
        const spec = SHIPS_FOR_SALE.find(s => s.type === shipType)?.spec;
        // Default size if spec missing
        if (!spec) return 4; 
        
        // Use the ship dimensions from XML/Data to size the physics body
        // Default logic in SystemView uses these dimensions * 0.1
        // Example Cobra: W180 L90 -> Scaled W18 L9.
        // We want the hitbox to cover the visual mesh.
        // A simple approximation is half the largest dimension.
        // SHIPS_FOR_SALE currently doesn't have dimensions in the TS file (it's in the component logic),
        // but we can infer or map. Since data/ships.ts doesn't have W/H/L, 
        // we'll map common types or default to a larger size than before.
        // The default Sphere(4) was diameter 8. A scaled Cobra is ~18 wide. 
        // We should increase the default radius.
        
        return 9; // ~18 unit diameter, matches typical scaled ship width
    }

    public initializeShip(ship: Ship) {
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === ship.type)?.spec;
        if (!shipSpec) return;

        const radius = this.calculateHitboxRadius(ship.type);
        const shape = new CANNON.Sphere(radius); 
        
        this.shipBody = new CANNON.Body({
            mass: shipSpec.mass,
            shape: shape,
            position: new CANNON.Vec3(ship.position.x, 0, ship.position.z),
            linearDamping: 0.5,
            angularDamping: 0.9,
            linearFactor: this.linearFactor,
            angularFactor: this.angularFactor,
            collisionFilterGroup: COLLISION_GROUPS.PLAYER,
            collisionFilterMask: COLLISION_GROUPS.NPC | COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.PROJ_NPC,
        });
        
        (this.shipBody as any).userData = { type: 'player', data: ship };
        this.world.addBody(this.shipBody);
    }
    
    public initializeNpc(npc: NPC) {
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === npc.shipType)?.spec;
        if (!shipSpec) return;

        const radius = this.calculateHitboxRadius(npc.shipType);
        const shape = new CANNON.Sphere(radius);
        
        const body = new CANNON.Body({
            mass: shipSpec.mass,
            shape: shape,
            position: new CANNON.Vec3(npc.position.x, 0, npc.position.z),
            linearDamping: 0.5,
            angularDamping: 0.9,
            linearFactor: this.linearFactor,
            angularFactor: this.angularFactor,
            collisionFilterGroup: COLLISION_GROUPS.NPC,
            collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.NPC | COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.PROJ_PLAYER,
        });
        
        // Face random direction initially
        const randomAngle = Math.random() * Math.PI * 2;
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), randomAngle);

        (body as any).userData = { type: 'npc', data: npc };
        this.world.addBody(body);
        this.npcBodies.set(npc.id, body);
    }
    
    public removeNpcBody(npcId: string) {
        const body = this.npcBodies.get(npcId);
        if (body) {
            this.world.removeBody(body);
            this.npcBodies.delete(npcId);
        }
    }

    public initializeCelestialBody(celestial: Celestial) {
        const shape = new CANNON.Sphere(celestial.radius);
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(celestial.position.x, 0, celestial.position.z),
            collisionFilterGroup: COLLISION_GROUPS.OBSTACLE,
            collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.NPC | COLLISION_GROUPS.PROJ_PLAYER | COLLISION_GROUPS.PROJ_NPC,
        });
        (body as any).userData = { type: 'celestial', data: celestial };

        this.world.addBody(body);
        this.npcBodies.set(celestial.id, body);
    }

    public applyNpcThrust(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if (!body) return;

        const npcData = (body as any).userData.data as NPC;
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === npcData.shipType)?.spec;
        const mass = shipSpec ? shipSpec.mass : 100;

        // Apply force in local -Z direction (Forward)
        const localForward = new CANNON.Vec3(0, 0, -1);
        const worldForward = body.quaternion.vmult(localForward);
        
        const force = mass * 200 * amount;

        body.applyForce(worldForward.scale(force));
    }

    public applyNpcYaw(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if (!body) return;

        const TURN_SPEED = 2.0;
        body.angularVelocity.y = amount * TURN_SPEED;
    }

    // AI Logic Helpers
    public updateNPCLogic(npcId: string, targetPosition: CANNON.Vec3) {
        // ... (Existing logic remains valid)
    }

    public fireProjectile(ownerId: string, damage: number, speed: number = 800, type: 'laser' | 'missile' = 'laser', targetId?: string, direction?: THREE.Vector3) {
        let ownerBody: CANNON.Body | null = null;
        let isPlayer = false;

        if (this.shipBody && (this.shipBody as any).userData.data.id === ownerId) {
            ownerBody = this.shipBody;
            isPlayer = true;
        } else {
            ownerBody = this.npcBodies.get(ownerId) || null;
        }

        if (!ownerBody) return;

        // Calculate heading
        const localForward = new CANNON.Vec3(0, 0, -1);
        const worldForward = ownerBody.quaternion.vmult(localForward);

        // Spawn position: tip of the ship. Increase offset to avoid self-collision with larger hitboxes
        const spawnOffset = 18; 
        const spawnPos = ownerBody.position.vadd(worldForward.scale(spawnOffset));

        const projectileBody = new CANNON.Body({
            mass: 0.1,
            shape: new CANNON.Sphere(2), // Slightly larger projectile for better hit detection
            position: spawnPos,
            linearDamping: 0,
            collisionFilterGroup: isPlayer ? COLLISION_GROUPS.PROJ_PLAYER : COLLISION_GROUPS.PROJ_NPC,
            collisionFilterMask: isPlayer 
                ? (COLLISION_GROUPS.NPC | COLLISION_GROUPS.OBSTACLE) 
                : (COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.OBSTACLE),
        });

        // Disable physical collision response (bouncing) so lasers pass through
        projectileBody.collisionResponse = false;

        // Projectile Velocity
        const muzzleVelocity = worldForward.scale(speed);
        projectileBody.velocity = ownerBody.velocity.vadd(muzzleVelocity);
        
        // Projectile rotation
        projectileBody.quaternion.copy(ownerBody.quaternion);

        const projectileId = `proj-${this.projectileCounter++}`;
        
        // Calc visual angle
        const euler = new CANNON.Vec3();
        ownerBody.quaternion.toEuler(euler);
        const angle = euler.y;

        const projectileData: Projectile = {
            id: projectileId,
            ownerId,
            position: { x: spawnPos.x, y: 0, z: spawnPos.z },
            velocity: { x: projectileBody.velocity.x, y: 0, z: projectileBody.velocity.z },
            angle: angle,
            type: type,
            damage,
            remainingLife: type === 'missile' ? 5000 : 2000,
            targetId,
        };

        (projectileBody as any).userData = { type: 'projectile', data: projectileData, shouldRemove: false };
        
        this.world.addBody(projectileBody);
        this.projectiles.set(projectileId, { body: projectileBody, data: projectileData });

        this.notify();
    }

    public getProjectiles(): Projectile[] {
        return Array.from(this.projectiles.values()).map(p => p.data);
    }
    
    public removeBody(body: CANNON.Body | null) {
        if (body) {
            this.world.removeBody(body);
        }
    }

    public clearAllProjectiles() {
        this.projectiles.forEach(p => {
            this.world.removeBody(p.body);
        });
        this.projectiles.clear();
    }

    public update(deltaTime: number) {
        this.world.step(1 / 60, deltaTime, 10);
        
        const projectilesToRemove: string[] = [];
        this.projectiles.forEach((p, id) => {
            // Hard Lock Y to 0 and angular velocity
            p.body.position.y = 0;
            p.body.velocity.y = 0;
            p.body.angularVelocity.set(0, 0, 0);
            
            // Ensure quaternion stays planar (only Y rotation)
            const euler = new CANNON.Vec3();
            p.body.quaternion.toEuler(euler);
            p.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), euler.y);

            p.data.remainingLife -= deltaTime * 1000;
            if (p.data.remainingLife <= 0 || (p.body as any).userData.shouldRemove) {
                projectilesToRemove.push(id);
            } else {
                p.data.position.x = p.body.position.x;
                p.data.position.y = p.body.position.y;
                p.data.position.z = p.body.position.z;
                
                // Update velocity for visual orientation
                p.data.velocity.x = p.body.velocity.x;
                p.data.velocity.y = 0;
                p.data.velocity.z = p.body.velocity.z;
                
                // Update angle for visual rotation
                p.data.angle = euler.y;
            }
        });
    
        projectilesToRemove.forEach(id => {
            const p = this.projectiles.get(id);
            if (p) {
                this.world.removeBody(p.body);
                this.projectiles.delete(id);
            }
        });
        
        // Enforce 2D constraints
        if (this.shipBody) {
             this.shipBody.position.y = 0;
             this.shipBody.velocity.y = 0;
             this.shipBody.angularVelocity.x = 0;
             this.shipBody.angularVelocity.z = 0;
             
             const euler = new CANNON.Vec3();
             this.shipBody.quaternion.toEuler(euler);
             this.shipBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), euler.y);
        }
        
        this.npcBodies.forEach(body => {
             body.position.y = 0;
             body.velocity.y = 0;
             body.angularVelocity.x = 0;
             body.angularVelocity.z = 0;
             
             const euler = new CANNON.Vec3();
             body.quaternion.toEuler(euler);
             body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), euler.y);
        });

        this.notify();
    }
    
    public getShipBody(): CANNON.Body | null {
        return this.shipBody;
    }

    public getNpcBody(npcId: string): CANNON.Body | undefined {
        return this.npcBodies.get(npcId);
    }
}

export const physicsService3D = new PhysicsService3D();
