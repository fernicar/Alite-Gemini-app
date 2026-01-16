
import * as CANNON from 'cannon-es';
import { Ship, NPC, Celestial, Projectile } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import * as THREE from 'three';

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
            const shipBodyHit = (bodyA.userData?.type === 'npc' || bodyA.userData?.type === 'player' || bodyA.userData?.type === 'celestial') ? bodyA : (bodyB.userData?.type === 'npc' || bodyB.userData?.type === 'player' || bodyA.userData?.type === 'celestial') ? bodyB : null;

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
            angularDamping: 0.5, // Natural damping in space, P-controller handles stopping
            linearDamping: 0.08,
            collisionFilterGroup: COLLISION_GROUPS.SHIP,
            collisionFilterMask: -1, // Collide with everything
        });
        (this.shipBody as any).userData = { type: 'player', data: ship, arcadeSpeed: 0 };

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

    public applyNpcThrust(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if(!body) return;
        const thrustForce = 100000; // NPCs are a bit weaker
        const localForce = new CANNON.Vec3(0, 0, -amount * thrustForce);
        const worldForce = body.quaternion.vmult(localForce);
        body.applyForce(worldForce);
    }
    
    public applyNpcYaw(npcId: string, amount: number) {
        const body = this.npcBodies.get(npcId);
        if(!body) return;
        const turnTorque = 50000;
        const localTorque = new CANNON.Vec3(0, amount * turnTorque, 0);
        const worldTorque = body.quaternion.vmult(localTorque);
        body.applyTorque(worldTorque);
    }

    public fireProjectile(ownerId: string, damage: number, speed: number = 800, type: 'laser' | 'missile' = 'laser', targetId?: string, direction?: THREE.Vector3) {
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

        const projectileShape = type === 'missile' ? new CANNON.Cylinder(0.5, 0.5, 4, 8) : new CANNON.Sphere(0.5);
        const projectileBody = new CANNON.Body({
            mass: type === 'missile' ? 1.0 : 0.1,
            shape: projectileShape,
            linearDamping: 0,
            collisionFilterGroup: COLLISION_GROUPS.PROJECTILE,
            collisionFilterMask: COLLISION_GROUPS.SHIP,
        });

        const startPositionOffset = new CANNON.Vec3(0, 0, -15); // In front of ship
        const worldStartPosition = ownerBody.quaternion.vmult(startPositionOffset);
        projectileBody.position.copy(ownerBody.position).vadd(worldStartPosition, projectileBody.position);
        
        let projectileDirectionVec: THREE.Vector3;

        if (direction) {
            const firePoint = new THREE.Vector3(
                projectileBody.position.x,
                projectileBody.position.y,
                projectileBody.position.z
            );

            // Calculate camera position based on ship's orientation
            const cameraOffset = new THREE.Vector3(0, 25, 60);
            const shipQuaternion = new THREE.Quaternion(
                ownerBody.quaternion.x,
                ownerBody.quaternion.y,
                ownerBody.quaternion.z,
                ownerBody.quaternion.w
            );
            const worldOffset = cameraOffset.applyQuaternion(shipQuaternion);
            const shipPosition = new THREE.Vector3(
                ownerBody.position.x,
                ownerBody.position.y,
                ownerBody.position.z
            );
            // This is the ideal (unsmoothed) camera position
            const cameraPosition = shipPosition.add(worldOffset);

            const aimPoint = new THREE.Vector3()
                .copy(cameraPosition)
                .add(new THREE.Vector3().copy(direction).multiplyScalar(10000)); // Point far away

            projectileDirectionVec = new THREE.Vector3().subVectors(aimPoint, firePoint).normalize();

        } else {
            // Fallback to ship's forward direction
            const forward = new CANNON.Vec3(0, 0, -1);
            const worldForward = ownerBody.quaternion.vmult(forward);
            projectileDirectionVec = new THREE.Vector3(worldForward.x, worldForward.y, worldForward.z);
        }
        
        const worldVelocity = new CANNON.Vec3(
            projectileDirectionVec.x * speed,
            projectileDirectionVec.y * speed,
            projectileDirectionVec.z * speed
        );

        projectileBody.velocity.copy(ownerBody.velocity).vadd(worldVelocity, projectileBody.velocity);
        
        const projectileId = `proj-${this.projectileCounter++}`;

        const projectileData: Projectile = {
            id: projectileId,
            ownerId,
            position: { x: projectileBody.position.x, y: projectileBody.position.y, z: projectileBody.position.z },
            velocity: { x: projectileBody.velocity.x, y: projectileBody.velocity.y, z: projectileBody.velocity.z },
            angle: 0, // Not used in 3D
            type: type,
            damage,
            remainingLife: type === 'missile' ? 8000 : 3000, // missiles live longer
            targetId,
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