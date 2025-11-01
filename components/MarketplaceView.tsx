
import React, { useState, useEffect, useMemo } from 'react';
import { Ship, StarSystem, MarketGood, CargoItem } from '../types';
import { marketService } from '../services/marketService';
import { ShipStatusPanel } from './ShipStatusPanel';
import { COMMODITIES } from '../data/commodities';

const MarketplaceView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  setShip: React.Dispatch<React.SetStateAction<Ship>>;
  onReturnToStation: () => void;
}> = ({ currentSystem, ship, setShip, onReturnToStation }) => {
  const [marketData, setMarketData] = useState<MarketGood[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<MarketGood | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setMarketData(marketService.getMarketData(currentSystem));
    setSelectedCommodity(null);
  }, [currentSystem]);

  const handleSelectCommodity = (commodity: MarketGood) => {
    setSelectedCommodity(commodity);
    setTradeQuantity(1);
    setError('');
  };

  const handleSelectFromCargo = (cargoItem: CargoItem) => {
    const marketItem = marketData.find(item => item.name === cargoItem.name);
    if (marketItem) {
        handleSelectCommodity(marketItem);
    } else {
        setSelectedCommodity(null); // Deselect if not in market
        setError(`This station does not trade ${cargoItem.name}.`);
    }
  };

  const currentCargo = useMemo(() => {
    const cargoMap = new Map<string, number>();
    ship.cargo.forEach(item => {
      cargoMap.set(item.name, item.quantity);
    });
    return cargoMap;
  }, [ship.cargo]);

  const handleTrade = (type: 'buy' | 'sell') => {
    if (!selectedCommodity || tradeQuantity <= 0) {
      setError("Invalid selection or quantity.");
      return;
    }
    setError('');

    const result = type === 'buy'
        ? marketService.buyCommodity(ship, currentSystem, selectedCommodity.name, tradeQuantity)
        : marketService.sellCommodity(ship, currentSystem, selectedCommodity.name, tradeQuantity);
    
    if (result.success) {
        setShip(result.ship!);
        setMarketData(result.market!);
        // After trade, update the selected commodity view with new data
        const updatedCommodity = result.market!.find(c => c.name === selectedCommodity.name);
        setSelectedCommodity(updatedCommodity || null);
        setTradeQuantity(1);
    } else {
        setError(result.error || 'Trade failed.');
    }
  };
  
  const maxTrade = (type: 'buy' | 'sell') => {
    if (!selectedCommodity) return 0;
    const commodityInfo = COMMODITIES.find(c => c.name === selectedCommodity.name);
    if (!commodityInfo) return 0;

    const currentWeight = ship.cargo.reduce((acc, item) => acc + (item.quantity * item.weight), 0);
    
    if (type === 'buy') {
      const maxByCredits = selectedCommodity.buyPrice > 0 ? Math.floor(ship.credits / selectedCommodity.buyPrice) : 0;
      const maxBySpace = commodityInfo.weight > 0 ? Math.floor((ship.cargoCapacity - currentWeight) / commodityInfo.weight) : Infinity;
      const maxByStock = selectedCommodity.quantity;
      return Math.max(0, Math.min(maxByCredits, maxBySpace, maxByStock));
    } else { // sell
      return currentCargo.get(selectedCommodity.name) || 0;
    }
  }


  return (
    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[1fr_350px]">
      <section className="bg-black/50 rounded-lg border border-cyan-400/20 p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="font-orbitron text-2xl text-cyan-300">Market: {currentSystem.name} Station</h2>
            <button
              onClick={onReturnToStation}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Return to Station
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
            {/* Station Market */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Station Market</h3>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-sm font-mono text-gray-400 mb-2 px-2">
                        <span>Commodity</span>
                        <span className="text-right">Stock</span>
                        <span className="text-right">Buy</span>
                        <span className="text-right">Sell</span>
                    </div>
                    {marketData.map(item => (
                        <button key={item.name} 
                            onClick={() => handleSelectCommodity(item)}
                            className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 w-full text-left p-2 rounded-md transition duration-200 ${selectedCommodity?.name === item.name ? 'bg-cyan-500/20' : 'hover:bg-slate-700/50'}`}>
                            <span className="text-cyan-300 truncate">{item.name}</span>
                            <span className="text-yellow-300 text-right">{item.quantity}</span>
                            <span className="text-red-400 text-right">{item.buyPrice}©</span>
                            <span className="text-green-400 text-right">{item.sellPrice}©</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Ship Cargo */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Ship Cargo</h3>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-[1fr_auto] gap-x-4 text-sm font-mono text-gray-400 mb-2 px-2">
                        <span>Commodity</span>
                        <span className="text-right">Qty</span>
                    </div>
                    {ship.cargo.length > 0 ? ship.cargo.map(item => (
                        <button key={item.name} 
                            onClick={() => handleSelectFromCargo(item)}
                            className={`grid grid-cols-[1fr_auto] gap-x-4 w-full text-left p-2 rounded-md transition duration-200 ${selectedCommodity?.name === item.name ? 'bg-cyan-500/20' : 'hover:bg-slate-700/50'}`}>
                            <span className="text-cyan-300 truncate">{item.name}</span>
                            <span className="text-yellow-300 text-right">{item.quantity}</span>
                        </button>
                    )) : <p className="text-gray-500 p-2">Cargo hold is empty.</p>}
                </div>
            </div>

        </div>

      </section>
      <aside className="space-y-4 flex flex-col">
        <ShipStatusPanel ship={ship} />
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex-grow flex flex-col">
            <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-2">Trade Terminal</h3>
            {selectedCommodity ? (
                <div className="flex-grow flex flex-col justify-between text-white">
                    <div>
                        <h4 className="text-xl font-bold text-cyan-200">{selectedCommodity.name}</h4>
                        <p className="text-sm text-gray-400 mb-4">{selectedCommodity.category}</p>
                        <div className="space-y-2 font-mono text-sm">
                            <p>Station Buys at: <span className="text-green-400">{selectedCommodity.sellPrice} ©</span></p>
                            <p>Station Sells at: <span className="text-red-400">{selectedCommodity.buyPrice} ©</span></p>
                            <p>Station Stock: <span className="text-yellow-300">{selectedCommodity.quantity} units</span></p>
                            <p>Your Cargo: <span className="text-yellow-300">{currentCargo.get(selectedCommodity.name) || 0} units</span></p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <label htmlFor="trade-quantity" className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                id="trade-quantity"
                                value={tradeQuantity}
                                onChange={(e) => setTradeQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="flex gap-1 mt-1 text-xs">
                          <button onClick={() => setTradeQuantity(1)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">1</button>
                          <button onClick={() => setTradeQuantity(10)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">10</button>
                          <button onClick={() => setTradeQuantity(100)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">100</button>
                        </div>

                        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                        
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                              onClick={() => handleTrade('buy')}
                              disabled={maxTrade('buy') === 0}
                              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                              Buy {tradeQuantity > 0 && `(${tradeQuantity*selectedCommodity.buyPrice}©)`}
                            </button>
                            <button
                              onClick={() => handleTrade('sell')}
                              disabled={maxTrade('sell') === 0}
                              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                              Sell {tradeQuantity > 0 && `(${tradeQuantity*selectedCommodity.sellPrice}©)`}
                            </button>
                            <button onClick={() => setTradeQuantity(maxTrade('buy'))} className="col-span-1 text-center py-2 bg-green-800 rounded hover:bg-green-700 text-xs">Max Buy</button>
                            <button onClick={() => setTradeQuantity(maxTrade('sell'))} className="col-span-1 text-center py-2 bg-red-800 rounded hover:bg-red-700 text-xs">Max Sell</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500">Select a commodity to trade.</p>
                </div>
            )}
        </div>
      </aside>
    </main>
  );
};

export default MarketplaceView;