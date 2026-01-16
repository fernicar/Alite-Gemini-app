
import { Ship, NPC, Projectile } from '../types';
import { effectsService } from './effectsService';
import { audioService } from './audioService';
import { playerShipService } from './playerShipService';
import { aiService } from './aiService';
import { salvageService } from './SalvageService';

export interface DamageResult {
    targetId: string;
    destroyed: boolean;
    damage: number;
    isPlayer: boolean;
}

class DamageService {
    private destructionSubscribers: ((result: DamageResult) => void)[] = [];

    public onTargetDestroyed(callback: (result: DamageResult) => void): () => void {
        this.destructionSubscribers.push(callback);
        return () => {
            this.destructionSubscribers = this.destructionSubscribers.filter(cb => cb !== callback);
        };
    }

    private notifyDestruction(result: DamageResult) {
        this.destructionSubscribers.forEach(cb => cb(result));
    }

    public processCollision(projectile: Projectile, target: Ship | NPC): DamageResult {
        const isPlayer = !('aiState' in target);
        let currentHull = target.hull;
        let currentShields = target.shields;
        const maxShields = target.maxShields;
        
        // Visuals
        if (currentShields > 0) {
            effectsService.createShieldImpact(target.position, 0);
        } else {
            effectsService.createHullImpact(target.position);
        }

        // Damage Calculation
        const damage = projectile.damage;
        if (currentShields > 0) {
            const shieldDamage = Math.min(currentShields, damage);
            currentShields -= shieldDamage;
            const spillover = damage - shieldDamage;
            if (spillover > 0) currentHull -= spillover;
        } else {
            currentHull -= damage;
        }

        // Apply Update
        if (isPlayer) {
             playerShipService.applyDamage(damage);
             const updatedShip = playerShipService.getShip();
             currentHull = updatedShip.hull; // sync local var for destruction check
        } else {
            const npc = target as NPC;
            let newAiState = npc.aiState;
            let newTargetId = npc.targetId;

            // AI Reaction
            if (projectile.ownerId === playerShipService.getShip().id) {
                if (npc.type === 'Pirate' || npc.type === 'Police') {
                    newAiState = 'ATTACKING';
                    newTargetId = projectile.ownerId;
                } else if (npc.type === 'Trader') {
                    newAiState = 'FLEEING';
                    newTargetId = projectile.ownerId;
                }
            }

            const updatedNpc = { 
                ...npc, 
                hull: currentHull, 
                shields: currentShields,
                isHostile: projectile.ownerId === playerShipService.getShip().id ? true : npc.isHostile,
                aiState: newAiState,
                targetId: newTargetId
            };
            
            aiService.updateNpc(updatedNpc);
        }

        const result: DamageResult = { targetId: target.id, destroyed: false, damage, isPlayer };

        // Destruction Check
        if (currentHull <= 0) {
            effectsService.createExplosion(target.position, 'large');
            audioService.playExplosionSound();
            
            if (!isPlayer) {
                salvageService.spawnSalvage(target.position, { 
                    name: 'Scrap Metal', 
                    quantity: Math.ceil(Math.random() * 5), 
                    weight: 1 
                });
                aiService.removeNpc(target.id);
            }
            
            result.destroyed = true;
            this.notifyDestruction(result);
        }

        return result;
    }
}

export const damageService = new DamageService();
