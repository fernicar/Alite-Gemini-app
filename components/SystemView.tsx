
import React, { useMemo } from 'react';
import { Ship, StarSystem, NPC, Salvage } from '../types';
import { ShipStatusPanel } from './ShipStatusPanel';
import { StationIcon, EnemyIcon, FireIcon, SalvageIcon, PlayerShipIcon } from './icons';
import { TargetInfoPanel } from './TargetInfoPanel';

const SystemView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  onReturnToGalaxy: () => void;
  onDock: () => void;
  npcs: NPC[];
  salvage: Salvage[];
  target: NPC | null;
  onFire: () => void;
  onTargetNext: () => void;
  onScoop: (salvageId: string) => void;
}> = ({ currentSystem, ship, onReturnToGalaxy, onDock, npcs, salvage, target, onFire, onTargetNext, onScoop }) => {
  const SCOOP_RANGE = 100; // pixels, increased for better UX
  const HOSTILE_PROXIMITY_RANGE = 1500; // Range for detecting hostiles

  const hasNearbyHostiles = npcs.some(npc => {
    if (!npc.isHostile) return false;
    const dist = Math.sqrt((npc.position.x - ship.position.x)**2 + (npc.position.y - ship.position.y)**2);
    return dist < HOSTILE_PROXIMITY_RANGE;
  });

  const scoopableSalvage = useMemo(() => {
    return salvage.find(s => {
        const dist = Math.sqrt((s.position.x - ship.position.x)**2 + (s.position.y - ship.position.y)**2);
        return dist < SCOOP_RANGE;
    });
  }, [salvage, ship.position]);

  const canScoop = scoopableSalvage && !hasNearbyHostiles;

  const fireEnergyCost = useMemo(() => {
    return ship.slots
        .filter(s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon')
        .reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
  }, [ship.slots]);
  
  return (
    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[350px_1fr]">
      <aside className="space-y-4">
        <ShipStatusPanel ship={ship} />
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-2">
            <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2">Local Actions</h3>
            <button
              onClick={onDock}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2"
            >
              <StationIcon className="w-5 h-5"/>
              Dock at Station
            </button>
            {canScoop && scoopableSalvage && (
                <button
                onClick={() => onScoop(scoopableSalvage.id)}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2 animate-pulse"
                >
                <SalvageIcon className="w-5 h-5" />
                Scoop Salvage
                </button>
            )}
             {scoopableSalvage && hasNearbyHostiles && (
              <div className="text-center text-yellow-400 text-xs p-2 bg-yellow-900/30 rounded border border-yellow-400/30">
                <p className="font-bold">CARGO SCOOP OFFLINE</p>
                <p>Hostiles detected in vicinity.</p>
              </div>
            )}
            <button
              onClick={onFire}
              disabled={!target || ship.energy < fireEnergyCost}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <FireIcon className="w-5 h-5" />
              Fire Lasers
            </button>
            <button
              onClick={onTargetNext}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Target Next Enemy
            </button>
        </div>
        <TargetInfoPanel target={target} />
      </aside>
      <section className="bg-black/50 rounded-lg border border-cyan-400/20 relative overflow-hidden p-4 flex flex-col min-h-[60vh] lg:min-h-0">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-orbitron text-2xl text-cyan-300">System: {currentSystem.name}</h2>
            <button
              onClick={onReturnToGalaxy}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Return to Galaxy Map
            </button>
        </div>
        <div className="flex-grow bg-black rounded-md relative flex items-center justify-center overflow-hidden border border-cyan-400/10">
          {/* Starfield background */}
          <div className="absolute inset-0 bg-grid-cyan-500/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,#000)]"></div>
          
          {/* Player Ship */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ transform: `rotate(${ship.angle}deg)` }}>
              <PlayerShipIcon className="w-5 h-6 drop-shadow-[0_0_5px_rgba(56,189,248,0.7)]" />
          </div>

          {/* Central Star (position relative to player) */}
          <div className="absolute w-32 h-32 bg-yellow-400 rounded-full shadow-[0_0_50px_10px_rgba(250,204,21,0.5)] animate-pulse"
             style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${-ship.position.x}px, ${-ship.position.y}px)`
              }}
          ></div>

          {/* Station */}
          <div className="absolute" style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${200 * Math.cos(2.09) - ship.position.x}px, ${200 * Math.sin(2.09) - ship.position.y}px)` 
            }}>
            <div className="animate-spin-slow w-20 h-20">
              <StationIcon className="w-20 h-20 text-cyan-300 opacity-75" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-cyan-200 font-mono">{currentSystem.name} Station</p>
          </div>

          {/* Planets (placeholders) */}
           <div className="absolute w-8 h-8 bg-blue-500 rounded-full" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${150*Math.cos(0.78)-ship.position.x}px, ${150*Math.sin(0.78)-ship.position.y}px)` }}></div>
          <div className="absolute w-6 h-6 bg-red-500 rounded-full" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${250*Math.cos(2.61)-ship.position.x}px, ${250*Math.sin(2.61)-ship.position.y}px)` }}></div>
          <div className="absolute w-10 h-10 bg-green-500 rounded-full" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${350*Math.cos(4.88)-ship.position.x}px, ${350*Math.sin(4.88)-ship.position.y}px)` }}></div>


          {/* NPCs */}
          {npcs.map(npc => (
            <div key={npc.id} className="absolute transition-transform duration-500" 
              style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${npc.position.x - ship.position.x}px, ${npc.position.y - ship.position.y}px)`
              }}
            >
              <EnemyIcon className={`w-6 h-6 transition-colors ${npc.isHostile ? 'text-red-500' : 'text-green-500'} ${target?.id === npc.id ? 'opacity-100' : 'opacity-75'}`} />
              {target?.id === npc.id && (
                <div className="absolute -top-2 -left-2 w-10 h-10 border border-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}

          {/* Salvage */}
          {salvage.map(s => (
            <div key={s.id} className="absolute transition-transform duration-500" 
              style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${s.position.x - ship.position.x}px, ${s.position.y - ship.position.y}px)`
              }}
            >
              <SalvageIcon className={`w-5 h-5 text-yellow-400 transition-opacity ${scoopableSalvage?.id === s.id ? 'opacity-100' : 'opacity-70'}`} />
              {scoopableSalvage?.id === s.id && (
                <div className="absolute -top-2 -left-2 w-9 h-9 border border-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default SystemView;
