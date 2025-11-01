import { NPC, StarSystem, Ship, AIState } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';

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
        
        return {
            id: `${npcType.toLowerCase()}-${Date.now()}-${Math.random()}`,
            type: npcType,
            shipType: shipType,
            hull: spec.hull,
            maxHull: spec.hull,
            shields: spec.shields,
            maxShields: spec.shields,
            position: { x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 800 },
            isHostile: npcType === 'Pirate',
            aiState: 'PATROLLING',
        };
    };

    public spawnEntities(currentSystem: StarSystem) {
        const isAnarchy = currentSystem.government === 'Anarchy';
        const numPirates = isAnarchy ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2);
        const newNpcs: NPC[] = [];
        for (let i = 0; i < numPirates; i++) {
            const randomShipType = PIRATE_SHIP_TYPES[Math.floor(Math.random() * PIRATE_SHIP_TYPES.length)];
            const npc = this.createNpcShip(randomShipType, 'Pirate');
            if (npc) {
                newNpcs.push(npc);
            }
        }
        this.npcs = newNpcs;
        this.systemCleared = false;
        this.notify();
    }

    public update(playerShip: Ship): NPCAction[] {
        const actions: NPCAction[] = [];
        const updatedNpcs = this.npcs.map(npc => {
            if (!npc.isHostile) return npc;

            const distToPlayer = Math.sqrt(
                (npc.position.x - playerShip.position.x) ** 2 + (npc.position.y - playerShip.position.y) ** 2
            );

            // State transitions
            let newState = npc.aiState;
            switch(npc.aiState) {
                case 'PATROLLING':
                    if (distToPlayer < 800) newState = 'ATTACKING';
                    break;
                case 'ATTACKING':
                    if (npc.hull < npc.maxHull * 0.2) newState = 'FLEEING';
                    if (distToPlayer > 1000) newState = 'PATROLLING';
                    break;
                case 'FLEEING':
                    if (distToPlayer > 1200) newState = 'PATROLLING'; // Fled successfully
                    break;
            }

            const updatedNpc = { ...npc, aiState: newState };

            // Generate actions based on state
            switch (updatedNpc.aiState) {
                case 'ATTACKING':
                    if (distToPlayer > 400) {
                        actions.push({ npcId: npc.id, type: 'MOVE_TOWARDS', targetPosition: playerShip.position });
                    } else {
                        actions.push({ npcId: npc.id, type: 'ATTACK' });
                    }
                    break;
                case 'FLEEING':
                    const fleeAngle = Math.atan2(npc.position.y - playerShip.position.y, npc.position.x - playerShip.position.x);
                    actions.push({ npcId: npc.id, type: 'MOVE_TOWARDS', targetPosition: {
                        x: npc.position.x + Math.cos(fleeAngle) * 1000,
                        y: npc.position.y + Math.sin(fleeAngle) * 1000,
                    }});
                    break;
                case 'PATROLLING':
                default:
                    // Simple patrol: move randomly
                    if (Math.random() < 0.01) {
                         actions.push({ npcId: npc.id, type: 'MOVE_TOWARDS', targetPosition: {
                            x: npc.position.x + (Math.random() - 0.5) * 500,
                            y: npc.position.y + (Math.random() - 0.5) * 500,
                        }});
                    } else {
                        actions.push({ npcId: npc.id, type: 'IDLE' });
                    }
                    break;
            }
            
            return updatedNpc;
        });

        if (JSON.stringify(this.npcs) !== JSON.stringify(updatedNpcs)) {
            this.npcs = updatedNpcs;
            this.notify();
        }

        return actions;
    }
}

export const aiService = new AIService();
