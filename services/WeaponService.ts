
import { Ship } from '../types';
import { playerShipService } from './playerShipService';
import { physicsService3D } from './physicsService3D';
import { audioService } from './audioService';
import * as THREE from 'three';

class WeaponService {
    private cooldowns = new Map<string, number>(); // slotIndex -> cooldown remaining

    public update(deltaTime: number) {
        this.cooldowns.forEach((time, key) => {
            if (time > 0) {
                this.cooldowns.set(key, Math.max(0, time - deltaTime));
            }
        });
    }

    public firePlayerWeapons(direction?: THREE.Vector3) {
        const ship = playerShipService.getShip();
        
        // Filter for equipped weapons
        const weaponSlots = ship.slots.map((slot, index) => ({ slot, index }))
            .filter(({ slot }) => slot.type === 'Hardpoint' && slot.equippedItem?.category === 'Weapon');

        if (weaponSlots.length === 0) return;

        // Calculate total energy needed
        const totalEnergyCost = weaponSlots.reduce((acc, { slot }) => acc + (slot.equippedItem?.powerDraw || 0), 0);
        
        if (ship.energy < totalEnergyCost) {
            // TODO: Play empty click sound?
            return;
        }

        let fired = false;
        
        weaponSlots.forEach(({ slot, index }) => {
            const cooldownKey = `player-${index}`;
            if ((this.cooldowns.get(cooldownKey) || 0) <= 0) {
                const damage = slot.equippedItem?.stats?.damage || 0;
                // Default projectile speed if not specified
                const speed = 800; 
                
                physicsService3D.fireProjectile(ship.id, damage, speed, 'laser', undefined, direction);
                
                // Determine fire rate (shots per second). Default to 1.
                const rate = slot.equippedItem?.stats?.rate || 2; 
                const delay = rate > 0 ? 1 / rate : 0.5;
                
                this.cooldowns.set(cooldownKey, delay);
                fired = true;
            }
        });

        if (fired) {
            playerShipService.useEnergy(totalEnergyCost);
            audioService.playLaserSound();
        }
    }
}

export const weaponService = new WeaponService();
