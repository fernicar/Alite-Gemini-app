
import React, { useMemo, useEffect, useRef } from 'react';
import { Ship, StarSystem, NPC, Salvage, Projectile, VisualEffect } from '../types';
import { ShipStatusPanel } from './ShipStatusPanel';
import { StationIcon, FireIcon, SalvageIcon } from './icons';
import { TargetInfoPanel } from './TargetInfoPanel';
import { ShipIcon } from './ShipIcon';
import { PlanetIcon } from './PlanetIcon';

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
  projectiles: Projectile[];
  visualEffects: VisualEffect[];
}> = ({ currentSystem, ship, onReturnToGalaxy, onDock, npcs, salvage, target, onFire, onTargetNext, onScoop, projectiles, visualEffects }) => {
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

  // Parallax background refs
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<{ x: number; y: number; size: number; opacity: number; }[][]>([]);

  // Generate stars once on component mount
  useEffect(() => {
      if (starsRef.current.length > 0) return;

      const layers = [
          { numStars: 200, size: 0.8 },
          { numStars: 100, size: 1.2 },
          { numStars: 50,  size: 1.8 },
      ];

      starsRef.current = layers.map(layer => {
          const stars = [];
          for (let i = 0; i < layer.numStars; i++) {
              stars.push({
                  x: Math.random(), // 0 to 1
                  y: Math.random(), // 0 to 1
                  size: Math.random() * layer.size + 0.5,
                  opacity: Math.random() * 0.5 + 0.5,
              });
          }
          return stars;
      });
  }, []);

  // Drawing effect
  useEffect(() => {
      const canvas = backgroundCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const parent = canvas.parentElement;
      if (!parent) return;

      const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
              const { width, height } = entry.contentRect;
              canvas.width = width;
              canvas.height = height;
          }
      });
      resizeObserver.observe(parent);

      let animationFrameId: number;
      
      const layers = [
          { speed: 0.1, color: 'rgba(255, 255, 255, 0.4)' },
          { speed: 0.3, color: 'rgba(255, 255, 255, 0.6)' },
          { speed: 0.5, color: 'rgba(255, 255, 255, 0.9)' },
      ];
      
      const draw = () => {
          animationFrameId = requestAnimationFrame(draw);
          
          const { width, height } = canvas;
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#000011';
          ctx.fillRect(0, 0, width, height);

          layers.forEach((layer, i) => {
              if (!starsRef.current[i]) return;
              
              const offsetX = ship.position.x * layer.speed;
              const offsetY = ship.position.y * layer.speed;

              ctx.fillStyle = layer.color;

              starsRef.current[i].forEach(star => {
                  const starX = star.x * width;
                  const starY = star.y * height;

                  const drawX = (starX - offsetX % width + width) % width;
                  const drawY = (starY - offsetY % height + height) % height;
                  
                  ctx.globalAlpha = star.opacity;
                  ctx.beginPath();
                  ctx.arc(drawX, drawY, star.size, 0, 2 * Math.PI);
                  ctx.fill();
              });
          });
          ctx.globalAlpha = 1.0;
      };
      
      draw();

      return () => {
          cancelAnimationFrame(animationFrameId);
          resizeObserver.disconnect();
      };

  }, [ship.position]); // Redraw when ship position changes
  
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
          {/* Parallax Starfield background */}
          <canvas ref={backgroundCanvasRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Scanner HUD */}
          <div className="absolute w-[80vmin] h-[80vmin] pointer-events-none">
              {/* Grid */}
              <svg width="100%" height="100%" viewBox="0 0 200 200" className="absolute inset-0 z-1">
                  <defs>
                      <radialGradient id="scannerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="85%" stopColor="rgba(0, 40, 40, 0)" />
                          <stop offset="100%" stopColor="rgba(0, 255, 255, 0.15)" />
                      </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="99" fill="url(#scannerGlow)" />

                  <circle cx="100" cy="100" r="33" fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
                  <circle cx="100" cy="100" r="66" fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
                  <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(0, 255, 255, 0.2)" strokeWidth="0.5" />

                  <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
                  <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
                  <line x1="29.3" y1="29.3" x2="170.7" y2="170.7" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
                  <line x1="29.3" y1="170.7" x2="170.7" y2="29.3" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="0.5" />
              </svg>
              {/* Sweep */}
              <div className="absolute inset-0 w-full h-full animate-spin-radar z-2" style={{ transformOrigin: '50% 50%' }}>
                  <div className="absolute top-0 left-0 w-full h-full"
                      style={{
                          background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, rgba(0, 255, 255, 0.4) 358deg, transparent 360deg)',
                          clipPath: 'circle(50% at 50% 50%)',
                      }}
                  />
              </div>
          </div>
          
          {/* Player Ship */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ transform: `rotate(${ship.angle}deg)` }}>
              <ShipIcon shipType={ship.type} className="w-5 h-6 text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.7)]" />
          </div>

          {/* Central Star (position relative to player) */}
          <div className="absolute w-32 h-32 bg-yellow-400 rounded-full shadow-[0_0_50px_10px_rgba(250,204,21,0.5)] animate-pulse z-3"
             style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${-ship.position.x}px, ${-ship.position.y}px)`
              }}
          ></div>

          {/* Station */}
          <div className="absolute z-3" style={{ 
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

          {/* Planets */}
          <div className="absolute z-3" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${150*Math.cos(0.78)-ship.position.x}px, ${150*Math.sin(0.78)-ship.position.y}px)` }}>
            <PlanetIcon type="terrestrial" size={32} seed={`${currentSystem.id}-1`} />
          </div>
          <div className="absolute z-3" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${250*Math.cos(2.61)-ship.position.x}px, ${250*Math.sin(2.61)-ship.position.y}px)` }}>
            <PlanetIcon type="rocky" size={24} seed={`${currentSystem.id}-2`} />
          </div>
          <div className="absolute z-3" style={{ left: '50%', top: '50%', transform: `translate(-50%,-50%) translate(${350*Math.cos(4.88)-ship.position.x}px, ${350*Math.sin(4.88)-ship.position.y}px)` }}>
            <PlanetIcon type="gas_giant" size={40} seed={`${currentSystem.id}-3`} />
          </div>


          {/* NPCs */}
          {npcs.map(npc => (
            <div key={npc.id} className="absolute transition-transform duration-500 z-5" 
              style={{ 
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) translate(${npc.position.x - ship.position.x}px, ${npc.position.y - ship.position.y}px) rotate(${npc.angle}deg)`
              }}
            >
              <ShipIcon shipType={npc.shipType} className={`w-5 h-6 transition-colors ${npc.isHostile ? 'text-red-500' : 'text-green-500'} ${target?.id === npc.id ? 'opacity-100' : 'opacity-75'}`} />
              {target?.id === npc.id && (
                <div className="absolute -top-2 -left-2 w-10 h-10 border border-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}

          {/* Salvage */}
          {salvage.map(s => (
            <div key={s.id} className="absolute transition-transform duration-500 z-5" 
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

          {/* Projectiles */}
          {projectiles.map(proj => (
              <div key={proj.id} 
                   className="absolute bg-cyan-300 rounded-sm z-15"
                   style={{
                       left: '50%',
                       top: '50%',
                       width: '12px',
                       height: '3px',
                       transform: `translate(-50%, -50%) translate(${proj.position.x - ship.position.x}px, ${proj.position.y - ship.position.y}px) rotate(${proj.angle}deg)`,
                       boxShadow: '0 0 5px #38bdf8',
                   }}
              />
          ))}

          {/* Visual Effects */}
          {visualEffects.map(effect => (
              <div key={effect.id}
                   className="absolute bg-yellow-400 rounded-full z-20"
                   style={{
                       left: '50%',
                       top: '50%',
                       width: `${effect.size}px`,
                       height: `${effect.size}px`,
                       opacity: effect.remainingLife / effect.maxLife,
                       transform: `translate(-50%, -50%) translate(${effect.position.x - ship.position.x}px, ${effect.position.y - ship.position.y}px)`,
                       boxShadow: '0 0 20px yellow',
                       transition: 'width 0.05s ease-out, height 0.05s ease-out, opacity 0.05s ease-out',
                   }}
              />
          ))}
        </div>
      </section>
    </main>
  );
};

export default SystemView;
