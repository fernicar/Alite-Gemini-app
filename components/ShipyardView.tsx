
import React, { useState, useMemo } from 'react';
import { Ship, StarSystem, ShipForSale } from '../types';
import { SHIPS_FOR_SALE } from '../data/ships';
import { ShipStatusPanel } from './ShipStatusPanel';
import { shipyardService } from '../services/shipyardService';

const StatRow: React.FC<{ label: string; currentValue: number | string; newValue: number | string; reverseColors?: boolean }> = ({ label, currentValue, newValue, reverseColors }) => {
    const currentNum = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
    const newNum = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
    const diff = newNum - currentNum;
    
    let diffColor = 'text-gray-400';
    if (diff > 0) diffColor = reverseColors ? 'text-red-400' : 'text-green-400';
    if (diff < 0) diffColor = reverseColors ? 'text-green-400' : 'text-red-400';

    return (
        <div className="grid grid-cols-3 items-center text-sm py-1 border-b border-slate-700/50">
            <span className="text-gray-400">{label}</span>
            <span className="text-right text-cyan-300">{currentValue}</span>
            <span className={`text-right ${diffColor}`}>{newValue} ({diff > 0 ? '+' : ''}{diff.toFixed(0)})</span>
        </div>
    );
};

const ShipyardView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  setShip: React.Dispatch<React.SetStateAction<Ship>>;
  onReturnToStation: () => void;
}> = ({ currentSystem, ship, setShip, onReturnToStation }) => {
    const [selectedShip, setSelectedShip] = useState<ShipForSale | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const currentShipSpec = useMemo(() => {
        return SHIPS_FOR_SALE.find(s => s.type === ship.type)?.spec || {
            hull: ship.maxHull, shields: ship.maxShields, maxFuel: ship.maxFuel, cargoCapacity: ship.cargoCapacity, speed: 0, jumpRange: 0, slots: [], basePrice: ship.basePrice, manufacturer: 'Unknown', class: 'Multi-purpose'
        }
    }, [ship]);

    const tradeInData = useMemo(() => {
        const tradeInValue = Math.round(ship.basePrice * 0.7);
        const cargoValue = ship.cargo.reduce((acc, item) => acc + (item.quantity * item.weight * 50), 0); // Avg 50cr/T
        const finalCost = selectedShip ? selectedShip.price - tradeInValue - cargoValue : 0;
        return { tradeInValue, cargoValue, finalCost };
    }, [ship, selectedShip]);
    

    const handlePurchase = () => {
        if (!selectedShip) return;

        const result = shipyardService.purchaseShip(ship, selectedShip);

        if (result.success && result.newShip) {
            setShip(result.newShip);
            alert(`Congratulations on your new ${selectedShip.type}!`);
            setShowConfirm(false);
            setSelectedShip(null);
            onReturnToStation();
        } else {
            alert(result.error || "Purchase failed.");
        }
    };

    return (
    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[1fr_350px]">
      <section className="bg-black/50 rounded-lg border border-cyan-400/20 p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="font-orbitron text-2xl text-cyan-300">Shipyard: {currentSystem.name} Station</h2>
            <button
              onClick={onReturnToStation}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Return to Station
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Ships for Sale</h3>
                <div className="flex-grow overflow-y-auto pr-2">
                    {SHIPS_FOR_SALE.map(s => (
                        <button key={s.type} 
                            onClick={() => setSelectedShip(s)}
                            disabled={s.type === ship.type}
                            className={`w-full text-left p-3 rounded-md transition duration-200 mb-2 ${selectedShip?.type === s.type ? 'bg-cyan-500/20 ring-2 ring-cyan-400' : 'hover:bg-slate-700/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <div className="flex justify-between items-center">
                                <span className="text-cyan-300 font-bold">{s.type}</span>
                                <span className="font-mono text-yellow-300">{s.price.toLocaleString()} ©</span>
                            </div>
                            <div className="text-xs text-gray-400">{s.spec.manufacturer} - {s.spec.class}</div>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Specifications</h3>
                {selectedShip ? (
                    <div className="text-white font-mono flex flex-col h-full">
                       <h4 className="text-xl font-bold text-cyan-200">{selectedShip.type}</h4>
                       <p className="text-sm text-gray-400 mb-4">{selectedShip.spec.manufacturer} - {selectedShip.spec.class}</p>

                       <div className="bg-black/20 p-3 rounded flex-grow">
                           <h5 className="text-sm text-orange-300 mb-2">Comparison</h5>
                           <div className="grid grid-cols-3 text-xs mb-1 text-gray-500"><span/><span>Current</span><span>New</span></div>
                           <StatRow label="Hull" currentValue={currentShipSpec.hull} newValue={selectedShip.spec.hull} />
                           <StatRow label="Shields" currentValue={currentShipSpec.shields} newValue={selectedShip.spec.shields} />
                           <StatRow label="Speed" currentValue={currentShipSpec.speed} newValue={selectedShip.spec.speed} />
                           <StatRow label="Jump Range" currentValue={currentShipSpec.jumpRange} newValue={selectedShip.spec.jumpRange} />
                           <StatRow label="Cargo" currentValue={currentShipSpec.cargoCapacity} newValue={selectedShip.spec.cargoCapacity} />
                           <StatRow label="Hardpoints" currentValue={currentShipSpec.slots.filter(s => s.type === 'Hardpoint').length} newValue={selectedShip.spec.slots.filter(s => s.type === 'Hardpoint').length} />
                       </div>

                       <div className="mt-auto pt-4">
                           <button 
                            onClick={() => setShowConfirm(true)}
                            disabled={ship.credits < tradeInData.finalCost}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                           >
                            Purchase ({tradeInData.finalCost.toLocaleString()} ©)
                           </button>
                       </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-gray-500">Select a ship to view details.</p>
                    </div>
                )}
            </div>
        </div>

      </section>
      <aside className="space-y-4 flex flex-col">
        <ShipStatusPanel ship={ship} />
      </aside>

      {showConfirm && selectedShip && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
              <div className="bg-slate-800 border border-cyan-500 rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="font-orbitron text-xl text-orange-300 mb-4">Confirm Purchase</h3>
                  <p className="text-gray-300 mb-2">Trade in your <span className="text-cyan-300">{ship.name}</span> for a new <span className="text-cyan-300">{selectedShip.type}</span>?</p>
                  <div className="font-mono text-sm space-y-1 my-4 p-3 bg-black/20 rounded">
                      <p className="flex justify-between">New Ship Price: <span className="text-yellow-300">{selectedShip.price.toLocaleString()} ©</span></p>
                      <p className="flex justify-between">Trade-in Value ({ship.type}): <span className="text-green-400">-{tradeInData.tradeInValue.toLocaleString()} ©</span></p>
                      <p className="flex justify-between">Cargo Liquidation: <span className="text-green-400">-{tradeInData.cargoValue.toLocaleString()} ©</span></p>
                      <p className="flex justify-between border-t border-slate-600 mt-1 pt-1 font-bold">Final Cost: <span className="text-orange-400">{tradeInData.finalCost.toLocaleString()} ©</span></p>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Note: Your current ship and all its cargo will be liquidated as part of the transaction.</p>
                  <div className="flex justify-end gap-4">
                      <button onClick={() => setShowConfirm(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancel</button>
                      <button onClick={handlePurchase} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded">Confirm</button>
                  </div>
              </div>
          </div>
      )}
    </main>
    );
};

export default ShipyardView;
