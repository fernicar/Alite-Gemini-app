
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
    
    // Safety queue for bodies to remove after step
    private bodiesToRemove: CANNON.Body[] = [];
    private isStepping: boolean = false;
    
    // Config: Limit movement to the XZ plane (2D gameplay)
    private linearFactor = new CANNON.Vec3(1, 0, 1); 
    private angularFactor = new CANNON.Vec3(0, 1, 0);

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
        if (!spec) return 4; 
        return 9; 
    }

    public initializeShip(ship: Ship) {
        if (this.shipBody) {
            this.removeBody(this.shipBody);
        }

        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === ship.type)?.spec;
        if (!shipSpec) return;

        const radius = this.calculateHitboxRadius(ship.type);
        const shape = new CANNON.Sphere(radius); 
        
        this.shipBody = new CANNON.Body({
            mass: shipSpec.mass,
            shape: shape,
            position: new CANNON.Vec3(ship.position.x, 0, ship.position.z), // Force Y=0
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
            position: new CANNON.Vec3(npc.position.x, 0, npc.position.z), // Force Y=0
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
            this.removeBody(body);
            this.npcBodies.delete(npcId);
        }
    }

    public initializeCelestialBody(celestial: Celestial) {
        const shape = new CANNON.Sphere(celestial.radius);
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(celestial.position.x, 0, celestial.position.z), // Force Y=0
            collisionFilterGroup: COLLISION_GROUPS.OBSTACLE,
            collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.NPC | COLLISION_GROUPS.PROJ_PLAYER | COLLISION_GROUPS.PROJ_NPC,
        });
        (body as any).userData = { type: 'celestial', data: celestial };

        this.world.addBody(body);
        this.npcBodies.set(celestial.id, body);
    }

    // AI Helper: Apply a force to move forward
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

    // AI Helper: Steer body towards a target position using torque
    public steerNpcTowards(npcId: string, targetPos: CANNON.Vec3) {
        const body = this.npcBodies.get(npcId);
        if (!body) return;

        // Calculate vector to target
        const toTarget = targetPos.vsub(body.position);
        toTarget.y = 0; // Ignore vertical difference for steering
        toTarget.normalize();
        
        // Current forward vector (assuming -Z is forward)
        const localForward = new CANNON.Vec3(0, 0, -1);
        const currentForward = body.quaternion.vmult(localForward);
        
        // Calculate rotation needed (cross product axis and angle)
        const rotationAxis = currentForward.cross(toTarget);
        
        // Apply torque proportional to the angle difference
        const STEER_STRENGTH = 150000;
        
        body.applyTorque(rotationAxis.scale(STEER_STRENGTH));
        
        // Stabilization handled by angular factor constraint
    }

    // AI Helper: Apply torque to yaw (rotate around local Y)
    public applyNpcYaw(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if (!body) return;

        const npcData = (body as any).userData.data as NPC;
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === npcData.shipType)?.spec;
        const mass = shipSpec ? shipSpec.mass : 100;
        
        // Torque amount - arbitrary scaling for gameplay
        const torque = mass * 1000 * amount;

        const localUp = new CANNON.Vec3(0, 1, 0);
        const worldUp = body.quaternion.vmult(localUp);
        
        body.applyTorque(worldUp.scale(torque));
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
        let worldForward: CANNON.Vec3;
        
        if (direction) {
             // If manual direction provided (e.g. from mouse aim), use it
             worldForward = new CANNON.Vec3(direction.x, 0, direction.z).unit(); // Flatten direction
        } else {
             worldForward = ownerBody.quaternion.vmult(localForward);
        }

        // Spawn position: tip of the ship. Increase offset to avoid self-collision with larger hitboxes
        const spawnOffset = 18; 
        const spawnPos = ownerBody.position.vadd(worldForward.scale(spawnOffset));
        spawnPos.y = 0; // Force Y=0

        const projectileBody = new CANNON.Body({
            mass: 0.1,
            shape: new CANNON.Sphere(2), 
            position: spawnPos,
            linearDamping: 0,
            linearFactor: this.linearFactor, // Constrain projectile to plane
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
        projectileBody.velocity.y = 0; // Ensure no vertical velocity

        // Projectile rotation to match velocity direction
        const targetQ = new CANNON.Quaternion();
        // Point -Z towards velocity
        const zAxis = new CANNON.Vec3(0,0,-1);
        const velocityDir = projectileBody.velocity.unit();
        const axis = zAxis.cross(velocityDir);
        const angle = Math.acos(zAxis.dot(velocityDir));
        targetQ.setFromAxisAngle(axis, angle);
        projectileBody.quaternion.copy(targetQ);

        const projectileId = `proj-${this.projectileCounter++}`;
        
        // Calc visual angle (mostly for 2D fallback radar)
        const euler = new CANNON.Vec3();
        ownerBody.quaternion.toEuler(euler);
        const visualAngle = euler.y;

        const projectileData: Projectile = {
            id: projectileId,
            ownerId,
            position: { x: spawnPos.x, y: 0, z: spawnPos.z },
            velocity: { x: projectileBody.velocity.x, y: 0, z: projectileBody.velocity.z },
            angle: visualAngle,
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
            // Safely remove body: if stepping, queue it, otherwise remove immediately
            if (this.isStepping) {
                this.bodiesToRemove.push(body);
            } else {
                this.world.removeBody(body);
            }
        }
    }

    public clearAllProjectiles() {
        this.projectiles.forEach(p => {
            this.removeBody(p.body);
        });
        this.projectiles.clear();
    }

    public update(deltaTime: number) {
        this.isStepping = true;
        this.world.step(1 / 60, deltaTime, 10);
        this.isStepping = false;
        
        // Remove queued bodies safely after step
        while (this.bodiesToRemove.length > 0) {
            const body = this.bodiesToRemove.pop();
            if (body) this.world.removeBody(body);
        }

        const projectilesToRemove: string[] = [];
        this.projectiles.forEach((p, id) => {
            p.data.remainingLife -= deltaTime * 1000;
            if (p.data.remainingLife <= 0 || (p.body as any).userData.shouldRemove) {
                projectilesToRemove.push(id);
            } else {
                p.data.position.x = p.body.position.x;
                p.data.position.y = 0; // Keep flat
                p.data.position.z = p.body.position.z;
                
                p.data.velocity.x = p.body.velocity.x;
                p.data.velocity.y = 0;
                p.data.velocity.z = p.body.velocity.z;
                
                // Keep orientation updated for visual if needed
                const euler = new CANNON.Vec3();
                p.body.quaternion.toEuler(euler);
                p.data.angle = euler.y;
            }
        });
    
        projectilesToRemove.forEach(id => {
            const p = this.projectiles.get(id);
            if (p) {
                this.removeBody(p.body);
                this.projectiles.delete(id);
            }
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
