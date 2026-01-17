

import { Ship, NPC, Projectile } from '../types';
import { effectsService } from './effectsService';
import { audioService } from './audioService';
import { playerShipService } from './playerShipService';
import { aiService } from './aiService';
import { salvageService } from './SalvageService';
import { missionService } from './missionService';

export interface DamageResult {
    targetId: string;
    destroyed: boolean;
    damage: number;
    isPlayer: boolean;
}

class DamageService {
    private destructionSubscribers: ((result: DamageResult) => void)[] = [];
    
    // We need to know the current system ID to pass to mission service.
    // Ideally this service shouldn't know about 'system', but for this prototype integration:
    private currentSystemId: number = 0;

    public setCurrentSystemId(id: number) {
        this.currentSystemId = id;
    }

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
        let actualTarget = target;

        // Fetch latest state if NPC to prevent stale closures/references
        if (!isPlayer) {
            const freshNpc = aiService.getNpcs().find(n => n.id === target.id);
            if (freshNpc) {
                actualTarget = freshNpc;
            }
        } else {
             // For player, get latest state
             actualTarget = playerShipService.getShip();
        }

        let currentHull = actualTarget.hull;
        let currentShields = actualTarget.shields;
        const maxShields = actualTarget.maxShields;
        
        // Visuals
        if (currentShields > 0) {
            effectsService.createShieldImpact(actualTarget.position, 0);
        } else {
            effectsService.createHullImpact(actualTarget.position);
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
            const npc = actualTarget as NPC;
            let newAiState = npc.aiState;
            let newTargetId = npc.targetId;

            // AI Reaction
            if (projectile.ownerId === playerShipService.getShip().id) {
                if (npc.type === 'Pirate' || npc.type === 'Police') {
                    newAiState = 'DOGFIGHT';
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

        const result: DamageResult = { targetId: actualTarget.id, destroyed: false, damage, isPlayer };

        // Destruction Check
        if (currentHull <= 0) {
            effectsService.createExplosion(actualTarget.position, 'large');
            audioService.playExplosionSound();
            
            if (!isPlayer) {
                salvageService.spawnSalvage(actualTarget.position, { 
                    name: 'Scrap Metal', 
                    quantity: Math.ceil(Math.random() * 5), 
                    weight: 1 
                });
                aiService.removeNpc(actualTarget.id);
                // Notify Mission Service
                missionService.onNpcDestroyed(actualTarget as NPC, this.currentSystemId);
            }
            
            result.destroyed = true;
            this.notifyDestruction(result);
        }

        return result;
    }
}

export const damageService = new DamageService();