import { Ship, ShipSlot, ShipSpec, EquipmentItem } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import { EQUIPMENT_LIST } from '../data/equipment';

// A pure function to calculate ship stats based on its spec and slots.
export const calculateShipStats = (spec: ShipSpec, slots: ShipSlot[]): {
    maxHull: number;
    maxShields: number;
    maxEnergy: number;
    cargoCapacity: number;
} => {
    const powerPlant = slots.find(s => s.equippedItem?.category === 'Core' && s.equippedItem.name.includes('Power Plant'))?.equippedItem;
    const shieldGen = slots.find(s => s.equippedItem?.stats?.shieldStrength)?.equippedItem;
    
    const cargoIncrease = slots
        .map(s => s.equippedItem?.stats?.cargoIncrease || 0)
        .reduce((sum, increase) => sum + increase, 0);

    const maxEnergy = powerPlant?.stats?.powerGenerated || spec.maxEnergy;
    const maxShields = shieldGen?.stats?.shieldStrength || spec.shields;
    const cargoCapacity = spec.cargoCapacity + cargoIncrease;
    const maxHull = spec.hull;

    return { maxHull, maxShields, maxEnergy, cargoCapacity };
};


// Function to create a ship from a spec, with default equipment.
export const createShipFromSpec = (type: string, name: string, credits: number): Ship => {
    const shipSpecData = SHIPS_FOR_SALE.find(s => s.type === type);
    if (!shipSpecData) {
        throw new Error(`Could not find ship spec for '${type}'`);
    }
    const spec = shipSpecData.spec;

    // Create empty slots
    const equippedSlots: ShipSlot[] = spec.slots.map(s => ({ ...s, equippedItem: null }));

    // Equip default E-rated core internals
    for (const slot of equippedSlots) {
        // Equip a Power Plant if one isn't equipped yet
        const hasPP = equippedSlots.some(s => s.equippedItem?.id.endsWith('PowerPlant'));
        if (!hasPP && slot.type === 'CoreInternal' && !slot.equippedItem) {
            const defaultPP = EQUIPMENT_LIST.find(e => e.id.endsWith('PowerPlant') && e.class <= slot.size && e.rating === 'E');
            if (defaultPP) {
                 slot.equippedItem = defaultPP;
                 continue; // Move to next slot
            }
        }
        
        // Equip a Shield Generator if one isn't equipped yet
        const hasShield = equippedSlots.some(s => s.equippedItem?.id.endsWith('ShieldGen'));
        if (!hasShield && (slot.type === 'OptionalInternal' || slot.type === 'CoreInternal') && !slot.equippedItem) {
            const defaultSG = EQUIPMENT_LIST.find(e => e.id.endsWith('ShieldGen') && e.class <= slot.size && e.rating === 'E');
            if (defaultSG) {
                slot.equippedItem = defaultSG;
                continue; // Move to next slot
            }
        }
    }
    
    // Equip default lasers on empty hardpoints
    for (const slot of equippedSlots) {
        if (slot.type === 'Hardpoint' && !slot.equippedItem) {
            const defaultLaser = EQUIPMENT_LIST.find(e => e.id.endsWith('PulseLaser') && e.class <= slot.size && e.rating === 'E');
            if(defaultLaser) {
                slot.equippedItem = defaultLaser;
            }
        }
    }


    // Recalculate stats based on equipped modules
    const { maxHull, maxShields, maxEnergy, cargoCapacity } = calculateShipStats(spec, equippedSlots);
    
    return {
        // FIX: Added missing 'id' property to conform to the 'Ship' type.
        id: `player-${Date.now()}`,
        name: name,
        type: type,
        hull: maxHull,
        maxHull: maxHull,
        shields: maxShields,
        maxShields: maxShields,
        fuel: spec.maxFuel,
        maxFuel: spec.maxFuel,
        energy: maxEnergy,
        maxEnergy: maxEnergy,
        cargoCapacity: cargoCapacity,
        cargo: [],
        credits: credits,
        basePrice: spec.basePrice,
        slots: equippedSlots,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angle: 0,
        energyPips: { sys: 2, eng: 2, wep: 2 },
        // FIX: Add missing properties `missiles` and `maxMissiles` to conform to the Ship type.
        missiles: spec.maxMissiles || 0,
        maxMissiles: spec.maxMissiles || 0,
    };
}


// The initial ship creation logic, moved from App.tsx.
export const createInitialShip = (): Ship => {
    const initialShip = createShipFromSpec('Cobra Mk III', 'Stardust Drifter', 5000);
    // Add starting cargo for the player
    initialShip.cargo = [
        { name: 'Food Rations', quantity: 5, weight: 1 },
        { name: 'Machine Parts', quantity: 2, weight: 5 },
    ];
    return initialShip;
};