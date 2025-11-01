
import { Ship, NPC, Salvage } from '../types';
import { NPCAction, aiService } from './aiService';
import { audioService } from './audioService';
import { playerShipService } from './playerShipService';
import { physicsService } from './physicsService';
import { projectileService } from './projectileService';
import { effectsService } from './effectsService';

class CombatCoordinator {
    private target: NPC | null = null;
    private salvage: Salvage[] = [];
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

    public handleNpcActions(npcActions: NPCAction[]) {
        const npcs = aiService.getNpcs();

        for (const action of npcActions) {
            const npc = npcs.find(n => n.id === action.npcId);
            if (!npc) continue;
            
            switch(action.type) {
                case 'MOVE_TOWARDS':
                    if (action.targetPosition) {
                        const desiredAngle = (Math.atan2(action.targetPosition.y - npc.position.y, action.targetPosition.x - npc.position.x) * 180 / Math.PI) + 90;
                        
                        let angleDiff = desiredAngle - npc.angle;
                        while (angleDiff > 180) angleDiff -= 360;
                        while (angleDiff < -180) angleDiff += 360;

                        let turn = 0;
                        if (angleDiff > 2) turn = 1;
                        if (angleDiff < -2) turn = -1;

                        physicsService.applyTurn(npc.id, turn);
                        physicsService.applyThrust(npc.id, 1);
                    }
                    break;
                case 'ATTACK':
                    if (Math.random() < 0.02) { // slower fire rate with faster loop
                        projectileService.createProjectile(npc.id, npc.position, npc.angle, 5); // NPC damage
                        audioService.playLaserSound();
                    }
                    physicsService.applyThrust(npc.id, 0);
                    physicsService.applyTurn(npc.id, 0);
                    break;
                case 'IDLE':
                    physicsService.applyThrust(npc.id, 0);
                    physicsService.applyTurn(npc.id, 0);
                    break;
            }
        }
    }

    public handlePlayerAttack() {
        const ship = playerShipService.getShip();
        if (!this.target) return;

        const weapons = ship.slots.filter(
            s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon'
        );

        if (weapons.length === 0) return;
        
        const totalEnergyCost = weapons.reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
        
        if (ship.energy < totalEnergyCost) return;
        
        playerShipService.useEnergy(totalEnergyCost);
        audioService.playLaserSound();
        
        const totalDamage = weapons.reduce((acc, s) => acc + (s.equippedItem?.stats?.damage || 0), 0);
        projectileService.createProjectile(ship.id, ship.position, ship.angle, totalDamage);
    }
    
    public applyHit(targetId: string, damage: number) {
        const playerShip = playerShipService.getShip();
        if (targetId === playerShip.id) {
            playerShipService.applyDamage(damage);
            return;
        }

        const targetNpc = aiService.getNpcs().find(n => n.id === targetId);
        if (targetNpc) {
            const newShields = targetNpc.shields - damage;
            let newHull = targetNpc.hull;
            let finalShields = newShields;

            if (newShields < 0) {
                newHull += newShields;
                finalShields = 0;
            }

            const damagedNpc = { ...targetNpc, shields: finalShields, hull: newHull };
            
            if (damagedNpc.hull <= 0) {
                effectsService.createExplosion(damagedNpc.position, 'large');
                audioService.playExplosionSound();

                this.salvage.push({
                    id: `salvage-${damagedNpc.id}`,
                    contents: { name: 'Scrap Metal', quantity: Math.ceil(Math.random() * 5), weight: 1 },
                    position: damagedNpc.position,
                });

                aiService.removeNpc(damagedNpc.id);

                if (this.target?.id === damagedNpc.id) {
                    this.setTarget(null);
                }
                this.notify();
            } else {
                aiService.updateNpc(damagedNpc);
                if (this.target?.id === damagedNpc.id) {
                    this.setTarget(damagedNpc);
                }
            }
        }
    }

    public targetNextEnemy() {
        const npcs = aiService.getNpcs();
        const hostiles = npcs.filter(n => n.isHostile);
        if (hostiles.length === 0) {
            this.setTarget(null);
            return;
        }
        const currentTargetIndex = this.target ? hostiles.findIndex(n => n.id === this.target!.id) : -1;
        const nextIndex = (currentTargetIndex + 1) % hostiles.length;
        this.setTarget(hostiles[nextIndex]);
    }

    public scoopSalvage(salvageId: string): { success: boolean } {
        const ship = playerShipService.getShip();
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
        playerShipService.setShip(newShip);

        this.salvage = this.salvage.filter(i => i.id !== salvageId);
        this.notify();

        return { success: true };
    }
}

export const combatCoordinator = new CombatCoordinator();