
import { Salvage, CargoItem } from '../types';

class SalvageService {
    private salvage: Salvage[] = [];
    private subscribers: (() => void)[] = [];
    private salvageCounter = 0;

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    public getSalvage(): Salvage[] {
        return this.salvage;
    }

    public spawnSalvage(position: { x: number; y: number; z: number }, contents: CargoItem) {
        const id = `salvage-${this.salvageCounter++}`;
        const newSalvage: Salvage = {
            id,
            contents,
            position
        };
        this.salvage.push(newSalvage);
        this.notify();
    }

    public removeSalvage(id: string) {
        this.salvage = this.salvage.filter(s => s.id !== id);
        this.notify();
    }
    
    public clearSalvage() {
        this.salvage = [];
        this.notify();
    }
}

export const salvageService = new SalvageService();
