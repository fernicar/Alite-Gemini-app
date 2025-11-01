import { VisualEffect } from '../types';

class EffectsService {
    private effects: VisualEffect[] = [];
    private subscribers: (() => void)[] = [];
    private effectCounter = 0;

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    public getEffects(): VisualEffect[] {
        return this.effects;
    }

    public createExplosion(position: { x: number; y: number }, size: 'small' | 'large') {
        const id = `effect-${this.effectCounter++}`;
        const maxLife = size === 'large' ? 1000 : 300;
        const maxSize = size === 'large' ? 100 : 20;

        const newEffect: VisualEffect = {
            id,
            type: 'explosion',
            position,
            size: 0,
            maxSize,
            remainingLife: maxLife,
            maxLife: maxLife,
        };
        this.effects.push(newEffect);
        this.notify();
    }

    public update(deltaTime: number) {
        let changed = false;
        if (this.effects.length > 0) {
            changed = true;
        }

        this.effects.forEach(effect => {
            effect.remainingLife -= deltaTime;
            if (effect.type === 'explosion') {
                const lifeProgress = 1 - (effect.remainingLife / effect.maxLife);
                effect.size = effect.maxSize * lifeProgress;
            }
        });

        const newEffects = this.effects.filter(effect => effect.remainingLife > 0);
        if (newEffects.length !== this.effects.length) {
            changed = true;
        }

        this.effects = newEffects;
        
        if (changed) {
            this.notify();
        }
    }
}

export const effectsService = new EffectsService();