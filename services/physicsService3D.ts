import * as CANNON from 'cannon-es';
import { Ship, NPC, Celestial, Projectile } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';

const COLLISION_GROUPS = {
    SHIP: 1,
    PROJECTILE: 2
};


class PhysicsService3D {
    private world: CANNON.World;
    public shipBody: CANNON.Body | null = null;
    private npcBodies = new Map<string, CANNON.Body>();
    private projectiles = new Map<string, { body: CANNON.Body, data: Projectile }>();
    private projectileCounter = 0;
    private subscribers: (() => void)[] = [];
    private collisionSubscribers: ((collision: { projectile: Projectile, target: NPC | Ship }) => void)[] = [];
    private flightAssist = true;
    private assistedThrust = 0;
    private assistedStrafe = { x: 0, y: 0 };
    private shipPerformance = {
        topSpeedMultiplier: 1.0,
        turnRateMultiplier: 1.0,
    };


    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, 0, 0), // No gravity in space
        });
        
        this.world.addEventListener('beginContact', (event: { bodyA: CANNON.Body, bodyB: CANNON.Body }) => {
            const bodyA = event.bodyA as any;
            const bodyB = event.bodyB as any;

            const projectileBody = (bodyA.userData?.type === 'projectile') ? bodyA : (bodyB.userData?.type === 'projectile') ? bodyB : null;
            const shipBodyHit = (bodyA.userData?.type === 'npc' || bodyA.userData?.type === 'player' || bodyA.userData?.type === 'celestial') ? bodyA : (bodyB.userData?.type === 'npc' || bodyB.userData?.type === 'player' || bodyB.userData?.type === 'celestial') ? bodyB : null;

            if (projectileBody && shipBodyHit && shipBodyHit.userData?.type !== 'celestial') {
                const projectileData = projectileBody.userData.data as Projectile;
                const shipData = shipBodyHit.userData.data as (NPC | Ship);

                if (projectileData.ownerId === shipData.id) return;

                this.collisionSubscribers.forEach(cb => cb({
                    projectile: projectileData,
                    target: shipData,
                }));
                
                if (projectileBody.userData) {
                    projectileBody.userData.shouldRemove = true;
                }
            }
        });
    }
    
    public updateShipPerformance(params: { topSpeedMultiplier: number, turnRateMultiplier: number }) {
        this.shipPerformance = params;
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

    public initializeShip(ship: Ship) {
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === ship.type)?.spec;
        if (!shipSpec) return;

        const shape = new CANNON.Box(new CANNON.Vec3(5, 2, 12.5)); // Box shape: half-extents
        this.shipBody = new CANNON.Body({
            mass: shipSpec.mass,
            shape: shape,
            position: new CANNON.Vec3(ship.position.x, ship.position.y, ship.position.z),
            angularDamping: 0.5,
            linearDamping: 0.1,
            collisionFilterGroup: COLLISION_GROUPS.SHIP,
            collisionFilterMask: -1, // Collide with everything
        });
        (this.shipBody as any).userData = { type: 'player', data: ship };

        this.world.addBody(this.shipBody);
    }
    
    public initializeNpc(npc: NPC) {
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === npc.shipType)?.spec;
        if (!shipSpec) return;

        const shape = new CANNON.Cylinder(0.1, 4, 16, 8);
        const body = new CANNON.Body({
            mass: shipSpec.mass,
            shape: shape,
            position: new CANNON.Vec3(npc.position.x, npc.position.y, npc.position.z),
            angularDamping: 0.5,
            linearDamping: 0.1,
            collisionFilterGroup: COLLISION_GROUPS.SHIP,
            collisionFilterMask: -1, // Collide with everything
        });
        
        (body as any).userData = { type: 'npc', data: npc };
        
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);

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
        let shape: CANNON.Shape;
        if (celestial.type === 'Star' || celestial.type === 'Planet') {
            shape = new CANNON.Sphere(celestial.radius);
        } else {
            shape = new CANNON.Box(new CANNON.Vec3(celestial.radius, celestial.radius, celestial.radius));
        }

        const body = new CANNON.Body({
            mass: 0, // Static body
            shape: shape,
            position: new CANNON.Vec3(celestial.position.x, celestial.position.y, celestial.position.z),
            collisionFilterGroup: COLLISION_GROUPS.SHIP, // Treat as a large "ship" for collisions
            collisionFilterMask: -1,
        });
        (body as any).userData = { type: 'celestial', data: celestial };


        this.world.addBody(body);
        this.npcBodies.set(celestial.id, body); // Store with NPCs for simplicity
    }


    public applyThrust(amount: number) { // +1 for forward, -0.5 for reverse
        if (!this.shipBody) return;
        const thrustForce = 250000;
        const reverseThrustForce = 125000;
        
        const forceValue = amount > 0 ? amount * thrustForce : amount * reverseThrustForce;
        const localForce = new CANNON.Vec3(0, 0, -forceValue);
        const worldForce = this.shipBody.quaternion.vmult(localForce);
        this.shipBody.applyForce(worldForce, this.shipBody.position);
    }
    
    public applyStrafe(strafe: { x: number; y: number }) {
        if (!this.shipBody) return;
        const strafeForce = 150000;
        const localForce = new CANNON.Vec3(strafe.x * strafeForce, strafe.y * strafeForce, 0);
        const worldForce = this.shipBody.quaternion.vmult(localForce);
        this.shipBody.applyForce(worldForce, this.shipBody.position);
    }
    
    public applyYaw(amount: number) {
        if (!this.shipBody) return;
        const turnTorque = 250000 * this.shipPerformance.turnRateMultiplier; 
        const localTorque = new CANNON.Vec3(0, amount * turnTorque, 0); 
        const worldTorque = this.shipBody.quaternion.vmult(localTorque);
        this.shipBody.applyTorque(worldTorque);
    }
    
    public applyPitch(amount: number) {
        if (!this.shipBody) return;
        const turnTorque = 250000 * this.shipPerformance.turnRateMultiplier;
        const localTorque = new CANNON.Vec3(amount * turnTorque, 0, 0); 
        const worldTorque = this.shipBody.quaternion.vmult(localTorque);
        this.shipBody.applyTorque(worldTorque);
    }
    
    public applyRoll(amount: number) {
        if (!this.shipBody) return;
        const turnTorque = 100000 * this.shipPerformance.turnRateMultiplier;
        const localTorque = new CANNON.Vec3(0, 0, amount * turnTorque);
        const worldTorque = this.shipBody.quaternion.vmult(localTorque);
        this.shipBody.applyTorque(worldTorque);
    }

    public setFlightAssist(enabled: boolean) {
        this.flightAssist = enabled;
    }

    public setAssistedThrust(thrust: number) {
        this.assistedThrust = thrust;
    }

    public setAssistedStrafe(strafe: { x: number, y: number }) {
        this.assistedStrafe = strafe;
    }

    private updateFlightAssistOn(deltaTime: number) {
        if (!this.shipBody) return;
        const body = this.shipBody;
    
        const shipData = (body as any).userData.data as Ship;
        const shipSpec = SHIPS_FOR_SALE.find(sfs => sfs.type === shipData.type)?.spec;
        if (!shipSpec) return;
    
        // 1. Handle Translation
        const maxSpeed = shipSpec.speed * this.shipPerformance.topSpeedMultiplier;
        const acceleration = 200; 
        const currentSpeed = body.velocity.length();
    
        let targetSpeed = currentSpeed + (this.assistedThrust * acceleration * deltaTime);
        if (this.assistedThrust === 0) {
            targetSpeed *= (1 - deltaTime * 1.5);
        }
        targetSpeed = Math.max(this.assistedThrust < 0 ? -maxSpeed * 0.5 : 0, Math.min(targetSpeed, maxSpeed));
    
        const forwardVec = body.quaternion.vmult(new CANNON.Vec3(0, 0, -1));
        const rightVec = body.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
        const upVec = body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    
        let targetVelocity = forwardVec.scale(targetSpeed);
        
        const strafeSpeed = maxSpeed * 0.5;
        const strafeVelocity = rightVec.scale(this.assistedStrafe.x * strafeSpeed)
                                    .vadd(upVec.scale(this.assistedStrafe.y * strafeSpeed));
    
        targetVelocity.vadd(strafeVelocity, targetVelocity);
    
        const lerpFactor = 1 - Math.pow(0.01, deltaTime);
        body.velocity.lerp(targetVelocity, lerpFactor, body.velocity);
    
        // 2. Handle Rotation Dampening
        const hasRotationalInput = body.torque.lengthSquared() > 0.001;
        if (!hasRotationalInput) {
            const dampeningFactor = 1 - Math.pow(0.001, deltaTime);
            body.angularVelocity.scale(1 - dampeningFactor, body.angularVelocity);
        }
    }

    public applyNpcThrust(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if(!body) return;
        const thrustForce = 100000; // NPCs are a bit weaker
        const localForce = new CANNON.Vec3(0, 0, -amount * thrustForce);
        const worldForce = body.quaternion.vmult(localForce);
        body.applyForce(worldForce, body.position);
    }
    
    public applyNpcYaw(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if(!body) return;
        const turnTorque = 50000;
        const localTorque = new CANNON.Vec3(0, amount * turnTorque, 0);
        const worldTorque = body.quaternion.vmult(localTorque);
        body.applyTorque(worldTorque);
    }

    public fireProjectile(ownerId: string, damage: number, speed: number = 800) {
        let ownerBody: CANNON.Body | null = null;
        if (this.shipBody && (this.shipBody as any).userData.data.id === ownerId) {
            ownerBody = this.shipBody;
        } else {
            ownerBody = this.npcBodies.get(ownerId) || null;
        }

        if (!ownerBody) {
            console.warn(`Could not find body for ownerId: ${ownerId}`);
            return;
        }

        const projectileShape = new CANNON.Sphere(0.5);
        const projectileBody = new CANNON.Body({
            mass: 0.1,
            shape: projectileShape,
            linearDamping: 0,
            collisionFilterGroup: COLLISION_GROUPS.PROJECTILE,
            collisionFilterMask: COLLISION_GROUPS.SHIP,
        });

        const startPositionOffset = new CANNON.Vec3(0, 0, -15); // In front of ship
        const worldStartPosition = ownerBody.quaternion.vmult(startPositionOffset);
        projectileBody.position.copy(ownerBody.position).vadd(worldStartPosition, projectileBody.position);
        
        const velocityVector = new CANNON.Vec3(0, 0, -speed);
        const worldVelocity = ownerBody.quaternion.vmult(velocityVector);
        projectileBody.velocity.copy(ownerBody.velocity).vadd(worldVelocity, projectileBody.velocity);
        
        const projectileId = `proj-${this.projectileCounter++}`;

        const projectileData: Projectile = {
            id: projectileId,
            ownerId,
            position: { x: projectileBody.position.x, y: projectileBody.position.y, z: projectileBody.position.z },
            velocity: { x: projectileBody.velocity.x, y: projectileBody.velocity.y, z: projectileBody.velocity.z },
            angle: 0, // Not used in 3D
            type: 'laser',
            damage,
            remainingLife: 3000, // 3 seconds
        };

        (projectileBody as any).userData = { type: 'projectile', data: projectileData, shouldRemove: false };
        
        this.world.addBody(projectileBody);
        this.projectiles.set(projectileId, { body: projectileBody, data: projectileData });
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
        if (this.shipBody && this.flightAssist) {
            this.updateFlightAssistOn(deltaTime);
        }
        this.world.step(1 / 60, deltaTime, 3);
        
        const projectilesToRemove: string[] = [];
        this.projectiles.forEach((p, id) => {
            p.data.remainingLife -= deltaTime * 1000;
            if (p.data.remainingLife <= 0 || (p.body as any).userData.shouldRemove) {
                projectilesToRemove.push(id);
            } else {
                p.data.position.x = p.body.position.x;
                p.data.position.y = p.body.position.y;
                p.data.position.z = p.body.position.z;
            }
        });
    
        projectilesToRemove.forEach(id => {
            const p = this.projectiles.get(id);
            if (p) {
                this.world.removeBody(p.body);
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