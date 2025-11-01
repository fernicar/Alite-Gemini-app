import React from 'react';
import { Ship, StarSystem } from '../types';
import { ShipStatusPanel } from './ShipStatusPanel';
import { MarketIcon, ShipyardIcon, OutfittingIcon, MissionIcon } from './icons';

const DockedView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  onUndock: () => void;
  onViewMarketplace: () => void;
  onViewShipyard: () => void;
  onViewOutfitting: () => void;
  onViewMissionBoard: () => void;
}> = ({ currentSystem, ship, onUndock, onViewMarketplace, onViewShipyard, onViewOutfitting, onViewMissionBoard }) => {
  return (
    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[350px_1fr]">
      <aside className="space-y-4">
        <ShipStatusPanel ship={ship} />
      </aside>
      <section className="bg-black/50 rounded-lg border border-cyan-400/20 relative overflow-hidden p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-orbitron text-2xl text-cyan-300">Docked at: {currentSystem.name} Station</h2>
        </div>
        <div 
          className="flex-grow bg-cover bg-center rounded-md relative flex flex-col items-center justify-center overflow-hidden border border-cyan-400/10 p-8"
          style={{backgroundImage: "url('https://source.unsplash.com/random/1200x800/?spaceship,hangar,interior')"}}
        >
          <div className="absolute inset-0 bg-black/70"></div>
          <div className="relative z-10 text-center">
            <h3 className="font-orbitron text-3xl text-orange-300 mb-2">Welcome, Commander</h3>
            <p className="text-gray-300 mb-8">You are cleared for shore leave. All station services are at your disposal.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <button 
                onClick={onViewMarketplace}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition duration-200 flex items-center justify-center gap-2">
                <MarketIcon className="w-5 h-5" />
                Marketplace
              </button>
              <button 
                onClick={onViewShipyard}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition duration-200 flex items-center justify-center gap-2">
                <ShipyardIcon className="w-5 h-5" />
                Shipyard
              </button>
              <button 
                onClick={onViewOutfitting}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded transition duration-200 flex items-center justify-center gap-2">
                <OutfittingIcon className="w-5 h-5" />
                Outfitting
              </button>
               <button 
                onClick={onViewMissionBoard}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded transition duration-200 flex items-center justify-center gap-2">
                <MissionIcon className="w-5 h-5" />
                Mission Board
              </button>
            </div>
            <button
                onClick={onUndock}
                className="mt-8 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-12 rounded transition duration-200"
              >
                Undock
              </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default DockedView;
