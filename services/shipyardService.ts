
import { Ship, ShipForSale, ShipSlot, EquipmentItem, ShipSpec } from '../types';
import { calculateShipStats, createShipFromSpec } from './shipService';
import { SHIPS_FOR_SALE } from '../data/ships';

class ShipyardService {
    public purchaseShip(currentShip: Ship, shipToBuy: ShipForSale): { success: boolean, newShip?: Ship, error?: string } {
        const tradeInValue = Math.round(currentShip.basePrice * 0.7);
        const cargoValue = currentShip.cargo.reduce((acc, item) => acc + (item.quantity * item.weight * 50), 0); // Avg 50cr/T
        const finalCost = shipToBuy.price - tradeInValue - cargoValue;

        if (currentShip.credits < finalCost) {
            return { success: false, error: "Insufficient credits for this transaction." };
        }

        const newShip = createShipFromSpec(shipToBuy.type, shipToBuy.type, currentShip.credits - finalCost);
        
        // Carry over non-ship-specific properties like position
        newShip.position = currentShip.position;
        newShip.velocity = { x: 0, y: 0 };
        newShip.angle = 0;


        return { success: true, newShip: newShip };
    }

    public equipModule(currentShip: Ship, slot: ShipSlot, itemToEquip: EquipmentItem): { success: boolean, newShip?: Ship, error?: string } {
        const currentItem = slot.equippedItem;
        const priceDifference = itemToEquip.price - (currentItem?.price ? Math.round(currentItem.price * 0.9) : 0); // Sell current item at 90%

        if (currentShip.credits < priceDifference) {
            return { success: false, error: "Insufficient credits." };
        }

        const newSlots = currentShip.slots.map(s => {
            // This is a naive way to find the slot, but works for this structure
            // In a more complex app, slots might need unique IDs
            if (s.type === slot.type && s.size === slot.size && s.equippedItem === slot.equippedItem) {
                return { ...s, equippedItem: itemToEquip };
            }
            return s;
        });

        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === currentShip.type)?.spec;
        if (!shipSpec) {
            return { success: false, error: "Could not find current ship specifications." };
        }

        const newStats = calculateShipStats(shipSpec, newSlots);

        const newShip: Ship = {
            ...currentShip,
            credits: currentShip.credits - priceDifference,
            slots: newSlots,
            maxShields: newStats.maxShields,
            cargoCapacity: newStats.cargoCapacity,
            maxEnergy: newStats.maxEnergy,
            shields: Math.min(currentShip.shields, newStats.maxShields),
            energy: Math.min(currentShip.energy, newStats.maxEnergy),
        };

        return { success: true, newShip: newShip };
    }

    public sellModule(currentShip: Ship, slot: ShipSlot): { success: boolean, newShip?: Ship, error?: string } {
        if (!slot.equippedItem) {
            return { success: false, error: "Slot is already empty." };
        }

        const itemToSell = slot.equippedItem;
        const sellPrice = Math.round(itemToSell.price * 0.9); // Sell for 90% of value

        const newSlots = currentShip.slots.map(s => {
            if (s === slot) {
                return { ...s, equippedItem: null };
            }
            return s;
        });

        const shipSpec = SHIPS_FOR_SALE.find(s => s.type === currentShip.type)?.spec;
        if (!shipSpec) {
            return { success: false, error: "Could not find current ship specifications." };
        }

        const newStats = calculateShipStats(shipSpec, newSlots);

        const newShip: Ship = {
            ...currentShip,
            credits: currentShip.credits + sellPrice,
            slots: newSlots,
            maxShields: newStats.maxShields,
            cargoCapacity: newStats.cargoCapacity,
            maxEnergy: newStats.maxEnergy,
            shields: Math.min(currentShip.shields, newStats.maxShields),
            energy: Math.min(currentShip.energy, newStats.maxEnergy),
        };
        
        return { success: true, newShip: newShip };
    }
}

export const shipyardService = new ShipyardService();
