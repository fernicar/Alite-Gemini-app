
import { NPC, StarSystem, Ship, AIState } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import { physicsService3D } from './physicsService3D';
import { playerShipService } from './playerShipService';
import * as CANNON from 'cannon-es';

const PIRATE_SHIP_TYPES = ['Viper Mk I', 'Adder', 'Cobra Mk III'];

export interface NPCAction {
    npcId: string;
    type: 'MOVE_TOWARDS' | 'ATTACK' | 'IDLE';
    targetPosition?: { x: number, y: number };
}

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

    public createNpcShip(shipType: string, npcType: 'Pirate' | 'Trader' | 'Police'): NPC | null {
        const shipSpecData = SHIPS_FOR_SALE.find(s => s.type === shipType);
        if (!shipSpecData) {
            console.error(`Could not find ship spec for '${shipType}'`);
            return null;
        }
        const spec = shipSpecData.spec;
        
        const id = `${npcType.toLowerCase()}-${Date.now()}-${Math.random()}`;
        const position = { 
            x: (Math.random() - 0.5) * 8000, 
            y: (Math.random() - 0.5) * 4000, 
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
            aiState: 'PATROLLING',
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
        const isAnarchy = currentSystem.government === 'Anarchy';
        const numPirates = isAnarchy ? this.randomInt(2, 5) : this.randomInt(0, 2);
        const numTraders = this.randomInt(1, 3);
        const numPolice = (currentSystem.government !== 'Anarchy' && currentSystem.government !== 'Feudal') ? this.randomInt(1, 3) : 0;

        const newNpcs: NPC[] = [];

        for (let i = 0; i < numPirates; i++) {
            const randomShipType = this.randomChoice(PIRATE_SHIP_TYPES);
            const npc = this.createNpcShip(randomShipType, 'Pirate');
            if (npc) newNpcs.push(npc);
        }
        
        for (let i = 0; i < numTraders; i++) {
            const npc = this.createNpcShip('Cobra Mk III', 'Trader');
            if (npc) newNpcs.push(npc);
        }
        
        for (let i = 0; i < numPolice; i++) {
            const npc = this.createNpcShip('Viper Mk I', 'Police');
            if (npc) {
                npc.isHostile = false; // Police are not hostile by default
                newNpcs.push(npc);
            }
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

            // 1. Update State
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
        // Flee if low health
        if (npc.hull < npc.maxHull * 0.3) {
            npc.aiState = 'FLEEING';
            // Flee from whoever hurt them last (stored in targetId) or player if undefined
            if (!npc.targetId) npc.targetId = playerShip.id;
            return;
        }

        switch (npc.type) {
            case 'Pirate':
                // Pirate Logic: Attack player or traders
                if (npc.aiState === 'PATROLLING') {
                    // Look for targets
                    if (playerBody && npcBody.position.distanceTo(playerBody.position) < 3000) {
                         npc.aiState = 'ATTACKING';
                         npc.targetId = playerShip.id;
                    } else {
                        // Scan for traders
                        const targetTrader = this.npcs.find(n => n.type === 'Trader' && npcBody.position.distanceTo(new CANNON.Vec3(n.position.x, n.position.y, n.position.z)) < 3000);
                        if (targetTrader) {
                            npc.aiState = 'ATTACKING';
                            npc.targetId = targetTrader.id;
                        }
                    }
                }
                break;

            case 'Police':
                // Police Logic: Attack pirates or wanted player
                if (npc.aiState === 'PATROLLING') {
                     if (playerBody && playerShip.legalStatus !== 'Clean' && npcBody.position.distanceTo(playerBody.position) < 2000) {
                         npc.aiState = 'ATTACKING';
                         npc.targetId = playerShip.id;
                         npc.isHostile = true; // Mark as hostile on HUD
                     } else {
                         const targetPirate = this.npcs.find(n => n.type === 'Pirate' && npcBody.position.distanceTo(new CANNON.Vec3(n.position.x, n.position.y, n.position.z)) < 3000);
                         if (targetPirate) {
                             npc.aiState = 'ATTACKING';
                             npc.targetId = targetPirate.id;
                         }
                     }
                } else if (npc.aiState === 'ATTACKING') {
                    // Stop attacking if player becomes clean (unlikely in combat) or target destroyed
                    if (npc.targetId === playerShip.id && playerShip.legalStatus === 'Clean') {
                        npc.aiState = 'PATROLLING';
                        npc.targetId = undefined;
                        npc.isHostile = false;
                    }
                }
                break;

            case 'Trader':
                // Trader Logic: Flee if attacked, otherwise patrol
                if (npc.aiState === 'ATTACKING') {
                    // Traders generally don't attack, switch to fleeing if they were somehow set to attack
                    npc.aiState = 'FLEEING';
                }
                break;
        }
    }

    private executeNPCAction(npc: NPC, npcBody: CANNON.Body, playerShip: Ship, playerBody: CANNON.Body | null, deltaTime: number) {
        switch (npc.aiState) {
            case 'ATTACKING':
                if (npc.targetId) {
                    let targetPos: CANNON.Vec3 | undefined;
                    if (npc.targetId === playerShip.id && playerBody) {
                        targetPos = playerBody.position;
                    } else {
                        const targetNpc = this.npcs.find(n => n.id === npc.targetId);
                        if (targetNpc) {
                            targetPos = new CANNON.Vec3(targetNpc.position.x, targetNpc.position.y, targetNpc.position.z);
                        } else {
                            // Target lost/destroyed
                            npc.aiState = 'PATROLLING';
                            npc.targetId = undefined;
                        }
                    }

                    if (targetPos) {
                        this.flyTowards(npc, npcBody, targetPos);
                        this.attemptFire(npc, npcBody, targetPos);
                    }
                }
                break;

            case 'FLEEING':
                if (npc.targetId) {
                     let threatPos: CANNON.Vec3 | undefined;
                     if (npc.targetId === playerShip.id && playerBody) {
                         threatPos = playerBody.position;
                     } else {
                         const threatNpc = this.npcs.find(n => n.id === npc.targetId);
                         if (threatNpc) threatPos = new CANNON.Vec3(threatNpc.position.x, threatNpc.position.y, threatNpc.position.z);
                     }
                     
                     if (threatPos) {
                        this.flyAwayFrom(npc, npcBody, threatPos);
                     }
                }
                break;

            case 'PATROLLING':
                // Simple patrol: fly forward, occasionally turn
                physicsService3D.applyNpcThrust(npc.id, 0.3);
                if (Math.random() < 0.01) {
                    physicsService3D.applyNpcYaw(npc.id, (Math.random() - 0.5) * 1.0);
                }
                // Avoid running away too far
                if (npcBody.position.length() > 15000) {
                     const origin = new CANNON.Vec3(0,0,0);
                     this.flyTowards(npc, npcBody, origin);
                }
                break;
        }
    }

    private flyTowards(npc: NPC, body: CANNON.Body, target: CANNON.Vec3) {
        const toTarget = target.vsub(body.position);
        const distance = toTarget.length();
        
        // Orient towards target
        const forward = new CANNON.Vec3(0, 0, -1);
        const worldForward = body.quaternion.vmult(forward);
        const targetDir = toTarget.unit();
        
        // Calculate rotation needed (simplified cross product for torque)
        const cross = worldForward.cross(targetDir);
        // Apply torque to turn
        body.applyTorque(cross.scale(100000));
        
        // Damping for stability
        body.angularVelocity.scale(0.95, body.angularVelocity);

        // Thrust logic
        if (distance > 400) {
            physicsService3D.applyNpcThrust(npc.id, 0.6);
        } else if (distance < 150) {
             physicsService3D.applyNpcThrust(npc.id, -0.2); // Reverse to maintain distance
        } else {
             // In sweet spot
             physicsService3D.applyNpcThrust(npc.id, 0.1);
        }
    }

    private flyAwayFrom(npc: NPC, body: CANNON.Body, threat: CANNON.Vec3) {
        const fromThreat = body.position.vsub(threat);
        
        const forward = new CANNON.Vec3(0, 0, -1);
        const worldForward = body.quaternion.vmult(forward);
        const fleeDir = fromThreat.unit();

        const cross = worldForward.cross(fleeDir);
        body.applyTorque(cross.scale(80000));
        body.angularVelocity.scale(0.95, body.angularVelocity);

        physicsService3D.applyNpcThrust(npc.id, 1.0); // Full speed
    }

    private attemptFire(npc: NPC, body: CANNON.Body, targetPos: CANNON.Vec3) {
        if ((this.cooldowns.get(npc.id) || 0) > 0) return;

        const toTarget = targetPos.vsub(body.position);
        const dist = toTarget.length();
        
        if (dist > 1200) return; // Out of range

        const forward = new CANNON.Vec3(0, 0, -1);
        const worldForward = body.quaternion.vmult(forward);
        
        // Calculate angle manually
        const dot = worldForward.dot(toTarget);
        // Normalize dot product by magnitudes to get cos(theta)
        // worldForward is unit length. dist is length of toTarget.
        const cosTheta = Math.max(-1, Math.min(1, dot / dist));
        const angle = Math.acos(cosTheta);

        // Fire if roughly facing target (within ~11 degrees)
        if (angle < 0.2) {
            const damage = 5;
            physicsService3D.fireProjectile(npc.id, damage, 600, 'laser', npc.targetId);
            this.cooldowns.set(npc.id, 1.0 + Math.random()); // 1-2s cooldown
        }
    }
}

export const aiService = new AIService();
