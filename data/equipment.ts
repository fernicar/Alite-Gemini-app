import { EquipmentItem } from '../types';

export const EQUIPMENT_LIST: EquipmentItem[] = [
    // Weapons
    {
        id: '1E_PulseLaser', name: '1E Pulse Laser', category: 'Weapon', class: 1, rating: 'E',
        price: 2500, mass: 2, powerDraw: 4, compatibleSlotTypes: ['Hardpoint'],
        stats: { damage: 10 }
    },
    {
        id: '1E_BeamLaser', name: '1E Beam Laser', category: 'Weapon', class: 1, rating: 'E',
        price: 7500, mass: 3, powerDraw: 11, compatibleSlotTypes: ['Hardpoint'],
        stats: { damage: 18 }
    },
    // Core
    {
        id: '2E_PowerPlant', name: '2E Power Plant', category: 'Core', class: 2, rating: 'E',
        price: 2600, mass: 2.5, powerDraw: -9.6, compatibleSlotTypes: ['CoreInternal'],
        stats: { powerGenerated: 9.6 }
    },
    {
        id: '3E_Thrusters', name: '3E Thrusters', category: 'Core', class: 3, rating: 'E',
        price: 8000, mass: 8, powerDraw: 3.0, compatibleSlotTypes: ['CoreInternal'],
        stats: {}
    },
    {
        id: '3E_FSD', name: '3E Frame Shift Drive', category: 'Core', class: 3, rating: 'E',
        price: 12000, mass: 5, powerDraw: 0.5, compatibleSlotTypes: ['CoreInternal'],
        stats: {}
    },
    {
        id: '4E_PowerPlant', name: '4E Power Plant', category: 'Core', class: 4, rating: 'E',
        price: 26200, mass: 10, powerDraw: -12.8, compatibleSlotTypes: ['CoreInternal'],
        stats: { powerGenerated: 12.8 }
    },
    {
        id: '3E_ShieldGen', name: '3E Shield Generator', category: 'Core', class: 3, rating: 'E',
        price: 9000, mass: 8, powerDraw: 2.0, compatibleSlotTypes: ['CoreInternal', 'OptionalInternal'],
        stats: { shieldStrength: 100 }
    },
    {
        id: '4E_ShieldGen', name: '4E Shield Generator', category: 'Core', class: 4, rating: 'E',
        price: 28000, mass: 10, powerDraw: 2.5, compatibleSlotTypes: ['CoreInternal', 'OptionalInternal'],
        stats: { shieldStrength: 120 }
    },
    // Optional
    {
        id: '1E_CargoRack', name: '1E Cargo Rack', category: 'Optional', class: 1, rating: 'E',
        price: 1000, mass: 2, powerDraw: 0, compatibleSlotTypes: ['OptionalInternal'],
        stats: { cargoIncrease: 2 }
    },
    {
        id: '2E_CargoRack', name: '2E Cargo Rack', category: 'Optional', class: 2, rating: 'E',
        price: 2000, mass: 4, powerDraw: 0, compatibleSlotTypes: ['OptionalInternal'],
        stats: { cargoIncrease: 4 }
    },
    {
        id: '3E_CargoRack', name: '3E Cargo Rack', category: 'Optional', class: 3, rating: 'E',
        price: 4000, mass: 8, powerDraw: 0, compatibleSlotTypes: ['OptionalInternal'],
        stats: { cargoIncrease: 8 }
    },
    {
        id: '4E_CargoRack', name: '4E Cargo Rack', category: 'Optional', class: 4, rating: 'E',
        price: 8000, mass: 16, powerDraw: 0, compatibleSlotTypes: ['OptionalInternal'],
        stats: { cargoIncrease: 16 }
    },
];