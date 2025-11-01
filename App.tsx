
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Ship, StarSystem, NPC, Salvage, CargoItem, ShipSlot, Mission, EquipmentItem, ShipSpec } from './types';
import { generateSystemDescription } from './services/geminiService';
import { getGalaxy, GALAXY_WIDTH, GALAXY_HEIGHT } from './services/galaxyService';
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
import { aiService } from './services/aiService';
import { combatCoordinator } from './services/combatCoordinator';
import { playerShipService } from './services/playerShipService';


const GALAXY_MAP = getGalaxy();
const initialSystem = GALAXY_MAP.find(s => s.name === 'Lave') || GALAXY_MAP[0];

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

const App: React.FC = () => {
    const [view, setView] = useState<View>('GALAXY');
    
    const [currentSystem, setCurrentSystem] = useState<StarSystem>(initialSystem);
    const [selectedSystem, setSelectedSystem] = useState<StarSystem>(initialSystem);
    const [detailedDescription, setDetailedDescription] = useState<string>('');
    const [descriptionLoading, setDescriptionLoading] = useState<boolean>(false);
    
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const pressedKeys = useRef(new Set<string>());

    // State to force re-renders when services update
    const [_, forceUpdate] = useState(0);

    useEffect(() => {
        const reRender = () => forceUpdate(c => c + 1);

        const unsubAi = aiService.subscribe(reRender);
        const unsubCombat = combatCoordinator.subscribe(reRender);
        const unsubPlayerShip = playerShipService.subscribe(reRender);

        return () => {
            unsubAi();
            unsubCombat();
            unsubPlayerShip();
        }
    }, []);

    const ship = useMemo(() => playerShipService.getShip(), [_, playerShipService]);
    const npcs = useMemo(() => aiService.getNpcs(), [_, aiService]);
    const target = useMemo(() => combatCoordinator.getTarget(), [_, combatCoordinator]);
    const salvage = useMemo(() => combatCoordinator.getSalvage(), [_, combatCoordinator]);

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
        const currentShip = playerShipService.getShip();
        if (!selectedSystem || !currentSystem || currentShip.fuel < jumpDistance) return;
        
        audioService.playJumpSound();
        playerShipService.setShip({ ...currentShip, fuel: currentShip.fuel - jumpDistance, position: {x:0, y:0}, velocity: {x:0, y:0} });
        setCurrentSystem(selectedSystem);
        setDetailedDescription('');
        aiService.clearNpcs();
        combatCoordinator.clearSalvage();
        combatCoordinator.setTarget(null);
    }, [selectedSystem, currentSystem, jumpDistance]);

    useEffect(() => {
        if (view === 'SYSTEM' && aiService.getNpcCount() === 0 && !aiService.isSystemCleared()) {
            aiService.spawnEntities(currentSystem);
        }
    }, [view, currentSystem]);

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
            const currentShip = playerShipService.getShip();
            // AI decides what to do
            const actions = aiService.update(currentShip);
            // Combat coordinator executes actions and updates world state
            combatCoordinator.update(actions);
            
            const damageToPlayer = combatCoordinator.getAndClearDamageToPlayer();
            playerShipService.updateShip(pressedKeys.current, damageToPlayer);

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
        const { targetDestroyed } = combatCoordinator.handlePlayerAttack();
    
        if (targetDestroyed) {
            audioService.playExplosionSound();
            if (activeMission && activeMission.type === 'Bounty' && activeMission.status === 'InProgress') {
                if (target.type === activeMission.targetNPC?.type && currentSystem.id === activeMission.systemId) {
                    setActiveMission(prev => prev ? ({ ...prev, status: 'Completed' }) : null);
                    alert(`Target ${activeMission.title} destroyed! Return to a station in this system to claim your reward.`);
                }
            }
        }
    };

    const handleTargetNext = () => {
        combatCoordinator.targetNextEnemy();
    };

    const handleScoop = (salvageId: string) => {
      combatCoordinator.scoopSalvage(salvageId);
    };

    const handleDock = () => {
      if (activeMission && activeMission.status === 'Completed' && activeMission.systemId === currentSystem.id) {
          const currentShip = playerShipService.getShip();
          playerShipService.setShip({ ...currentShip, credits: currentShip.credits + activeMission.reward });
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
                return <MarketplaceView currentSystem={currentSystem} ship={ship} onReturnToStation={() => setView('DOCKED')} />;
            case 'SHIPYARD':
                return <ShipyardView currentSystem={currentSystem} ship={ship} onReturnToStation={() => setView('DOCKED')} />;
            case 'OUTFITTING':
                return <OutfittingView currentSystem={currentSystem} ship={ship} onReturnToStation={() => setView('DOCKED')} />;
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

export default App;
