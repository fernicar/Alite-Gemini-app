

import { Ship, ShipForSale, ShipSlot, EquipmentItem } from '../types';
import { calculateShipStats, createShipFromSpec } from './shipService';
import { playerShipService } from './playerShipService';
import { SHIPS_FOR_SALE } from '../data/ships';

class ShipyardService {
    public purchaseShip(shipToBuy: ShipForSale): { success: boolean, error?: string } {
        const currentShip = playerShipService.getShip();
        const tradeInValue = Math.round(currentShip.basePrice * 0.7);
        const cargoValue = currentShip.cargo.reduce((acc, item) => acc + (item.quantity * item.weight * 50), 0); // Avg 50cr/T
        const finalCost = shipToBuy.price - tradeInValue - cargoValue;

        if (currentShip.credits < finalCost) {
            return { success: false, error: "Insufficient credits for this transaction." };
        }

        const newShip = createShipFromSpec(shipToBuy.type, shipToBuy.type, currentShip.credits - finalCost);
        
        // Carry over non-ship-specific properties like position
        newShip.position = currentShip.position;
        newShip.velocity = { x: 0, y: 0, z: 0 };
        newShip.angle = 0;

        playerShipService.setShip(newShip);

        return { success: true };
    }

    public equipModule(slot: ShipSlot, itemToEquip: EquipmentItem): { success: boolean, error?: string } {
        const currentShip = playerShipService.getShip();
        const currentItem = slot.equippedItem;
        const priceDifference = itemToEquip.price - (currentItem?.price ? Math.round(currentItem.price * 0.9) : 0); // Sell current item at 90%

        if (currentShip.credits < priceDifference) {
            return { success: false, error: "Insufficient credits." };
        }

        const newSlots = currentShip.slots.map(s => {
            if (s === slot) { // Simple object reference check
                return { ...s, equippedItem: itemToEquip };
            }
            return s;
        });

        const shipSpec = this.getShipSpec(currentShip.type);
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

        playerShipService.setShip(newShip);

        return { success: true };
    }

    public sellModule(slot: ShipSlot): { success: boolean, error?: string } {
        const currentShip = playerShipService.getShip();
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
        
        const shipSpec = this.getShipSpec(currentShip.type);
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
        
        playerShipService.setShip(newShip);
        
        return { success: true };
    }

    private getShipSpec(type: string) {
        const saleInfo = SHIPS_FOR_SALE.find((s: ShipForSale) => s.type === type);
        return saleInfo?.spec;
    }
}

export const shipyardService = new ShipyardService();