

import { Ship } from '../types';
import { createInitialShip } from './shipService';
import { physicsService3D } from './physicsService3D';

class PlayerShipService {
    private ship: Ship = createInitialShip();
    private subscribers: (() => void)[] = [];

    constructor() {
        this.setShip(this.ship); // Initialize with physics properties
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

    public getShip(): Ship {
        return this.ship;
    }

    public setShip(newShip: Ship) {
        if (this.ship && this.ship.id) {
            const oldBody = physicsService3D.getShipBody();
            if (oldBody) {
                physicsService3D.removeBody(oldBody);
            }
        }
        
        physicsService3D.initializeShip(newShip);

        this.ship = newShip;
        this.updatePhysicsFromPips();
        this.notify();
    }

    private updatePhysicsFromPips() {
        if (!this.ship) return;
        const { eng } = this.ship.energyPips;
        // Pips effect: 0 pips = 75%, 2 pips = 100%, 4 pips = 125%
        const multiplier = 0.75 + (eng / 4) * 0.5;
        physicsService3D.updateShipPerformance({ topSpeedMultiplier: multiplier, turnRateMultiplier: multiplier });
    }

    public setEnergyPips(pips: { sys: number; eng: number; wep: number }) {
        if (this.ship.energyPips.sys !== pips.sys || this.ship.energyPips.eng !== pips.eng || this.ship.energyPips.wep !== pips.wep) {
            this.ship.energyPips = pips;
            this.updatePhysicsFromPips();
            this.notify();
        }
    }

    public handlePlayerInput(pressedKeys: Set<string>) {
        // This is handled by playerController3D now
    }

    public applyDamage(amount: number): { type: 'shield' | 'hull', newHull: number, newShields: number } {
        let newShields = this.ship.shields;
        let newHull = this.ship.hull;
        let damageType: 'shield' | 'hull' = 'hull';

        if (newShields > 0) {
            damageType = 'shield';
            const tempShields = newShields - amount;
            if (tempShields < 0) {
                newHull += tempShields; // spillover damage to hull
                newShields = 0;
            } else {
                newShields = tempShields;
            }
        } else {
            damageType = 'hull';
            newHull -= amount;
        }

        this.ship = {
            ...this.ship,
            shields: Math.max(0, newShields),
            hull: Math.max(0, newHull),
        };
        this.notify();
        
        return { type: damageType, newHull: this.ship.hull, newShields: this.ship.shields };
    }

    public rechargeSystems(deltaTime: number) {
        const { sys, wep } = this.ship.energyPips;
        let { shields, energy } = this.ship;

        // Do nothing if maxed out and no changes needed
        if (shields >= this.ship.maxShields && energy >= this.ship.maxEnergy) {
            return;
        }
        
        // SYS pips recharge shields, WEP pips recharge weapon capacitor (energy)
        const baseShieldRecharge = this.ship.maxShields / 60; // Full recharge in 60s at 2 pips
        const baseEnergyRecharge = this.ship.maxEnergy / 15; // Full recharge in 15s at 2 pips

        const shieldRechargeRate = (sys / 2) * baseShieldRecharge;
        const energyRechargeRate = (wep / 2) * baseEnergyRecharge;

        const newShields = Math.min(this.ship.maxShields, shields + shieldRechargeRate * deltaTime);
        const newEnergy = Math.min(this.ship.maxEnergy, energy + energyRechargeRate * deltaTime);

        if (newShields !== shields || newEnergy !== energy) {
            this.ship.shields = newShields;
            this.ship.energy = newEnergy;
            this.notify();
        }
    }

    public useEnergy(amount: number) {
        this.ship = {
            ...this.ship,
            energy: Math.max(0, this.ship.energy - amount)
        };
        this.notify();
    }
}

export const playerShipService = new PlayerShipService();