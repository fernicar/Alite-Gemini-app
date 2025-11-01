
import { Ship } from '../types';
import { createInitialShip } from './shipService';

const THRUST = 0.1;
const TURN_RATE = 3;
const MAX_VELOCITY = 5;
const DRAG = 0.99;

class PlayerShipService {
    private ship: Ship = createInitialShip();
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

    public getShip(): Ship {
        return this.ship;
    }

    public setShip(newShip: Ship) {
        this.ship = newShip;
        this.notify();
    }

    public updateShip(pressedKeys: Set<string>, damageToPlayer: number) {
        let newAngle = this.ship.angle;
        let newVelocity = { ...this.ship.velocity };
        let newPosition = { ...this.ship.position };
        let newShields = this.ship.shields;
        let newHull = this.ship.hull;
        let newEnergy = this.ship.energy;

        // --- Player Movement ---
        if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) newAngle -= TURN_RATE;
        if (pressedKeys.has('d') || pressedKeys.has('arrowright')) newAngle += TURN_RATE;
        
        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
            const radians = (newAngle - 90) * (Math.PI / 180);
            newVelocity.x += Math.cos(radians) * THRUST;
            newVelocity.y += Math.sin(radians) * THRUST;
        }
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
            newVelocity.x *= 0.95;
            newVelocity.y *= 0.95;
        }
        newVelocity.x *= DRAG;
        newVelocity.y *= DRAG;

        const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2);
        if (speed > MAX_VELOCITY) {
            newVelocity.x = (newVelocity.x / speed) * MAX_VELOCITY;
            newVelocity.y = (newVelocity.y / speed) * MAX_VELOCITY;
        }

        newPosition.x += newVelocity.x;
        newPosition.y += newVelocity.y;
        
        // --- Damage Application ---
        if (damageToPlayer > 0) {
            const tempShields = newShields - damageToPlayer;
            if (tempShields < 0) {
                newHull += tempShields;
                newShields = 0;
            } else {
                newShields = tempShields;
            }
        }

        // --- Shield and Energy Recharge ---
        newShields = Math.min(this.ship.maxShields, newShields + (this.ship.maxShields / 200));
        newEnergy = Math.min(this.ship.maxEnergy, newEnergy + (this.ship.maxEnergy / 100));

        this.ship = {
            ...this.ship,
            angle: newAngle,
            velocity: newVelocity,
            position: newPosition,
            shields: newShields,
            hull: newHull,
            energy: newEnergy
        };
        this.notify();
    }

    public useEnergy(amount: number) {
        this.setShip({
            ...this.ship,
            energy: this.ship.energy - amount
        });
    }
}

export const playerShipService = new PlayerShipService();
