
import { PhysicsState } from '../types';

const DRAG = 0.98; // a constant drag factor to slow ships down over time

class PhysicsService {
    private objects = new Map<string, PhysicsState>();
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

    public registerObject(id: string, initialState: Omit<PhysicsState, 'thrust' | 'turn' | 'angularVelocity'>) {
        this.objects.set(id, {
            ...initialState,
            thrust: 0,
            turn: 0,
            angularVelocity: 0,
        });
    }
    
    public updateObjectState(id: string, updates: Partial<PhysicsState>) {
        const object = this.objects.get(id);
        if (object) {
            this.objects.set(id, { ...object, ...updates });
        }
    }

    public removeObject(id: string) {
        this.objects.delete(id);
    }

    public applyThrust(id: string, thrust: number) {
        const object = this.objects.get(id);
        if (object) {
            object.thrust = thrust;
        }
    }

    public applyTurn(id: string, turn: number) {
        const object = this.objects.get(id);
        if (object) {
            object.turn = turn;
        }
    }

    public getObjectState(id: string): PhysicsState | undefined {
        return this.objects.get(id);
    }

    public getAllObjectStates(): Map<string, PhysicsState> {
        return this.objects;
    }

    public update(deltaTime: number) {
        this.objects.forEach((obj, id) => {
            // Rotational physics
            obj.angularVelocity = obj.turn * obj.turnRate;
            obj.angle += obj.angularVelocity * deltaTime;
            obj.angle = obj.angle % 360;

            // Translational physics
            const radians = (obj.angle - 90) * (Math.PI / 180);
            const acceleration = {
                x: Math.cos(radians) * obj.thrust * 0.1, // using a fixed thrust power for now
                y: Math.sin(radians) * obj.thrust * 0.1,
            };

            obj.velocity.x += acceleration.x / obj.mass;
            obj.velocity.y += acceleration.y / obj.mass;

            // Apply drag
            obj.velocity.x *= DRAG;
            obj.velocity.y *= DRAG;

            // Clamp to max speed
            const speed = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
            if (speed > obj.maxSpeed) {
                obj.velocity.x = (obj.velocity.x / speed) * obj.maxSpeed;
                obj.velocity.y = (obj.velocity.y / speed) * obj.maxSpeed;
            }

            // Update position
            obj.position.x += obj.velocity.x;
            obj.position.y += obj.velocity.y;
        });

        this.notify();
    }
}

export const physicsService = new PhysicsService();