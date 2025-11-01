
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Ship, StarSystem, NPC, Salvage, CargoItem, ShipSlot, Mission } from './types';
import { GALAXY_MAP, GALAXY_WIDTH, GALAXY_HEIGHT } from './constants';
import { generateSystemDescription } from './services/geminiService';
import { JumpIcon } from './components/icons';
import { ShipStatusPanel } from './components/ShipStatusPanel';
import SystemView from './components/SystemView';
import DockedView from './components/DockedView';
import MarketplaceView from './components/MarketplaceView';
import ShipyardView from './components/ShipyardView';
import OutfittingView from './components/OutfittingView';
import MissionBoardView from './components/MissionBoardView';
import { EQUIPMENT_LIST } from './data/equipment';
import { SHIPS_FOR_SALE } from './data/ships';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { audioService } from './services/audioService';

// Helper to create the initial ship state without side-effects
const createInitialShip = (): Ship => {
    const cobraSpec = SHIPS_FOR_SALE.find(s => s.type === 'Cobra Mk III');
    const initialSlots: ShipSlot[] = cobraSpec?.spec.slots.map(s => ({ ...s, equippedItem: null })) || [];

    let ppSet = false, sgSet = false, laserSet = false;
    const equippedSlots = initialSlots.map(slot => {
        const newSlot = { ...slot };
        if (!ppSet && newSlot.type === 'CoreInternal' && newSlot.size === 4) {
            newSlot.equippedItem = EQUIPMENT_LIST.find(e => e.id === '4E_PowerPlant') || null;
            ppSet = true;
        }
        if (!sgSet && newSlot.type === 'OptionalInternal' && newSlot.size === 4) {
            newSlot.equippedItem = EQUIPMENT_LIST.find(e => e.id === '4E_ShieldGen') || null;
            sgSet = true;
        }
        if (!laserSet && newSlot.type === 'Hardpoint' && newSlot.size === 1) {
            newSlot.equippedItem = EQUIPMENT_LIST.find(e => e.id === '1E_PulseLaser') || null;
            laserSet = true;
        }
        return newSlot;
    });

    const powerPlant = equippedSlots.find(s => s.equippedItem?.category === 'Core' && s.equippedItem.name.includes('Power Plant'))?.equippedItem;
    const shieldGen = equippedSlots.find(s => s.equippedItem?.stats?.shieldStrength)?.equippedItem;

    const maxEnergy = powerPlant?.stats?.powerGenerated || 100;
    const maxShields = shieldGen?.stats?.shieldStrength || 100;

    return {
        name: 'Stardust Drifter',
        type: 'Cobra Mk III',
        hull: 100,
        maxHull: 100,
        shields: maxShields,
        maxShields: maxShields,
        fuel: 10,
        maxFuel: 10,
        energy: maxEnergy,
        maxEnergy: maxEnergy,
        cargoCapacity: 20,
        cargo: [
            { name: 'Food Rations', quantity: 5, weight: 1 },
            { name: 'Machine Parts', quantity: 2, weight: 5 },
        ],
        credits: 5000,
        basePrice: 35000,
        slots: equippedSlots,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        angle: 0,
    };
};

const initialShip = createInitialShip();

const Header: React.FC = () => (
  <header className="col-span-full bg-black/30 backdrop-blur-sm border-b border-cyan-400/20 p-4 flex items-center justify-between shadow-lg shadow-cyan-500/10">
    <h1 className="text-2xl font-orbitron text-cyan-300 tracking-widest uppercase">A L I T E</h1>
    <div className="text-sm text-cyan-400">Galactic Standard Time: 23:42</div>
  </header>
);

const SystemInfoPanel: React.FC<{
  system: StarSystem | null;
  onGenerateDescription: () => void;
  description: string;
  isLoading: boolean;
  onJump: () => void;
  onEnterSystem: () => void;
  canJump: boolean;
  isCurrentSystem: boolean;
}> = ({ system, onGenerateDescription, description, isLoading, onJump, onEnterSystem, canJump, isCurrentSystem }) => (
  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 h-full flex flex-col">
    <h2 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">SYSTEM INFO</h2>
    {system ? (
      <div className="flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-cyan-300">{system.name}</h3>
        <p className="text-sm text-gray-400 mb-4">{system.description}</p>
        <div className="text-xs space-y-2 mb-4">
          <p><strong>Economy:</strong> <span className="text-yellow-300">{system.economy}</span></p>
          <p><strong>Government:</strong> <span className="text-purple-300">{system.government}</span></p>
        </div>
        
        <div className="flex-grow bg-black/30 p-3 rounded-md overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-cyan-400 animate-pulse">Generating detailed briefing...</p>
          ) : (
            <MarkdownRenderer markdown={description} />
          )}
        </div>
        
        <div className="mt-4 space-y-2">
          <button 
            onClick={onGenerateDescription}
            disabled={isLoading}
            className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Get AI Briefing'}
          </button>
          {isCurrentSystem ? (
             <button onClick={onEnterSystem} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2">
                Enter System View
            </button>
          ) : (
            <button 
                onClick={onJump} 
                disabled={!canJump}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                <JumpIcon className="w-5 h-5" />
                Jump to System
            </button>
          )}
        </div>
      </div>
    ) : (
      <p className="text-gray-500">Select a system to view details.</p>
    )}
  </div>
);

type View = 'GALAXY' | 'SYSTEM' | 'DOCKED' | 'MARKETPLACE' | 'SHIPYARD' | 'OUTFITTING' | 'MISSION_BOARD' | 'GAME_OVER';

const THRUST = 0.1;
const TURN_RATE = 3;
const MAX_VELOCITY = 5;
const DRAG = 0.99;

const App: React.FC = () => {
    const [view, setView] = useState<View>('GALAXY');
    const [ship, setShip] = useState<Ship>(initialShip);
    const shipRef = useRef(ship);
    useEffect(() => { shipRef.current = ship; }, [ship]);

    const [currentSystem, setCurrentSystem] = useState<StarSystem>(GALAXY_MAP[0]);
    const [selectedSystem, setSelectedSystem] = useState<StarSystem>(GALAXY_MAP[0]);
    const [detailedDescription, setDetailedDescription] = useState<string>('');
    const [descriptionLoading, setDescriptionLoading] = useState<boolean>(false);
    const [npcs, setNpcs] = useState<NPC[]>([]);
    const [salvage, setSalvage] = useState<Salvage[]>([]);
    const [target, setTarget] = useState<NPC | null>(null);
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const [systemCleared, setSystemCleared] = useState<boolean>(false);
    const pressedKeys = useRef(new Set<string>());

    const handleSelectSystem = useCallback((system: StarSystem) => {
        setSelectedSystem(system);
        setDetailedDescription('');
    }, []);

    const handleGenerateDescription = useCallback(async () => {
        if (!selectedSystem) return;
        setDescriptionLoading(true);
        const desc = await generateSystemDescription(selectedSystem);
        setDetailedDescription(desc);
        setDescriptionLoading(false);
    }, [selectedSystem]);

    const jumpDistance = useMemo(() => {
        if (!currentSystem || !selectedSystem) return 0;
        const dist = Math.sqrt(Math.pow(selectedSystem.x - currentSystem.x, 2) + Math.pow(selectedSystem.y - currentSystem.y, 2));
        return dist / 10; // Scale factor for LY
    }, [currentSystem, selectedSystem]);

    const handleJump = useCallback(() => {
        if (!selectedSystem || !currentSystem || ship.fuel < jumpDistance) return;
        
        audioService.playJumpSound();
        setShip(prev => ({ ...prev, fuel: prev.fuel - jumpDistance, position: {x:0, y:0}, velocity: {x:0, y:0} }));
        setCurrentSystem(selectedSystem);
        setDetailedDescription('');
        setNpcs([]);
        setSalvage([]);
        setTarget(null);
        setSystemCleared(false);
    }, [selectedSystem, currentSystem, ship.fuel, jumpDistance]);

    const spawnEntities = useCallback(() => {
      const isAnarchy = currentSystem.government === 'Anarchy';
      const numPirates = isAnarchy ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2);
      const newNpcs: NPC[] = [];
      for (let i = 0; i < numPirates; i++) {
        newNpcs.push({
          id: `pirate-${Date.now()}-${i}`,
          type: 'Pirate', shipType: 'Viper Mk I', hull: 80, maxHull: 80, shields: 0, maxShields: 120,
          position: { x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 800 },
          isHostile: true,
        });
      }
      setNpcs(newNpcs);
    }, [currentSystem]);

    useEffect(() => {
        if (view === 'SYSTEM' && npcs.length === 0 && !systemCleared) {
            spawnEntities();
        }
    }, [view, currentSystem, spawnEntities, npcs.length, systemCleared]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => pressedKeys.current.add(e.key.toLowerCase());
      const handleKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase());

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, []);

    useEffect(() => {
        if (view !== 'SYSTEM') return;
        
        const gameLoop = setInterval(() => {
            let totalDamage = 0;

            setNpcs(currentNpcs => currentNpcs.map(npc => {
                if (npc.isHostile) {
                    const playerPos = shipRef.current.position;
                    const distToPlayer = Math.sqrt((npc.position.x - playerPos.x)**2 + (npc.position.y - playerPos.y)**2);
                    
                    if (distToPlayer > 400) { // Move closer if far
                        const angleToPlayer = Math.atan2(playerPos.y - npc.position.y, playerPos.x - npc.position.x);
                        return {
                            ...npc,
                            position: {
                                x: npc.position.x + Math.cos(angleToPlayer) * 2, // NPC speed
                                y: npc.position.y + Math.sin(angleToPlayer) * 2,
                            }
                        };
                    } else { // Fire if close
                      if (Math.random() < 0.02) { // slower fire rate with faster loop
                        totalDamage += Math.random() * 10;
                      }
                    }
                }
                return npc;
            }));
            
            setShip(s => {
                let newAngle = s.angle;
                let newVelocity = { ...s.velocity };
                let newPosition = { ...s.position };
                let newShields = s.shields;
                let newHull = s.hull;
                let newEnergy = s.energy;

                // --- Player Movement ---
                if (pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft')) newAngle -= TURN_RATE;
                if (pressedKeys.current.has('d') || pressedKeys.current.has('arrowright')) newAngle += TURN_RATE;
                
                if (pressedKeys.current.has('w') || pressedKeys.current.has('arrowup')) {
                    const radians = (newAngle - 90) * (Math.PI / 180);
                    newVelocity.x += Math.cos(radians) * THRUST;
                    newVelocity.y += Math.sin(radians) * THRUST;
                }
                if (pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown')) {
                    newVelocity.x *= 0.95;
                    newVelocity.y *= 0.95;
                }
                newVelocity.x *= DRAG;
                newVelocity.y *= DRAG;

                const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2);
                if (speed > MAX_VELOCITY) {
                    newVelocity.x = (newVelocity.x / speed) * MAX_VELOCITY;
                    newVelocity.y = (newVelocity.y / speed) * MAX_VELOCITY;
                }

                newPosition.x += newVelocity.x;
                newPosition.y += newVelocity.y;
                
                // --- Damage & Recharge ---
                if (totalDamage > 0) {
                    const tempShields = newShields - totalDamage;
                    if (tempShields < 0) {
                        newHull += tempShields;
                        newShields = 0;
                    } else {
                        newShields = tempShields;
                    }
                }
                newShields = Math.min(s.maxShields, newShields + (s.maxShields / 200)); // Slower recharge
                newEnergy = Math.min(s.maxEnergy, newEnergy + (s.maxEnergy / 100)); // Slower recharge

                return {
                    ...s,
                    angle: newAngle,
                    velocity: newVelocity,
                    position: newPosition,
                    shields: newShields,
                    hull: newHull,
                    energy: newEnergy
                };
            });

        }, 50); // 20 FPS game loop

        return () => clearInterval(gameLoop);
    }, [view]);

    useEffect(() => {
      if (ship.hull <= 0 && view !== 'GAME_OVER') {
        audioService.playExplosionSound();
        audioService.playGameOverSound();
        setView('GAME_OVER');
      }
    }, [ship.hull, view]);

    const handleFire = () => {
        if (!target) return;

        const weapons = ship.slots.filter(
            s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon'
        );

        if (weapons.length === 0) return;

        const totalEnergyCost = weapons.reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
        const totalDamage = weapons.reduce((acc, s) => acc + (s.equippedItem?.stats?.damage || 0), 0);
        
        if (ship.energy < totalEnergyCost) return;

        audioService.playLaserSound();
        setShip(s => ({ ...s, energy: s.energy - totalEnergyCost }));

        const hadHostiles = npcs.some(n => n.isHostile);

        const newNpcs = npcs.map(npc => {
            if (npc.id === target.id) {
                const newShields = npc.shields - totalDamage;
                if (newShields < 0) {
                    // Damage bleeds through to the hull
                    return { ...npc, shields: 0, hull: npc.hull + newShields };
                }
                return { ...npc, shields: newShields };
            }
            return npc;
        });

        const updatedTarget = newNpcs.find(n => n.id === target.id);

        if (updatedTarget && updatedTarget.hull <= 0) {
            // Target was destroyed
            audioService.playExplosionSound();
            setSalvage(s => [...s, {
                id: `salvage-${updatedTarget.id}`,
                contents: { name: 'Scrap Metal', quantity: Math.ceil(Math.random() * 5), weight: 1 },
                position: updatedTarget.position,
            }]);
            setTarget(null);

            if (activeMission && activeMission.type === 'Bounty' && activeMission.status === 'InProgress') {
                if (updatedTarget.type === activeMission.targetNPC?.type && currentSystem.id === activeMission.systemId) {
                    setActiveMission(prev => prev ? ({ ...prev, status: 'Completed' }) : null);
                    alert(`Target ${activeMission.title} destroyed! Return to a station in this system to claim your reward.`);
                }
            }
        } else if (updatedTarget) {
            // Target was damaged but not destroyed
            setTarget(updatedTarget);
        }

        const remainingNpcs = newNpcs.filter(n => n.hull > 0);

        if (hadHostiles && remainingNpcs.every(n => !n.isHostile)) {
            setSystemCleared(true);
        }

        setNpcs(remainingNpcs);
    };

    const handleTargetNext = () => {
        const hostiles = npcs.filter(n => n.isHostile);
        if (hostiles.length === 0) {
            setTarget(null);
            return;
        }
        const currentTargetIndex = target ? hostiles.findIndex(n => n.id === target.id) : -1;
        const nextIndex = (currentTargetIndex + 1) % hostiles.length;
        setTarget(hostiles[nextIndex]);
    };

    const handleScoop = (salvageId: string) => {
        const item = salvage.find(s => s.id === salvageId);
        if (!item) return;

        const totalWeight = ship.cargo.reduce((acc, c) => acc + (c.quantity * c.weight), 0);
        if (totalWeight + (item.contents.quantity * item.contents.weight) > ship.cargoCapacity) {
          return;
        }
        
        setShip(s => {
            const existingItemIndex = s.cargo.findIndex(c => c.name === item.contents.name);
            let newCargo;
            if (existingItemIndex > -1) {
                newCargo = s.cargo.map((cargoItem, index) => {
                    if (index === existingItemIndex) {
                        return { ...cargoItem, quantity: cargoItem.quantity + item.contents.quantity };
                    }
                    return cargoItem;
                });
            } else {
                newCargo = [...s.cargo, item.contents];
            }
            return { ...s, cargo: newCargo };
        });

        setSalvage(s => s.filter(i => i.id !== salvageId));
    };

    const handleDock = () => {
      if (activeMission && activeMission.status === 'Completed' && activeMission.systemId === currentSystem.id) {
          setShip(s => ({...s, credits: s.credits + activeMission.reward}));
          alert(`Mission Complete! ${activeMission.reward.toLocaleString()} credits awarded.`);
          setActiveMission(null);
      }
      audioService.playDockingSound(); 
      setView('DOCKED');
    }

    const handleAcceptMission = (mission: Mission) => {
        if (activeMission) {
            alert("You already have an active mission.");
            return;
        }
        setActiveMission({ ...mission, status: 'InProgress' });
        setView('DOCKED');
    };

    const renderView = () => {
        switch (view) {
            case 'SYSTEM':
                return <SystemView currentSystem={currentSystem} ship={ship} onReturnToGalaxy={() => setView('GALAXY')} onDock={handleDock} npcs={npcs} salvage={salvage} target={target} onFire={handleFire} onTargetNext={handleTargetNext} onScoop={handleScoop} />;
            case 'DOCKED':
                return <DockedView currentSystem={currentSystem} ship={ship} onUndock={() => setView('SYSTEM')} onViewMarketplace={() => setView('MARKETPLACE')} onViewShipyard={() => setView('SHIPYARD')} onViewOutfitting={() => setView('OUTFITTING')} onViewMissionBoard={() => setView('MISSION_BOARD')} />;
            case 'MARKETPLACE':
                return <MarketplaceView currentSystem={currentSystem} ship={ship} setShip={setShip} onReturnToStation={() => setView('DOCKED')} />;
            case 'SHIPYARD':
                return <ShipyardView currentSystem={currentSystem} ship={ship} setShip={setShip} onReturnToStation={() => setView('DOCKED')} />;
            case 'OUTFITTING':
                return <OutfittingView currentSystem={currentSystem} ship={ship} setShip={setShip} onReturnToStation={() => setView('DOCKED')} />;
            case 'MISSION_BOARD':
                return <MissionBoardView currentSystem={currentSystem} ship={ship} activeMission={activeMission} onAcceptMission={handleAcceptMission} onReturnToStation={() => setView('DOCKED')} />;
            case 'GAME_OVER':
              return <div className="flex-grow flex items-center justify-center">
                <div className="text-center">
                  <h2 className="font-orbitron text-5xl text-red-500 mb-4">YOU DIED</h2>
                  <p className="text-gray-300">Your journey through the stars has come to an untimely end.</p>
                  <button onClick={() => window.location.reload()} className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded">Try Again</button>
                </div>
              </div>;
            case 'GALAXY':
            default:
                return (
                    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[1fr_350px]">
                      <section className="bg-black/50 rounded-lg border border-cyan-400/20 relative overflow-hidden min-h-[60vh] lg:min-h-0">
                        <div className="absolute inset-0 bg-grid-cyan-500/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,#000)]"></div>
                        {GALAXY_MAP.map(system => {
                          const isSelected = selectedSystem?.id === system.id;
                          const isCurrent = currentSystem?.id === system.id;
                          const distance = currentSystem ? Math.sqrt(Math.pow(system.x - currentSystem.x, 2) + Math.pow(system.y - currentSystem.y, 2)) / 10 : 0;
                          const canJump = ship.fuel >= distance;
                    
                          return (
                            <div key={system.id}
                              className="absolute"
                              style={{ left: `${(system.x / GALAXY_WIDTH) * 100}%`, top: `${(system.y / GALAXY_HEIGHT) * 100}%`, transform: 'translate(-50%, -50%)' }}
                            >
                              <button
                                onClick={() => handleSelectSystem(system)}
                                className="flex flex-col items-center group"
                              >
                                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${isCurrent ? 'bg-green-400 animate-pulse' : (canJump ? 'bg-cyan-400' : 'bg-red-500')} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-black/50 ring-orange-400' : ''}`}></div>
                                <span className={`mt-2 text-xs transition-colors ${isCurrent ? 'text-green-300' : 'text-cyan-300'} group-hover:text-orange-300`}>{system.name}</span>
                              </button>
                            </div>
                          );
                        })}
                        {currentSystem && selectedSystem && currentSystem.id !== selectedSystem.id && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <line
                              x1={`${(currentSystem.x / GALAXY_WIDTH) * 100}%`}
                              y1={`${(currentSystem.y / GALAXY_HEIGHT) * 100}%`}
                              x2={`${(selectedSystem.x / GALAXY_WIDTH) * 100}%`}
                              y2={`${(selectedSystem.y / GALAXY_HEIGHT) * 100}%`}
                              stroke="rgba(251, 146, 60, 0.5)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          </svg>
                        )}
                      </section>
                      <aside className="flex flex-col gap-4">
                        <ShipStatusPanel ship={ship} activeMission={activeMission} />
                        <SystemInfoPanel
                          system={selectedSystem}
                          onGenerateDescription={handleGenerateDescription}
                          description={detailedDescription}
                          isLoading={descriptionLoading}
                          onJump={handleJump}
                          onEnterSystem={() => setView('SYSTEM')}
                          canJump={jumpDistance <= ship.fuel && currentSystem?.id !== selectedSystem?.id}
                          isCurrentSystem={currentSystem?.id === selectedSystem?.id}
                        />
                      </aside>
                    </main>
                );
        }
    }

    return (
        <div className="bg-slate-900 text-white font-sans min-h-screen flex flex-col bg-[url('https://source.unsplash.com/random/1920x1080/?stars,nebula')] bg-cover bg-center">
            <div className="flex flex-col flex-grow bg-black/50 min-h-0">
                <Header />
                {renderView()}
            </div>
        </div>
    );
};

// Add default export to fix the error in index.tsx
export default App;
