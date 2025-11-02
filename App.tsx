

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Ship, StarSystem, NPC, Salvage, CargoItem, ShipSlot, Mission, EquipmentItem, ShipSpec, Projectile, VisualEffect, PhysicsState, Celestial } from './types';
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
import { playerShipService } from './services/playerShipService';
import { physicsService3D } from './services/physicsService3D';
import { playerController3D } from './services/playerController3D';
import { effectsService } from './services/effectsService';
import { aiService } from './services/aiService';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';


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
            onClick={() => { audioService.playUIClick(); onGenerateDescription(); }}
            disabled={isLoading}
            className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Get AI Briefing'}
          </button>
          {isCurrentSystem ? (
             <button onClick={() => { audioService.playUIClick(); onEnterSystem(); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2">
                Enter System View
            </button>
          ) : (
            <button 
                onClick={() => { audioService.playUIClick(); onJump(); }} 
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

export type NpcEntity = { data: NPC; body: CANNON.Body };
export type CelestialEntity = { data: Celestial; body: CANNON.Body };
export type Target = { type: 'npc', entity: NpcEntity } | { type: 'celestial', entity: CelestialEntity } | null;


const App: React.FC = () => {
    const [view, setView] = useState<View>('GALAXY');
    
    const [currentSystem, setCurrentSystem] = useState<StarSystem>(initialSystem);
    const [selectedSystem, setSelectedSystem] = useState<StarSystem>(initialSystem);
    const [detailedDescription, setDetailedDescription] = useState<string>('');
    const [descriptionLoading, setDescriptionLoading] = useState<boolean>(false);
    
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const pressedKeys = useRef(new Set<string>());
    const [mouseAim, setMouseAim] = useState(false);
    const [missileStatus, setMissileStatus] = useState<'unarmed' | 'armed' | 'locked'>('unarmed');

    const [npcs, setNpcs] = useState<NpcEntity[]>([]);
    const npcsRef = useRef<NpcEntity[]>([]);
    useEffect(() => { npcsRef.current = npcs; }, [npcs]);
    const [celestials, setCelestials] = useState<CelestialEntity[]>([]);
    const [target, setTarget] = useState<Target>(null);
    const [canDock, setCanDock] = useState(false);
    const [projectiles, setProjectiles] = useState<Projectile[]>([]);
    const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
    const [salvage, setSalvage] = useState<Salvage[]>([]);
    const [scoopableSalvage, setScoopableSalvage] = useState<Salvage | null>(null);

    // Refs for game loop
    const celestialsRef = useRef<CelestialEntity[]>([]);
    useEffect(() => { celestialsRef.current = celestials; }, [celestials]);
    const salvageRef = useRef<Salvage[]>([]);
    useEffect(() => { salvageRef.current = salvage; }, [salvage]);
    const mouseAimRef = useRef(mouseAim);
    useEffect(() => { mouseAimRef.current = mouseAim; }, [mouseAim]);
    const cameraDirectionRef = useRef(new THREE.Vector3(0, 0, -1));


    // State to force re-renders when services update
    const [_, forceUpdate] = useState(0);

    const targetables = useMemo(() => [...npcs.map(n => ({ type: 'npc' as const, entity: n })), ...celestials.map(c => ({ type: 'celestial' as const, entity: c }))], [npcs, celestials]);

    const handleTargetNext = useCallback(() => {
        if (targetables.length === 0) return;
        const currentIndex = target ? targetables.findIndex(t => t.entity.data.id === target.entity.data.id) : -1;
        const nextIndex = (currentIndex + 1) % targetables.length;
        setTarget(targetables[nextIndex]);
    }, [targetables, target]);

    const ship = useMemo(() => playerShipService.getShip(), [_, playerShipService]);
    const shipBody = useMemo(() => physicsService3D.getShipBody(), [_, playerShipService]);
    const shipBodyRef = useRef(shipBody);
    useEffect(() => { shipBodyRef.current = shipBody; }, [shipBody]);

    const handleHit = useCallback((projectile: Projectile, hitTarget: NPC | Ship) => {
        if ('isHostile' in hitTarget) { // It's an NPC
            const targetNpcEntity = npcsRef.current.find(n => n.data.id === hitTarget.id);
            if (!targetNpcEntity) return;

            let { shields, hull } = targetNpcEntity.data;
            
            if (shields > 0) {
                effectsService.createShieldImpact(targetNpcEntity.data.position, 0);
                const shieldDamage = Math.min(shields, projectile.damage);
                shields -= shieldDamage;
                const spillover = projectile.damage - shieldDamage;
                if (spillover > 0) hull -= spillover;
            } else {
                effectsService.createHullImpact(targetNpcEntity.data.position);
                hull -= projectile.damage;
            }

            if (hull <= 0) {
                effectsService.createExplosion(targetNpcEntity.data.position, 'large');
                audioService.playExplosionSound();
                setTarget(currentTarget => {
                    if (currentTarget?.entity.data.id === hitTarget.id) {
                        return null;
                    }
                    return currentTarget;
                });
                setSalvage(s => [...s, {
                    id: `salvage-${hitTarget.id}`,
                    contents: { name: 'Scrap Metal', quantity: Math.ceil(Math.random() * 5), weight: 1 },
                    position: targetNpcEntity.data.position,
                }]);
                aiService.removeNpc(hitTarget.id);
            } else {
                // FIX: Use `targetNpcEntity.data` which is guaranteed to be up-to-date from the component state,
                // instead of `hitTarget` which could be stale data from the physics body. This also resolves the TS error.
                const updatedNpc = { ...targetNpcEntity.data, shields, hull };
                aiService.updateNpc(updatedNpc);
            }

        } else { // It's the player
            const { type } = playerShipService.applyDamage(projectile.damage);
            const currentShipPosition = playerShipService.getShip().position;
            if (type === 'shield') {
                effectsService.createShieldImpact(currentShipPosition, 0); 
            } else {
                effectsService.createHullImpact(currentShipPosition);
            }
        }
    }, []);

    useEffect(() => {
        if (view !== 'SYSTEM') {
            return;
        }
        
        const reRender = () => forceUpdate(c => c + 1);

        const unsubPlayerShip = playerShipService.subscribe(reRender);
        const unsubPhysics3D = physicsService3D.subscribe(() => {
            setProjectiles(physicsService3D.getProjectiles());
            reRender();
        });
        const unsubEffects = effectsService.subscribe(() => {
            setVisualEffects([...effectsService.getEffects()]);
        });
        const unsubCollision = physicsService3D.onCollision(({ projectile, target }) => {
            handleHit(projectile, target as NPC | Ship);
        });

        const handleAiUpdate = () => {
            const aiNpcsData = aiService.getNpcs();
            const currentNpcEntities = npcsRef.current;
            const currentNpcMap = new Map(currentNpcEntities.map(e => [e.data.id, e]));
            
            const newEntities = aiNpcsData.map(npcData => {
                if (currentNpcMap.has(npcData.id)) {
                    const existingEntity = currentNpcMap.get(npcData.id)!;
                    return { ...existingEntity, data: npcData };
                } else {
                    physicsService3D.initializeNpc(npcData);
                    const body = physicsService3D.getNpcBody(npcData.id);
                    return body ? { data: npcData, body } : null;
                }
            }).filter((e): e is NpcEntity => e !== null);

            const newNpcIds = new Set(aiNpcsData.map(n => n.id));
            currentNpcEntities.forEach(entity => {
                if (!newNpcIds.has(entity.data.id)) {
                    physicsService3D.removeNpcBody(entity.data.id);
                }
            });
            
            setNpcs(newEntities);
        };
        
        const unsubAi = aiService.subscribe(handleAiUpdate);


        // Initialize 3D physics for the player ship
        const currentShip = playerShipService.getShip();
        physicsService3D.initializeShip(currentShip);

        // Initialize Celestials
        const initialCelestials: Celestial[] = [
            { id: 'sun-1', type: 'Star', name: `${currentSystem.name} Prime`, position: { x: 0, y: 1000, z: -15000 }, radius: 2000 },
            { id: 'planet-1', type: 'Planet', name: `${currentSystem.name} I`, position: { x: 5000, y: 200, z: 0 }, radius: 600 },
            { id: 'station-1', type: 'Station', name: `${currentSystem.name} Station`, position: { x: 5000, y: 200, z: -1000 }, radius: 200 },
        ];

        const celestialEntities: CelestialEntity[] = [];
        initialCelestials.forEach(celestial => {
            physicsService3D.initializeCelestialBody(celestial);
            const body = physicsService3D.getNpcBody(celestial.id); // Reusing getNpcBody for static bodies
             if (body) {
                celestialEntities.push({ data: celestial, body: body });
            }
        });
        setCelestials(celestialEntities);

        aiService.spawnEntities(currentSystem);

        return () => {
            unsubPlayerShip();
            unsubPhysics3D();
            unsubEffects();
            unsubCollision();
            unsubAi();

            if (physicsService3D.getShipBody()) {
                physicsService3D.removeBody(physicsService3D.getShipBody());
            }
            physicsService3D.shipBody = null;

            npcsRef.current.forEach(entity => {
                physicsService3D.removeNpcBody(entity.data.id);
            });
            celestialsRef.current.forEach(entity => {
                physicsService3D.removeNpcBody(entity.data.id);
            });
            
            physicsService3D.clearAllProjectiles();
            
            aiService.clearNpcs();
            effectsService.clearEffects();

            setNpcs([]);
            setCelestials([]);
            setSalvage([]);
            setTarget(null);
            setVisualEffects([]);
            setProjectiles([]);
        }
    }, [view, currentSystem, handleHit]);


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
        
        playerShipService.setShip({ ...currentShip, fuel: currentShip.fuel - jumpDistance });

        setCurrentSystem(selectedSystem);
        setDetailedDescription('');
    }, [selectedSystem, currentSystem, jumpDistance]);

    useEffect(() => {
        // Missile lock logic
        if (missileStatus === 'armed' && target) {
            setMissileStatus('locked');
        } else if (missileStatus === 'locked' && !target) {
            setMissileStatus('armed');
        }
    }, [target, missileStatus]);

    const handleArmMissile = useCallback(() => {
        if (ship.missiles > 0) {
            setMissileStatus(currentStatus => currentStatus === 'unarmed' ? 'armed' : 'unarmed');
        }
    }, [ship.missiles]);

    const handleFire = useCallback(() => {
        if (missileStatus === 'locked') {
            if (target && playerShipService.fireMissile()) {
                const missileDamage = 50; // TODO: from missile equipment
                physicsService3D.fireProjectile(ship.id, missileDamage, 400, 'missile', target.entity.data.id);
                audioService.playMissileLaunchSound();
                setMissileStatus('unarmed');
            }
        } else if (missileStatus === 'armed') {
            setMissileStatus('unarmed');
        } else { // 'unarmed'
            const weapons = ship.slots.filter(
                s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon'
            );
            if (weapons.length === 0) return;
        
            const totalEnergyCost = weapons.reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
            if (ship.energy < totalEnergyCost) return;
        
            playerShipService.useEnergy(totalEnergyCost);
            audioService.playLaserSound();
        
            const totalDamage = weapons.reduce((acc, s) => acc + (s.equippedItem?.stats?.damage || 0), 0);
            
            // Pass camera direction to `fireProjectile` for parallax correction.
            // When firing lasers, we aim with the reticle, so targetId should be undefined.
            physicsService3D.fireProjectile(ship.id, totalDamage, 800, 'laser', undefined, cameraDirectionRef.current);
        }
    }, [ship, target, missileStatus]);

    const handleScoop = useCallback((salvageId: string) => {
        const item = salvage.find(s => s.id === salvageId);
        if (!item) return;
    
        const currentShip = playerShipService.getShip();
        const totalWeight = currentShip.cargo.reduce((acc, c) => acc + (c.quantity * c.weight), 0);
        
        if (totalWeight + (item.contents.quantity * item.contents.weight) > currentShip.cargoCapacity) {
          alert("Not enough cargo space!");
          return;
        }
    
        const newCargo = [...currentShip.cargo];
        const existing = newCargo.find(c => c.name === item.contents.name);
        if (existing) {
            existing.quantity += item.contents.quantity;
        } else {
            newCargo.push(item.contents);
        }
        playerShipService.setShip({ ...currentShip, cargo: newCargo });
    
        setSalvage(prev => prev.filter(s => s.id !== salvageId));
        setScoopableSalvage(null);
        
        audioService.playCargoScoopSound();
        alert(`Cargo acquired: ${item.contents.quantity}T ${item.contents.name}`);
    }, [salvage]);

    const handlePipChange = useCallback((system: 'sys' | 'eng' | 'wep') => {
        const pips = { ...ship.energyPips };
        if (pips[system] >= 4) return;
    
        const takeFrom: ('sys' | 'eng' | 'wep')[] = [];
        if (system === 'sys') takeFrom.push('wep', 'eng');
        if (system === 'eng') takeFrom.push('wep', 'sys');
        if (system === 'wep') takeFrom.push('eng', 'sys');

        let taken = false;
        for (const source of takeFrom) {
            if (pips[source] > 0) {
                pips[source]--;
                pips[system]++;
                taken = true;
                break;
            }
        }
        
        if (taken) {
            playerShipService.setEnergyPips(pips);
            audioService.playPipChangeSound();
        }
    }, [ship]);

    const resetPips = useCallback(() => {
        playerShipService.setEnergyPips({ sys: 2, eng: 2, wep: 2 });
        audioService.playPipChangeSound();
    }, []);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        
        if (key === 'm') {
            if (!pressedKeys.current.has('m')) {
                setMouseAim(prev => !prev);
            }
        }
        
        if (view === 'SYSTEM') {
            if (key === 't') handleTargetNext();
            if (key === 'u') handlePipChange('sys');
            if (key === 'i') handlePipChange('eng');
            if (key === 'o') handlePipChange('wep');
            if (key === 'p') resetPips();
            if (key === 'n') {
                if (!pressedKeys.current.has('n')) {
                    handleArmMissile();
                }
            }
            if (key === ' ') {
                e.preventDefault();
                if (!pressedKeys.current.has(' ')) {
                    handleFire();
                }
            }
        }
        
        pressedKeys.current.add(key);
      };
      const handleKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase());

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, [view, handleTargetNext, handlePipChange, resetPips, handleArmMissile, handleFire]);

    useEffect(() => {
        if (view === 'SYSTEM' && mouseAim) {
            document.body.style.cursor = 'none';
        } else {
            document.body.style.cursor = 'default';
        }
    }, [view, mouseAim]);
    
    useEffect(() => {
        if (view === 'SYSTEM') {
            playerController3D.init();
            return () => {
                playerController3D.destroy();
            }
        }
    }, [view]);

    useEffect(() => {
        if (view !== 'SYSTEM') {
            audioService.stopThrusterSound();
            return;
        }
        
        audioService.startThrusterSound();
        
        let animationFrameId: number;
        let lastTime = performance.now();

        const gameLoop = (timestamp: number) => {
            const deltaTime = (timestamp - lastTime) / 1000; // seconds
            lastTime = timestamp;

            // 1. Handle player input
            playerController3D.handlePlayerInput(pressedKeys.current, mouseAimRef.current);

            // 2. Handle simple NPC AI
            npcsRef.current.forEach(npc => {
                if (Math.random() < 0.01) {
                    physicsService3D.applyNpcYaw(npc.data.id, (Math.random() - 0.5) * 0.5);
                }
                if (npc.data.type === 'Pirate' || npc.data.type === 'Trader') {
                    if (Math.random() < 0.02) {
                       physicsService3D.applyNpcThrust(npc.data.id, Math.random() * 0.3 + 0.1);
                    }
                }
            });
            
            // 3. Step the 3D physics simulation
            physicsService3D.update(deltaTime);
            effectsService.update(deltaTime);
            playerShipService.rechargeSystems(deltaTime);


            // 4. Check for docking proximity and scoopable salvage
            if (shipBodyRef.current) {
                const station = celestialsRef.current.find(c => c.data.type === 'Station')?.body;
                if (station) {
                    const distance = shipBodyRef.current.position.distanceTo(station.position);
                    const speed = shipBodyRef.current.velocity.length();
                    setCanDock(distance < 250 && speed < 50);
                }

                let closestSalvage: Salvage | null = null;
                let minSalvageDist = 100; // scoop range
                salvageRef.current.forEach(s => {
                    const salvagePos = new CANNON.Vec3(s.position.x, s.position.y, s.position.z);
                    const dist = shipBodyRef.current.position.distanceTo(salvagePos);
                    if (dist < minSalvageDist) {
                        minSalvageDist = dist;
                        closestSalvage = s;
                    }
                });
                setScoopableSalvage(closestSalvage);
            }
            
            // 5. Update thruster sound based on input
            const thrustInput = (pressedKeys.current.has('w') || pressedKeys.current.has('arrowup') ? 1 : (pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown') ? -0.5 : 0));
            audioService.updateThrusterSound(thrustInput);
    
            animationFrameId = requestAnimationFrame(gameLoop);
        };
    
        animationFrameId = requestAnimationFrame(gameLoop);
    
        return () => {
            cancelAnimationFrame(animationFrameId);
            audioService.stopThrusterSound();
        };
    }, [view]);


    useEffect(() => {
      if (ship.hull <= 0 && view !== 'GAME_OVER') {
        audioService.playExplosionSound();
        audioService.playGameOverSound();
        setView('GAME_OVER');
      }
    }, [ship.hull, view]);

    const handleDock = () => {
      if (!canDock) return;
      if (activeMission && activeMission.status === 'Completed' && activeMission.systemId === currentSystem.id) {
          const currentShip = playerShipService.getShip();
          playerShipService.setShip({ ...currentShip, credits: currentShip.credits + activeMission.reward });
          alert(`Mission Complete! ${activeMission.reward.toLocaleString()} credits awarded.`);
          setActiveMission(null);
      }
      audioService.playDockingSound(); 
      setView('DOCKED');
    }

    const handleUndock = () => {
        audioService.playUndockingSound();
        setView('SYSTEM');
    }

    const handleAcceptMission = (mission: Mission) => {
        if (activeMission) {
            alert("You already have an active mission.");
            return;
        }
        audioService.playAcceptMissionSound();
        setActiveMission({ ...mission, status: 'InProgress' });
        setView('DOCKED');
    };

    const renderView = () => {
        switch (view) {
            case 'SYSTEM':
                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%', flexGrow: 1 }}>
                    <SystemView
                        cameraDirectionRef={cameraDirectionRef}
                        currentSystem={currentSystem}
                        ship={ship}
                        onReturnToGalaxy={() => setView('GALAXY')}
                        onDock={handleDock}
                        canDock={canDock}
                        npcs={npcs}
                        celestials={celestials}
                        salvage={salvage}
                        target={target}
                        onFire={handleFire}
                        onTargetNext={handleTargetNext}
                        onScoop={handleScoop}
                        projectiles={projectiles}
                        visualEffects={visualEffects}
                        shipBody={shipBody}
                        pressedKeys={pressedKeys.current}
                        mouseAim={mouseAim}
                        scoopableSalvage={scoopableSalvage}
                        missileStatus={missileStatus}
                        energyPips={ship.energyPips}
                    />
                  </div>
                );
            case 'DOCKED':
                return <DockedView currentSystem={currentSystem} ship={ship} onUndock={handleUndock} onViewMarketplace={() => setView('MARKETPLACE')} onViewShipyard={() => setView('SHIPYARD')} onViewOutfitting={() => setView('OUTFITTING')} onViewMissionBoard={() => setView('MISSION_BOARD')} />;
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
                  <button onClick={() => { audioService.playUIClick(); window.location.reload(); }} className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded">Try Again</button>
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
                                onClick={() => { audioService.playUIClick(); handleSelectSystem(system); }}
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