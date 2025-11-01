import { Projectile, Ship, NPC } from '../types';
import { combatCoordinator } from './combatCoordinator';
import { effectsService } from './effectsService';

const PROJECTILE_SPEED = 15; // units per game tick
const PROJECTILE_LIFESPAN = 1500; // ms

class ProjectileService {
    private projectiles: Projectile[] = [];
    private subscribers: (() => void)[] = [];
    private projectileCounter = 0;

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    public getProjectiles(): Projectile[] {
        return this.projectiles;
    }

    public createProjectile(ownerId: string, startPos: { x: number; y: number }, angle: number, damage: number) {
        const id = `proj-${this.projectileCounter++}`;
        const radians = (angle - 90) * (Math.PI / 180);
        const velocity = {
            x: Math.cos(radians) * PROJECTILE_SPEED,
            y: Math.sin(radians) * PROJECTILE_SPEED,
        };

        const newProjectile: Projectile = {
            id,
            ownerId,
            position: startPos,
            velocity,
            angle,
            type: 'laser',
            damage,
            remainingLife: PROJECTILE_LIFESPAN,
        };
        this.projectiles.push(newProjectile);
        this.notify();
    }

    public update(deltaTime: number, allShips: (Ship | NPC)[]) {
        let changed = false;
        const hits: { projectile: Projectile; target: Ship | NPC }[] = [];

        this.projectiles.forEach(p => {
            p.position.x += p.velocity.x;
            p.position.y += p.velocity.y;
            p.remainingLife -= deltaTime;

            for (const ship of allShips) {
                if (p.ownerId === ship.id) continue; // Can't hit owner

                const distance = Math.sqrt((p.position.x - ship.position.x)**2 + (p.position.y - ship.position.y)**2);
                const shipRadius = 20; // Generic radius for now
                if (distance < shipRadius) {
                    hits.push({ projectile: p, target: ship });
                }
            }
        });

        if (hits.length > 0) {
            hits.forEach(hit => {
                combatCoordinator.applyHit(hit.target.id, hit.projectile.damage);
                effectsService.createExplosion(hit.projectile.position, 'small');
                // Mark projectile for removal by setting life to 0
                hit.projectile.remainingLife = 0;
            });
        }
        
        const newProjectiles = this.projectiles.filter(p => p.remainingLife > 0);

        if (newProjectiles.length !== this.projectiles.length || this.projectiles.length > 0) {
            changed = true;
        }

        this.projectiles = newProjectiles;

        if (changed) {
            this.notify();
        }
    }
}

export const projectileService = new ProjectileService();