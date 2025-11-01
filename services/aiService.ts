
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

    constructor() {
        // Physics subscription removed as state is now managed in App.tsx
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
        const numPolice = (currentSystem.government !== 'Anarchy' && currentSystem.government !== 'Feudal') ? this.randomInt(0, 2) : 0;

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
        this.notify();
    }

    public update(playerShip: Ship): NPCAction[] {
        // This logic is now superseded by the simple AI in App.tsx's game loop.
        // It is kept here for potential future refactoring but is currently dead code.
        return [];
    }
}

export const aiService = new AIService();
