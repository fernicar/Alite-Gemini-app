
import { StarSystem } from '../types';

export const GALAXY_WIDTH = 800;
export const GALAXY_HEIGHT = 600;
export const GALAXY_SYSTEMS = 256;
const MIN_SYSTEM_DISTANCE = 35;

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Simple LCG
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

const SYLLABLES: readonly string[] = [
    'Ar', 'Be', 'Ce', 'De', 'Er', 'Fa', 'Ga', 'Ha', 'Ir', 'Ja', 'Ka', 'La',
    'Ma', 'Na', 'Or', 'Pa', 'Qu', 'Ra', 'Sa', 'Ta', 'Ur', 'Va', 'Wa', 'Xe',
    'Ya', 'Ze', 'An', 'En', 'In', 'On', 'Un', 'Is'
];

const SPECIAL_NAMES: readonly string[] = [
    'Lave', 'Riedquat', 'Zaeal', 'Bleeape', 'Rirri', 'Qerris', 'Ceeradi', 
    'Orarra', 'Inst', 'Our', 'Rusar', 'Errius', 'Cebe', 'Sosole', 'Veques',
    'Cxeus', 'Zebes', 'Orrer', 'Orrela', 'Agen', 'Diso', 'Loras', 'Ryx', 
    'Betrius', 'Zedenu', 'Oresr', 'Orutte', 'Zaonce', 'Ortrex', 'Rasalip'
];

const ECONOMY_TYPES: StarSystem['economy'][] = ['Industrial', 'Agricultural', 'Mining', 'High-Tech', 'Refinery', 'Tourism'];
const GOVERNMENT_TYPES: StarSystem['government'][] = ['Anarchy', 'Feudal', 'Corporate', 'Democracy', 'Alliance'];

class GalaxyGenerator {
    private random: SeededRandom;
    private specialNameIndex = 0;

    constructor(seed: number) {
        this.random = new SeededRandom(seed);
    }

    private generateSystemName(systemId: number): string {
        const specialSystemIndices = [7, 17, 30, 45, 62, 80, 99, 119, 140, 162, 185, 209, 234, 250, 255];
        if (specialSystemIndices.includes(systemId) && this.specialNameIndex < SPECIAL_NAMES.length) {
            return SPECIAL_NAMES[this.specialNameIndex++];
        }

        const syllableCount = this.random.nextInt(2, 3);
        let name = '';
        for (let i = 0; i < syllableCount; i++) {
            name += this.random.choice(SYLLABLES);
        }
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    
    private generateSystemDescription(name: string, economy: string, government: string): string {
        const descriptions = [
            `The ${name} system is a bustling ${economy.toLowerCase()} hub under a ${government.toLowerCase()} government.`,
            `${name} is known for its strong ${economy.toLowerCase()} sector, overseen by a ${government.toLowerCase()} council.`,
            `A quiet system, ${name} focuses on its ${economy.toLowerCase()} industry within a ${government.toLowerCase()} framework.`
        ];
        return this.random.choice(descriptions);
    }

    private generateTechLevel(economy: StarSystem['economy'], government: StarSystem['government']): number {
        let baseTechLevel = 5;
        
        switch (economy) {
          case 'High-Tech': baseTechLevel += 4; break;
          case 'Industrial': baseTechLevel += 2; break;
          case 'Refinery': baseTechLevel += 1; break;
          case 'Tourism': baseTechLevel += 0; break;
          case 'Mining': baseTechLevel -= 1; break;
          case 'Agricultural': baseTechLevel -= 2; break;
        }

        switch (government) {
            case 'Corporate':
            case 'Democracy':
                baseTechLevel += 2; break;
            case 'Alliance':
                baseTechLevel += 1; break;
            case 'Feudal':
                baseTechLevel -= 1; break;
            case 'Anarchy':
                baseTechLevel -= 3; break;
        }

        return Math.max(1, Math.min(15, baseTechLevel + this.random.nextInt(-2, 2)));
    }

    private generatePopulation(techLevel: number): number {
        const basePop = Math.pow(techLevel, 2) * 10000;
        return Math.floor(basePop * (this.random.next() * 1.5 + 0.5));
    }

    public generate(): StarSystem[] {
        const systems: StarSystem[] = [];
        const positions: {x: number, y: number}[] = [];

        for (let i = 0; i < GALAXY_SYSTEMS; i++) {
            let x, y, tooClose;
            let attempts = 0;
            do {
                tooClose = false;
                x = this.random.nextInt(20, GALAXY_WIDTH - 20);
                y = this.random.nextInt(20, GALAXY_HEIGHT - 20);

                for(const pos of positions) {
                    const distance = Math.sqrt((pos.x - x)**2 + (pos.y - y)**2);
                    if (distance < MIN_SYSTEM_DISTANCE) {
                        tooClose = true;
                        break;
                    }
                }
                attempts++;
            } while (tooClose && attempts < 100);

            positions.push({x, y});

            const name = this.generateSystemName(i);
            const economy = this.random.choice(ECONOMY_TYPES);
            const government = this.random.choice(GOVERNMENT_TYPES);
            const description = this.generateSystemDescription(name, economy, government);
            const techLevel = this.generateTechLevel(economy, government);
            const population = this.generatePopulation(techLevel);
            
            systems.push({
                id: i,
                name,
                x,
                y,
                economy,
                government,
                description,
                techLevel,
                population,
            });
        }
        return systems;
    }
}

let galaxyCache: StarSystem[] | null = null;

export const getGalaxy = (seed: number = 42): StarSystem[] => {
    if (galaxyCache) {
        return galaxyCache;
    }
    const generator = new GalaxyGenerator(seed);
    galaxyCache = generator.generate();
    return galaxyCache;
};