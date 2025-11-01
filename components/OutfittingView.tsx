import React, { useState, useMemo } from 'react';
import { Ship, StarSystem, ShipSlot, EquipmentItem, ShipSpec } from '../types';
import { EQUIPMENT_LIST } from '../data/equipment';
import { ShipStatusPanel } from './ShipStatusPanel';
import { SHIPS_FOR_SALE } from '../data/ships';

const OutfittingView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  setShip: React.Dispatch<React.SetStateAction<Ship>>;
  onReturnToStation: () => void;
}> = ({ currentSystem, ship, setShip, onReturnToStation }) => {
    const [selectedSlot, setSelectedSlot] = useState<ShipSlot | null>(null);

    const currentShipSpec = useMemo(() => {
        return SHIPS_FOR_SALE.find(s => s.type === ship.type)?.spec;
    }, [ship.type]);

    const availableEquipmentForSlot = useMemo(() => {
        if (!selectedSlot) return [];
        return EQUIPMENT_LIST.filter(item => 
            item.compatibleSlotTypes.includes(selectedSlot.type) &&
            item.class <= selectedSlot.size
        );
    }, [selectedSlot]);
    
    const recalculateShipStats = (newSlots: ShipSlot[], shipSpec: ShipSpec | undefined): Partial<Pick<Ship, 'maxShields' | 'cargoCapacity' | 'maxEnergy'>> => {
        const baseCargo = shipSpec?.cargoCapacity ?? 0;
        const baseShields = shipSpec?.shields ?? 0;
        const baseEnergy = shipSpec?.maxEnergy ?? 0;

        // Shield strength is determined by the best shield generator equipped, and does not stack.
        // If no shield generator is equipped, the ship's base shield strength is used.
        const shieldGenerators = newSlots
            .map(s => s.equippedItem)
            .filter((item): item is EquipmentItem => !!(item?.stats?.shieldStrength));
            
        const maxShieldStrength = shieldGenerators.reduce((max, sg) => Math.max(max, sg.stats!.shieldStrength!), 0);
        const maxShields = maxShieldStrength > 0 ? maxShieldStrength : baseShields;

        // Cargo capacity is the ship's base capacity plus any increases from cargo racks.
        const cargoIncrease = newSlots
            .map(s => s.equippedItem?.stats?.cargoIncrease || 0)
            .reduce((sum, increase) => sum + increase, 0);
        
        const cargoCapacity = baseCargo + cargoIncrease;
        
        // Max energy is determined by the best power plant equipped.
        const powerPlants = newSlots
            .map(s => s.equippedItem)
            .filter((item): item is EquipmentItem => !!(item?.stats?.powerGenerated));

        const maxPowerGenerated = powerPlants.reduce((max, pp) => Math.max(max, pp.stats!.powerGenerated!), 0);
        const maxEnergy = maxPowerGenerated > 0 ? maxPowerGenerated : baseEnergy;

        return { maxShields, cargoCapacity, maxEnergy };
    };

    const handleEquipItem = (itemToEquip: EquipmentItem) => {
        if (!selectedSlot) return;

        const currentItem = selectedSlot.equippedItem;
        const priceDifference = itemToEquip.price - (currentItem?.price || 0);

        if (ship.credits < priceDifference) {
            alert("Insufficient credits.");
            return;
        }

        setShip(prevShip => {
            const newSlots = prevShip.slots.map(s => {
                if (s === selectedSlot) {
                    return { ...s, equippedItem: itemToEquip };
                }
                return s;
            });

            const newStats = recalculateShipStats(newSlots, currentShipSpec);

            return {
                ...prevShip,
                credits: prevShip.credits - priceDifference,
                slots: newSlots,
                ...newStats,
                shields: Math.min(prevShip.shields, newStats.maxShields || 0), // Cap current shields to new max
                energy: Math.min(prevShip.energy, newStats.maxEnergy || 0), // Cap current energy
            };
        });
        setSelectedSlot(null);
    };

    const handleSellItem = () => {
        if (!selectedSlot || !selectedSlot.equippedItem) return;
        
        const itemToSell = selectedSlot.equippedItem;
        const sellPrice = Math.round(itemToSell.price * 0.9); // Sell for 90% of value

        setShip(prevShip => {
            const newSlots = prevShip.slots.map(s => {
                if (s === selectedSlot) {
                    return { ...s, equippedItem: null };
                }
                return s;
            });
            const newStats = recalculateShipStats(newSlots, currentShipSpec);
            
            return {
                ...prevShip,
                credits: prevShip.credits + sellPrice,
                slots: newSlots,
                ...newStats,
                shields: Math.min(prevShip.shields, newStats.maxShields || 0),
                energy: Math.min(prevShip.energy, newStats.maxEnergy || 0),
            };
        });
        setSelectedSlot(null);
    };

    const groupedSlots = useMemo(() => {
        return ship.slots.reduce((acc, slot) => {
            if (!acc[slot.type]) {
                acc[slot.type] = [];
            }
            acc[slot.type].push(slot);
            return acc;
        }, {} as Record<string, ShipSlot[]>);
    }, [ship.slots]);

    return (
        <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[1fr_350px]">
            <section className="bg-black/50 rounded-lg border border-cyan-400/20 p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-orbitron text-2xl text-cyan-300">Outfitting: {ship.name}</h2>
                    <button
                        onClick={onReturnToStation}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
                    >
                        Return to Station
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 flex-grow overflow-hidden">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                        <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Ship Loadout</h3>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {Object.entries(groupedSlots).map(([type, slots]) => (
                                <div key={type}>
                                    <h4 className="text-cyan-300 font-bold mb-2">{type}</h4>
                                    <div className="space-y-2">
                                        {slots.map((slot, index) => (
                                            <button key={`${type}-${index}`} onClick={() => setSelectedSlot(slot)} className={`w-full text-left p-2 rounded-md transition duration-200 flex justify-between items-center ${selectedSlot === slot ? 'bg-cyan-500/20' : 'bg-slate-900/50 hover:bg-slate-700/50'}`}>
                                                <div>
                                                    <p className="text-sm text-gray-400">Size {slot.size}</p>
                                                    <p className="text-white">{slot.equippedItem?.name || 'Empty'}</p>
                                                </div>
                                                <span className="text-xs text-gray-500">{slot.equippedItem ? `${slot.equippedItem.class}${slot.equippedItem.rating}` : '-'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                        <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Store</h3>
                        {selectedSlot ? (
                            <div className="flex-grow flex flex-col">
                                <h4 className="text-cyan-200 text-sm mb-2">Fitting: {selectedSlot.type} (Size {selectedSlot.size})</h4>
                                {selectedSlot.equippedItem && (
                                    <div className="mb-4 p-2 bg-black/20 rounded">
                                        <p className="font-bold text-white">{selectedSlot.equippedItem.name}</p>
                                        <p className="text-xs text-gray-400">Value: {Math.round(selectedSlot.equippedItem.price * 0.9).toLocaleString()} ©</p>
                                        <button onClick={handleSellItem} className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2 rounded text-sm">Sell</button>
                                    </div>
                                )}
                                <h5 className="text-orange-300 text-sm mb-2">Available for Purchase</h5>
                                <div className="flex-grow overflow-y-auto pr-2">
                                    {availableEquipmentForSlot.map(item => (
                                        <div key={item.id} className="p-2 mb-2 rounded bg-slate-700/50">
                                            <p className="text-white">{item.name} <span className="text-xs text-gray-400">{item.class}{item.rating}</span></p>
                                            <p className="text-xs text-yellow-300">{item.price.toLocaleString()} ©</p>
                                            <button onClick={() => handleEquipItem(item)} className="w-full mt-1 bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-2 rounded text-sm">Buy & Equip</button>
                                        </div>
                                    ))}
                                    {availableEquipmentForSlot.length === 0 && <p className="text-sm text-gray-500">No compatible items available.</p>}
                                </div>
                            </div>
                        ) : (
                             <div className="flex-grow flex items-center justify-center">
                                <p className="text-gray-500 text-center">Select a slot to view available modules.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <aside className="space-y-4 flex flex-col">
                <ShipStatusPanel ship={ship} />
            </aside>
        </main>
    );
};

export default OutfittingView;