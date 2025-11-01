import { Ship, NPC, Salvage } from '../types';
import { NPCAction, aiService } from './aiService';
import { audioService } from './audioService';

class CombatCoordinator {
    private target: NPC | null = null;
    private salvage: Salvage[] = [];
    private damageToPlayerThisFrame: number = 0;
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

    public getTarget(): NPC | null { return this.target; }
    public setTarget(npc: NPC | null) {
        this.target = npc;
        this.notify();
    }
    public getSalvage(): Salvage[] { return this.salvage; }
    public clearSalvage() {
        this.salvage = [];
        this.notify();
    }

    public getAndClearDamageToPlayer(): number {
        const damage = this.damageToPlayerThisFrame;
        this.damageToPlayerThisFrame = 0;
        return damage;
    }

    public update(playerShip: Ship, npcActions: NPCAction[]) {
        const npcs = aiService.getNpcs();
        const updatedNpcs: NPC[] = [];

        for (const npc of npcs) {
            const action = npcActions.find(a => a.npcId === npc.id);
            let updatedNpc = { ...npc };
            
            if (action) {
                switch(action.type) {
                    case 'MOVE_TOWARDS':
                        if (action.targetPosition) {
                            const angleToTarget = Math.atan2(action.targetPosition.y - npc.position.y, action.targetPosition.x - npc.position.x);
                            updatedNpc.position = {
                                x: npc.position.x + Math.cos(angleToTarget) * 2, // NPC speed
                                y: npc.position.y + Math.sin(angleToTarget) * 2,
                            };
                        }
                        break;
                    case 'ATTACK':
                        if (Math.random() < 0.02) { // slower fire rate with faster loop
                            this.damageToPlayerThisFrame += Math.random() * 10;
                        }
                        break;
                    case 'IDLE':
                        // Do nothing
                        break;
                }
            }
            updatedNpcs.push(updatedNpc);
        }
        
        // This is a bit inefficient, but for now we'll just replace the whole array
        updatedNpcs.forEach(n => aiService.updateNpc(n));
    }

    public handlePlayerAttack(ship: Ship): { playerEnergyUsed: number, targetDestroyed: boolean } {
        if (!this.target) return { playerEnergyUsed: 0, targetDestroyed: false };

        const weapons = ship.slots.filter(
            s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon'
        );

        if (weapons.length === 0) return { playerEnergyUsed: 0, targetDestroyed: false };
        
        const totalEnergyCost = weapons.reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
        const totalDamage = weapons.reduce((acc, s) => acc + (s.equippedItem?.stats?.damage || 0), 0);
        
        if (ship.energy < totalEnergyCost) return { playerEnergyUsed: 0, targetDestroyed: false };
        
        let targetDestroyed = false;
        const targetNpc = aiService.getNpcs().find(n => n.id === this.target!.id);

        if (targetNpc) {
            const newShields = targetNpc.shields - totalDamage;
            let newHull = targetNpc.hull;
            let finalShields = newShields;

            if (newShields < 0) {
                newHull += newShields;
                finalShields = 0;
            }

            const damagedNpc = { ...targetNpc, shields: finalShields, hull: newHull };
            
            if (damagedNpc.hull <= 0) {
                targetDestroyed = true;
                this.salvage.push({
                    id: `salvage-${damagedNpc.id}`,
                    contents: { name: 'Scrap Metal', quantity: Math.ceil(Math.random() * 5), weight: 1 },
                    position: damagedNpc.position,
                });
                aiService.removeNpc(damagedNpc.id);
                this.setTarget(null);
                this.notify();
            } else {
                aiService.updateNpc(damagedNpc);
                this.setTarget(damagedNpc);
            }
        }
        
        return { playerEnergyUsed: totalEnergyCost, targetDestroyed };
    }
    
    public targetNextEnemy(ship: Ship, npcs: NPC[]) {
        const hostiles = npcs.filter(n => n.isHostile);
        if (hostiles.length === 0) {
            this.setTarget(null);
            return;
        }
        const currentTargetIndex = this.target ? hostiles.findIndex(n => n.id === this.target!.id) : -1;
        const nextIndex = (currentTargetIndex + 1) % hostiles.length;
        this.setTarget(hostiles[nextIndex]);
    }

    public scoopSalvage(ship: Ship, salvageId: string): { success: boolean, ship?: Ship } {
        const item = this.salvage.find(s => s.id === salvageId);
        if (!item) return { success: false };

        const totalWeight = ship.cargo.reduce((acc, c) => acc + (c.quantity * c.weight), 0);
        if (totalWeight + (item.contents.quantity * item.contents.weight) > ship.cargoCapacity) {
          return { success: false };
        }
        
        const existingItemIndex = ship.cargo.findIndex(c => c.name === item.contents.name);
        let newCargo;
        if (existingItemIndex > -1) {
            newCargo = ship.cargo.map((cargoItem, index) => {
                if (index === existingItemIndex) {
                    return { ...cargoItem, quantity: cargoItem.quantity + item.contents.quantity };
                }
                return cargoItem;
            });
        } else {
            newCargo = [...ship.cargo, item.contents];
        }
        const newShip = { ...ship, cargo: newCargo };

        this.salvage = this.salvage.filter(i => i.id !== salvageId);
        this.notify();

        return { success: true, ship: newShip };
    }
}

export const combatCoordinator = new CombatCoordinator();
