
import { NPC, StarSystem, Ship, AIState } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import { physicsService3D } from './physicsService3D';
import { playerShipService } from './playerShipService';
import * as CANNON from 'cannon-es';

const PIRATE_SHIP_TYPES = ['Viper', 'Adder', 'Cobra Mk III'];

class AIService {
    private npcs: NPC[] = [];
    private systemCleared: boolean = false;
    private subscribers: (() => void)[] = [];
    private cooldowns = new Map<string, number>(); // npcId -> firing cooldown

    constructor() {
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

    public getNpcs(): NPC[] {
        return this.npcs;
    }

    public getNpcCount(): number {
        return this.npcs.length;
    }

    public isSystemCleared(): boolean {
        return this.systemCleared;
    }

    public clearNpcs() {
        this.npcs = [];
        this.systemCleared = false;
        this.notify();
    }
    
    public updateNpc(updatedNpc: NPC) {
        const index = this.npcs.findIndex(n => n.id === updatedNpc.id);
        if (index !== -1) {
            this.npcs[index] = updatedNpc;
            this.notify();
        }
    }
    
    public removeNpc(npcId: string) {
        this.npcs = this.npcs.filter(n => n.id !== npcId);
        physicsService3D.removeNpcBody(npcId);
        
        if (this.npcs.every(n => !n.isHostile)) {
            this.systemCleared = true;
        }
        this.notify();
    }

    public createNpcShip(shipType: string, npcType: 'Pirate' | 'Trader' | 'Police', spawnPos?: {x: number, y: number, z: number}): NPC | null {
        const shipSpecData = SHIPS_FOR_SALE.find(s => s.type === shipType);
        if (!shipSpecData) {
            console.error(`Could not find ship spec for '${shipType}'`);
            return null;
        }
        const spec = shipSpecData.spec;
        
        const id = `${npcType.toLowerCase()}-${Date.now()}-${Math.random()}`;
        const position = spawnPos || { 
            x: (Math.random() - 0.5) * 8000, 
            y: 0, 
            z: (Math.random() - 0.5) * 8000 
        };
        
        return {
            id: id,
            type: npcType,
            shipType: shipType,
            hull: spec.hull,
            maxHull: spec.hull,
            shields: spec.shields,
            maxShields: spec.shields,
            position,
            isHostile: npcType === 'Pirate',
            aiState: npcType === 'Trader' ? 'TRAVEL_TO_STATION' : 'PATROLLING',
            velocity: { x: 0, y: 0, z: 0 },
            angle: 0,
        };
    };

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    private randomChoice<T>(arr: readonly T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    public spawnEntities(currentSystem: StarSystem) {
        this.clearNpcs();
        
        const stationPos = { x: 5000, y: 0, z: -1000 }; // Flattened station position
        const jumpPoint = { x: 0, y: 0, z: 0 };

        const isAnarchy = currentSystem.government === 'Anarchy';
        const numPirates = isAnarchy ? this.randomInt(2, 5) : this.randomInt(0, 2);
        const numTraders = this.randomInt(2, 4);
        const numPolice = (currentSystem.government !== 'Anarchy' && currentSystem.government !== 'Feudal') ? this.randomInt(2, 4) : 0;

        const newNpcs: NPC[] = [];

        // Spawn Traders near jump point, heading to station
        for (let i = 0; i < numTraders; i++) {
            const spawnOffset = { x: (Math.random() - 0.5) * 1000, y: 0, z: (Math.random() - 0.5) * 1000 };
            const npc = this.createNpcShip('Cobra Mk III', 'Trader', { x: jumpPoint.x + spawnOffset.x, y: 0, z: jumpPoint.z + spawnOffset.z });
            if (npc) {
                npc.navigationTarget = stationPos;
                newNpcs.push(npc);
            }
        }
        
        // Spawn Police near station
        for (let i = 0; i < numPolice; i++) {
             const spawnOffset = { x: (Math.random() - 0.5) * 500, y: 0, z: (Math.random() - 0.5) * 500 };
            const npc = this.createNpcShip('Viper', 'Police', { x: stationPos.x + spawnOffset.x, y: 0, z: stationPos.z + spawnOffset.z });
            if (npc) {
                npc.isHostile = false; 
                npc.navigationTarget = stationPos; // They patrol around here
                newNpcs.push(npc);
            }
        }

        // Spawn Pirates between jump point and station (ambush)
        for (let i = 0; i < numPirates; i++) {
            const lerpFactor = 0.3 + Math.random() * 0.4; // 30-70% of the way
            const ambushPos = {
                x: jumpPoint.x + (stationPos.x - jumpPoint.x) * lerpFactor + (Math.random() - 0.5) * 2000,
                y: 0,
                z: jumpPoint.z + (stationPos.z - jumpPoint.z) * lerpFactor + (Math.random() - 0.5) * 2000
            };
            
            const randomShipType = this.randomChoice(PIRATE_SHIP_TYPES);
            const npc = this.createNpcShip(randomShipType, 'Pirate', ambushPos);
            if (npc) newNpcs.push(npc);
        }
        
        this.npcs = newNpcs;
        this.systemCleared = this.npcs.every(n => !n.isHostile);
        
        // Initial sync with physics engine
        this.npcs.forEach(npc => {
            physicsService3D.initializeNpc(npc);
        });

        this.notify();
    }

    public update(deltaTime: number) {
        const playerShip = playerShipService.getShip();
        const playerBody = physicsService3D.getShipBody();

        this.npcs.forEach(npc => {
            const npcBody = physicsService3D.getNpcBody(npc.id);
            if (!npcBody) return;

            // 1. Update State Decision
            this.updateNPCState(npc, playerShip, playerBody, npcBody);

            // 2. Execute Action based on State
            this.executeNPCAction(npc, npcBody, playerShip, playerBody, deltaTime);
            
            // Sync physics position back to data model
            npc.position.x = npcBody.position.x;
            npc.position.y = npcBody.position.y;
            npc.position.z = npcBody.position.z;
            
            // Handle weapon cooldowns
            const currentCooldown = this.cooldowns.get(npc.id) || 0;
            if (currentCooldown > 0) {
                this.cooldowns.set(npc.id, Math.max(0, currentCooldown - deltaTime));
            }
        });
    }

    private updateNPCState(npc: NPC, playerShip: Ship, playerBody: CANNON.Body | null, npcBody: CANNON.Body) {
        // Global: Flee if low health
        if (npc.hull < npc.maxHull * 0.25) {
            npc.aiState = 'FLEEING';
            // Flee from whoever hurt them last (stored in targetId) or player if undefined
            if (!npc.targetId) npc.targetId = playerShip.id;
            return;
        }

        // Distance utils
        const distToPlayer = playerBody ? npcBody.position.distanceTo(playerBody.position) : Infinity;
        
        switch (npc.type) {
            case 'Pirate':
                // Pirate Logic
                if (npc.aiState !== 'DOGFIGHT' && npc.aiState !== 'INTERCEPT' && npc.aiState !== 'FLEEING') {
                    // Search for targets
                    if (distToPlayer < 2500) {
                         npc.aiState = 'INTERCEPT';
                         npc.targetId = playerShip.id;
                    } else {
                        // Look for traders
                        const targetTrader = this.npcs.find(n => n.type === 'Trader' && npcBody.position.distanceTo(new CANNON.Vec3(n.position.x, n.position.y, n.position.z)) < 3000);
                        if (targetTrader) {
                            npc.aiState = 'INTERCEPT';
                            npc.targetId = targetTrader.id;
                        } else {
                             npc.aiState = 'PATROLLING'; // Idle around ambush point
                        }
                    }
                } else if (npc.aiState === 'INTERCEPT') {
                    // Transition to Dogfight if close
                    if (npc.targetId === playerShip.id && distToPlayer < 800) {
                        npc.aiState = 'DOGFIGHT';
                    } else if (npc.targetId) {
                         // Check distance to other NPC target
                         const targetNpc = this.npcs.find(n => n.id === npc.targetId);
                         if (targetNpc) {
                             const dist = npcBody.position.distanceTo(new CANNON.Vec3(targetNpc.position.x, targetNpc.position.y, targetNpc.position.z));
                             if (dist < 800) npc.aiState = 'DOGFIGHT';
                         } else {
                             npc.aiState = 'PATROLLING'; // Target lost
                         }
                    }
                }
                break;

            case 'Police':
                // Police Logic
                if (npc.aiState === 'PATROLLING') {
                     // Check for hostiles or wanted player
                     if (playerShip.legalStatus !== 'Clean' && distToPlayer < 2000) {
                         npc.aiState = 'INTERCEPT';
                         npc.targetId = playerShip.id;
                         npc.isHostile = true;
                     } else {
                         const hostile = this.npcs.find(n => n.isHostile && npcBody.position.distanceTo(new CANNON.Vec3(n.position.x, n.position.y, n.position.z)) < 3000);
                         if (hostile) {
                             npc.aiState = 'INTERCEPT';
                             npc.targetId = hostile.id;
                         }
                     }
                } else if (npc.aiState === 'INTERCEPT' || npc.aiState === 'DOGFIGHT') {
                    // Transition
                    if (npc.targetId === playerShip.id) {
                         if (playerShip.legalStatus === 'Clean') {
                             npc.aiState = 'PATROLLING';
                             npc.isHostile = false;
                         } else if (distToPlayer < 800) {
                             npc.aiState = 'DOGFIGHT';
                         }
                    } else if (npc.targetId) {
                         const targetNpc = this.npcs.find(n => n.id === npc.targetId);
                         if (!targetNpc) npc.aiState = 'PATROLLING';
                         else {
                             const dist = npcBody.position.distanceTo(new CANNON.Vec3(targetNpc.position.x, targetNpc.position.y, targetNpc.position.z));
                             if (dist < 800) npc.aiState = 'DOGFIGHT';
                         }
                    }
                }
                break;

            case 'Trader':
                // Trader Logic: Just go to station. Flee if attacked.
                if (npc.aiState !== 'FLEEING' && npc.aiState !== 'DOCKING') {
                    npc.aiState = 'TRAVEL_TO_STATION';
                }
                // If close to station, despawn (simulate docking)
                if (npc.navigationTarget) {
                    const distToStation = npcBody.position.distanceTo(new CANNON.Vec3(npc.navigationTarget.x, npc.navigationTarget.y, npc.navigationTarget.z));
                    if (distToStation < 300) {
                        this.removeNpc(npc.id); // Docked
                        return;
                    }
                }
                break;
        }
    }

    private executeNPCAction(npc: NPC, npcBody: CANNON.Body, playerShip: Ship, playerBody: CANNON.Body | null, deltaTime: number) {
        let targetPos: CANNON.Vec3 | undefined;

        // Resolve Target Position
        if (npc.targetId) {
            if (npc.targetId === playerShip.id && playerBody) {
                targetPos = playerBody.position;
            } else {
                const targetNpc = this.npcs.find(n => n.id === npc.targetId);
                if (targetNpc) targetPos = new CANNON.Vec3(targetNpc.position.x, targetNpc.position.y, targetNpc.position.z);
            }
        }

        switch (npc.aiState) {
            case 'TRAVEL_TO_STATION':
                if (npc.navigationTarget) {
                    const dest = new CANNON.Vec3(npc.navigationTarget.x, npc.navigationTarget.y, npc.navigationTarget.z);
                    physicsService3D.steerNpcTowards(npc.id, dest);
                    physicsService3D.applyNpcThrust(npc.id, 0.5); // Cruising speed
                }
                break;
            
            case 'PATROLLING':
                // Circle around spawn point or random drift
                // For police: circle station
                if (npc.type === 'Police' && npc.navigationTarget) {
                    // Simple orbit logic: Cross product of up and direction to center gives tangent
                    const center = new CANNON.Vec3(npc.navigationTarget.x, npc.navigationTarget.y, npc.navigationTarget.z);
                    const toCenter = center.vsub(npcBody.position);
                    const tangent = toCenter.cross(new CANNON.Vec3(0,1,0)).unit();
                    // Destination is ahead along tangent
                    const dest = npcBody.position.vadd(tangent.scale(500));
                    physicsService3D.steerNpcTowards(npc.id, dest);
                    physicsService3D.applyNpcThrust(npc.id, 0.4);
                } else {
                    // Random drift
                    physicsService3D.applyNpcThrust(npc.id, 0.2);
                    if (Math.random() < 0.02) physicsService3D.applyNpcYaw(npc.id, (Math.random()-0.5));
                }
                break;

            case 'INTERCEPT':
                if (targetPos) {
                    physicsService3D.steerNpcTowards(npc.id, targetPos);
                    physicsService3D.applyNpcThrust(npc.id, 1.0); // Full burn
                    this.attemptFire(npc, npcBody, targetPos); // Potentially fire long range missiles?
                }
                break;

            case 'DOGFIGHT':
                if (targetPos) {
                    // Advanced: Try to get behind target? Or just turn to face?
                    // Basic Dogfight: Turn to face + speed management
                    const dist = npcBody.position.distanceTo(targetPos);
                    physicsService3D.steerNpcTowards(npc.id, targetPos);
                    
                    // Throttle control
                    if (dist > 500) physicsService3D.applyNpcThrust(npc.id, 1.0);
                    else if (dist < 200) physicsService3D.applyNpcThrust(npc.id, 0.2); // Slow to turn tighter
                    else physicsService3D.applyNpcThrust(npc.id, 0.6); // Combat speed

                    this.attemptFire(npc, npcBody, targetPos);
                } else {
                    npc.aiState = 'PATROLLING'; // Lost target
                }
                break;

            case 'FLEEING':
                if (targetPos) {
                     // Vector away from threat
                     const fromThreat = npcBody.position.vsub(targetPos).unit();
                     const fleeDest = npcBody.position.vadd(fromThreat.scale(1000));
                     physicsService3D.steerNpcTowards(npc.id, fleeDest);
                     physicsService3D.applyNpcThrust(npc.id, 1.0);
                } else if (npc.navigationTarget) {
                     // If no specific threat, run to station for cover
                     const dest = new CANNON.Vec3(npc.navigationTarget.x, npc.navigationTarget.y, npc.navigationTarget.z);
                     physicsService3D.steerNpcTowards(npc.id, dest);
                     physicsService3D.applyNpcThrust(npc.id, 1.0);
                }
                break;
        }
    }

    private attemptFire(npc: NPC, body: CANNON.Body, targetPos: CANNON.Vec3) {
        if ((this.cooldowns.get(npc.id) || 0) > 0) return;

        const toTarget = targetPos.vsub(body.position);
        const dist = toTarget.length();
        
        if (dist > 1200) return; // Out of range

        const forward = new CANNON.Vec3(0, 0, -1);
        const worldForward = body.quaternion.vmult(forward);
        
        const dot = worldForward.dot(toTarget.unit());
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

        // Fire if roughly facing target (within ~15 degrees)
        if (angle < 0.26) {
            const damage = 5;
            physicsService3D.fireProjectile(npc.id, damage, 800, 'laser', npc.targetId);
            this.cooldowns.set(npc.id, 0.5 + Math.random() * 0.5); // 0.5-1s fire rate
        }
    }
}

export const aiService = new AIService();
