
import { Ship, PhysicsState } from '../types';
import { createInitialShip } from './shipFactory';
import { physicsService } from './physicsService';
import { SHIPS_FOR_SALE } from '../data/ships';

class PlayerShipService {
    private ship: Ship = createInitialShip();
    private subscribers: (() => void)[] = [];

    constructor() {
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === this.ship.type)?.spec;
        if (shipSpec) {
             // FIX: The second argument to registerObject requires the 'id' property.
             physicsService.registerObject(this.ship.id, {
                id: this.ship.id,
                position: this.ship.position,
                velocity: this.ship.velocity,
                angle: this.ship.angle,
                mass: shipSpec.mass,
                maxSpeed: shipSpec.speed / 50, // Scale for game units
                turnRate: shipSpec.turnRate,
            });
        }

        physicsService.subscribe(() => {
            const state = physicsService.getObjectState(this.ship.id);
            if (state) {
                if(this.ship.position.x !== state.position.x || this.ship.position.y !== state.position.y || this.ship.angle !== state.angle) {
                    this.ship.position = state.position;
                    this.ship.velocity = state.velocity;
                    this.ship.angle = state.angle;
                    this.notify();
                }
            }
        });
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
        physicsService.removeObject(this.ship.id);
        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === newShip.type)?.spec;
        if (shipSpec) {
            // FIX: The second argument to registerObject requires the 'id' property.
            physicsService.registerObject(newShip.id, {
                id: newShip.id,
                position: newShip.position,
                velocity: newShip.velocity,
                angle: newShip.angle,
                mass: shipSpec.mass,
                maxSpeed: shipSpec.speed / 50,
                turnRate: shipSpec.turnRate,
            });
        }
        this.ship = newShip;
        this.notify();
    }

    public handlePlayerInput(pressedKeys: Set<string>) {
        let turn = 0;
        let thrust = 0;

        if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) turn = -1;
        if (pressedKeys.has('d') || pressedKeys.has('arrowright')) turn = 1;
        
        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
            thrust = 1;
        }
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
            thrust = -0.5; // less reverse thrust
        }

        physicsService.applyTurn(this.ship.id, turn);
        physicsService.applyThrust(this.ship.id, thrust);
    }

    public applyDamage(amount: number) {
        let newShields = this.ship.shields;
        let newHull = this.ship.hull;

        const tempShields = newShields - amount;
        if (tempShields < 0) {
            newHull += tempShields;
            newShields = 0;
        } else {
            newShields = tempShields;
        }

        this.setShip({
            ...this.ship,
            shields: newShields,
            hull: newHull,
        });
    }

    public rechargeSystems() {
        let { shields, energy } = this.ship;
        
        // --- Shield and Energy Recharge ---
        shields = Math.min(this.ship.maxShields, shields + (this.ship.maxShields / 200));
        energy = Math.min(this.ship.maxEnergy, energy + (this.ship.maxEnergy / 100));

        if (shields !== this.ship.shields || energy !== this.ship.energy) {
            this.ship = {
                ...this.ship,
                shields,
                energy,
            };
            this.notify();
        }
    }

    public useEnergy(amount: number) {
        this.setShip({
            ...this.ship,
            energy: this.ship.energy - amount
        });
    }
}

export const playerShipService = new PlayerShipService();