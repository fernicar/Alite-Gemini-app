
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
import { HyperspaceView } from './components/HyperspaceView';
import { StartScreen } from './components/StartScreen';
import { EQUIPMENT_LIST } from './data/equipment';
import { SHIPS_FOR_SALE } from './data/ships';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { audioService } from './services/audioService';
import { playerShipService } from './services/playerShipService';
import { physicsService3D } from './services/physicsService3D';
import { playerController3D } from './services/playerController3D';
import { effectsService } from './services/effectsService';
import { aiService } from './services/aiService';
import { weaponService } from './services/WeaponService';
import { damageService } from './services/DamageService';
import { salvageService } from './services/SalvageService';
import { missionService } from './services/missionService';
import { persistenceService } from './services/persistenceService';
import { Modal } from './components/Modal';
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
  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 h-full flex flex-col">
    <h2 className="font-orbitron text-md text-orange-300 border-b border-orange-300/30 pb-1 mb-2">SYSTEM INFO</h2>
    {system ? (
      <div className="flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-cyan-300">{system.name}</h3>
        <p className="text-xs text-gray-400 mb-2">{system.description}</p>
        <div className="text-xs space-y-1 mb-2">
          <p><strong>Economy:</strong> <span className="text-yellow-300">{system.economy}</span></p>
          <p><strong>Government:</strong> <span className="text-purple-300">{system.government}</span></p>
        </div>
        
        <div className="flex-grow bg-black/30 p-2 rounded-md overflow-y-auto custom-scrollbar text-xs">
          {isLoading ? (
            <p className="text-cyan-400 animate-pulse">Generating detailed briefing...</p>
          ) : (
            <MarkdownRenderer markdown={description} />
          )}
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button 
            onClick={() => { audioService.playUIClick(); onGenerateDescription(); }}
            disabled={isLoading}
            className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-1 px-2 rounded transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed text-xs h-full flex items-center justify-center"
          >
            {isLoading ? 'Loading...' : 'Get AI Briefing'}
          </button>
          {isCurrentSystem ? (
             <button onClick={() => { audioService.playUIClick(); onEnterSystem(); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-2 rounded transition duration-200 flex items-center justify-center gap-2 text-xs h-full">
                Enter System View
            </button>
          ) : (
            <button 
                onClick={() => { audioService.playUIClick(); onJump(); }} 
                disabled={!canJump}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-2 rounded transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed text-xs h-full"
            >
                <JumpIcon className="w-4 h-4" />
                Jump to System
            </button>
          )}
        </div>
      </div>
    ) : (
      <p className="text-gray-500 text-xs">Select a system to view details.</p>
    )}
  </div>
);

type View = 'START' | 'GALAXY' | 'SYSTEM' | 'DOCKED' | 'MARKETPLACE' | 'SHIPYARD' | 'OUTFITTING' | 'MISSION_BOARD' | 'GAME_OVER' | 'HYPERSPACE';

export type NpcEntity = { data: NPC; body: CANNON.Body };
export type CelestialEntity = { data: Celestial; body: CANNON.Body };
export type Target = { type: 'npc', entity: NpcEntity } | { type: 'celestial', entity: CelestialEntity } | null;

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isConfirm?: boolean;
}

const App: React.FC = () => {
    const [view, setView] = useState<View>('START');
    
    // Track how we are entering the system: 'JUMP' (Far away) or 'UNDOCK' (Near station)
    const [systemEntryMode, setSystemEntryMode] = useState<'JUMP' | 'UNDOCK'>('UNDOCK');

    const [currentSystem, setCurrentSystem] = useState<StarSystem>(initialSystem);
    const [selectedSystem, setSelectedSystem] = useState<StarSystem>(initialSystem);
    const [detailedDescription, setDetailedDescription] = useState<string>('');
    const [descriptionLoading, setDescriptionLoading] = useState<boolean>(false);
    
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const pressedKeys = useRef(new Set<string>());
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
    
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Refs for game loop
    const celestialsRef = useRef<CelestialEntity[]>([]);
    useEffect(() => { celestialsRef.current = celestials; }, [celestials]);
    const salvageRef = useRef<Salvage[]>([]);
    useEffect(() => { salvageRef.current = salvage; }, [salvage]);
    const cameraDirectionRef = useRef(new THREE.Vector3(0, 0, -1));


    // State to force re-renders when services update
    const [ship, setShip] = useState(() => playerShipService.getShip());

    const targetables = useMemo(() => npcs.map(n => ({ type: 'npc' as const, entity: n })), [npcs]);

    const handleTargetNext = useCallback(() => {
        if (targetables.length === 0) return;
        const currentIndex = target?.type === 'npc' ? targetables.findIndex(t => t.entity.data.id === target.entity.data.id) : -1;
        const nextIndex = (currentIndex + 1) % targetables.length;
        setTarget(targetables[nextIndex]);
    }, [targetables, target]);

    const [shipBody, setShipBody] = useState<CANNON.Body | null>(null);
    const shipBodyRef = useRef<CANNON.Body | null>(null);
    useEffect(() => { shipBodyRef.current = shipBody; }, [shipBody]);

    useEffect(() => {
        // Update mission service with current system ID whenever it changes
        damageService.setCurrentSystemId(currentSystem.id);
        
        // Subscribe to mission updates for global UI state
        const unsubMission = missionService.subscribe(() => {
             setActiveMission(missionService.getActiveMission());
        });
        
        // Auto-save on system change (if not start)
        if (view !== 'START' && view !== 'HYPERSPACE') {
            persistenceService.save(playerShipService.getShip(), currentSystem);
        }

        return unsubMission;
    }, [currentSystem, view]);

    useEffect(() => {
        if (view !== 'SYSTEM') {
            return;
        }
        
        const unsubPlayerShip = playerShipService.subscribe(() => setShip(playerShipService.getShip()));
        const unsubPhysics3D = physicsService3D.subscribe(() => {
            setProjectiles(physicsService3D.getProjectiles());
        });
        const unsubEffects = effectsService.subscribe(() => {
            setVisualEffects([...effectsService.getEffects()]);
        });
        const unsubSalvage = salvageService.subscribe(() => {
            setSalvage([...salvageService.getSalvage()]);
        });
        
        // Handle collisions using DamageService
        const unsubCollision = physicsService3D.onCollision(({ projectile, target }) => {
            damageService.processCollision(projectile, target);
        });

        // Handle target destruction to clear target selection
        const unsubDestruction = damageService.onTargetDestroyed((result) => {
            setTarget(currentTarget => {
                if (currentTarget?.entity.data.id === result.targetId) {
                    return null;
                }
                return currentTarget;
            });
        });

        const handleAiUpdate = () => {
            const aiNpcsData = aiService.getNpcs();
            const currentNpcEntities = npcsRef.current;
            const currentNpcMap = new Map(currentNpcEntities.map(e => [e.data.id, e]));
            
            const newEntities = aiNpcsData.map(npcData => {
                if (currentNpcMap.has(npcData.id)) {
                    const existingEntity = currentNpcMap.get(npcData.id)!;
                    // Ensure the physics body's user data is updated with the latest NPC data
                    if (existingEntity.body) {
                        (existingEntity.body as any).userData.data = npcData;
                    }
                    return { ...existingEntity, data: npcData };
                } else {
                    const body = physicsService3D.getNpcBody(npcData.id);
                    return body ? { data: npcData, body } : null;
                }
            }).filter((e): e is NpcEntity => e !== null);

            // Synchronize selected target with updated entity data
            setTarget(currentTarget => {
                if (!currentTarget || currentTarget.type !== 'npc') return currentTarget;
                const updatedEntity = newEntities.find(e => e.data.id === currentTarget.entity.data.id);
                return updatedEntity ? { ...currentTarget, entity: updatedEntity } : currentTarget;
            });

            setNpcs(newEntities);
        };
        
        const unsubAi = aiService.subscribe(handleAiUpdate);


        // Initialize Celestials (Defined here so we can reference Station position for undocking)
        // Station coordinates
        const stationPos = { x: 5000, y: 200, z: -1000 };
        const initialCelestials: Celestial[] = [
            { id: 'sun-1', type: 'Star', name: `${currentSystem.name} Prime`, position: { x: 0, y: 1000, z: -15000 }, radius: 2000 },
            { id: 'planet-1', type: 'Planet', name: `${currentSystem.name} I`, position: { x: stationPos.x, y: 200, z: 0 }, radius: 600 },
            { id: 'station-1', type: 'Station', name: `${currentSystem.name} Station`, position: stationPos, radius: 200 },
        ];

        // Initialize 3D physics for the player ship based on Entry Mode
        const currentShip = playerShipService.getShip();
        
        if (systemEntryMode === 'UNDOCK') {
            // Spawn just outside station, facing away (roughly +Z relative to station, but depends on layout)
            // Let's spawn at station Z + 400 (safe distance)
            currentShip.position = { 
                x: stationPos.x, 
                y: stationPos.y, 
                z: stationPos.z + 400 
            };
            // Set initial velocity away from station
            currentShip.velocity = { x: 0, y: 0, z: 50 };
        } else {
            // JUMP mode - standard hyperspace arrival point (0,0,0 usually or specific point)
            currentShip.position = { x: 0, y: 0, z: 0 };
            currentShip.velocity = { x: 0, y: 0, z: 0 };
        }

        // Initialize Physics with the updated ship position
        physicsService3D.initializeShip(currentShip);
        setShipBody(physicsService3D.getShipBody());
        
        // If undocking, we want to update the service immediately so the view is correct
        playerShipService.setShip(currentShip);


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
        salvageService.clearSalvage(); // Clear salvage when entering new system or mode

        return () => {
            unsubPlayerShip();
            unsubPhysics3D();
            unsubEffects();
            unsubCollision();
            unsubDestruction();
            unsubAi();
            unsubSalvage();

            if (physicsService3D.getShipBody()) {
                physicsService3D.removeBody(physicsService3D.getShipBody());
            }
            physicsService3D.shipBody = null;
            setShipBody(null);

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
    }, [view, currentSystem, systemEntryMode]); // Added systemEntryMode dependency


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
        
        // Transition to Hyperspace view first
        setView('HYPERSPACE');
        // Save immediately before jump to avoid loss
        persistenceService.save(playerShipService.getShip(), selectedSystem);
    }, [selectedSystem, currentSystem, jumpDistance]);

    const handleHyperspaceComplete = useCallback(() => {
        setCurrentSystem(selectedSystem);
        setDetailedDescription('');
        setSystemEntryMode('JUMP'); // Arriving via Hyperspace
        setView('SYSTEM');
    }, [selectedSystem]);

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
        } else { // 'unarmed' - fire lasers via WeaponService
            // Pass no arguments to fire in the ship's facing direction
            weaponService.firePlayerWeapons();
        }
    }, [ship, target, missileStatus]);

    const handleScoop = useCallback((salvageId: string) => {
        const item = salvage.find(s => s.id === salvageId);
        if (!item) return;
    
        const currentShip = playerShipService.getShip();
        const totalWeight = currentShip.cargo.reduce((acc, c) => acc + (c.quantity * c.weight), 0);
        
        if (totalWeight + (item.contents.quantity * item.contents.weight) > currentShip.cargoCapacity) {
          setModalConfig({
              isOpen: true,
              title: "Cargo Full",
              message: "Not enough cargo space!",
              onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
          });
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
    
        salvageService.removeSalvage(salvageId);
        setScoopableSalvage(null);
        
        audioService.playCargoScoopSound();
        setModalConfig({
            isOpen: true,
            title: "Cargo Acquired",
            message: `Cargo acquired: ${item.contents.quantity}T ${item.contents.name}`,
            onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
        });
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

    const handleDock = useCallback(() => {
      if (!canDock) return;
      
      // Check mission completion on dock
      const missionMessage = missionService.checkDockingCompletion(currentSystem.id);
      
      // Autosave on dock
      persistenceService.save(playerShipService.getShip(), currentSystem);

      if (missionMessage) {
          setModalConfig({
              isOpen: true,
              title: "Mission Update",
              message: missionMessage,
              onConfirm: () => {
                  setModalConfig(prev => ({...prev, isOpen: false}));
                  audioService.playDockingSound(); 
                  setView('DOCKED');
              }
          });
      } else {
          audioService.playDockingSound(); 
          setView('DOCKED');
      }

    }, [canDock, currentSystem]);
    
    const handleNewGame = useCallback(() => {
        playerShipService.reset();
        missionService.reset();
        weaponService.reset();
        salvageService.clearSalvage();
        effectsService.clearEffects();
        aiService.clearNpcs();
        physicsService3D.clearAllProjectiles();
        
        setShip(playerShipService.getShip());
        setActiveMission(null);
        setCurrentSystem(initialSystem);
        setSelectedSystem(initialSystem);
        setDetailedDescription('');
        setTarget(null);
        setMissileStatus('unarmed');
        
        // Start docked or undocking? Original Elite starts docked at Lave Station.
        // Let's start with Undocking action to put player in space immediately.
        setSystemEntryMode('UNDOCK'); 
        setView('SYSTEM'); // Skip GALAXY view, go straight to flying
        audioService.stopThrusterSound();
        persistenceService.save(playerShipService.getShip(), initialSystem);
    }, []);

    const handleContinueGame = useCallback(() => {
        const savedState = persistenceService.load();
        if (savedState) {
            playerShipService.setShip(savedState.ship);
            const savedSystem = GALAXY_MAP.find(s => s.id === savedState.systemId) || initialSystem;
            setCurrentSystem(savedSystem);
            setSelectedSystem(savedSystem);
            setSystemEntryMode('UNDOCK'); // Assume loading puts you at station for now
            setView('DOCKED'); // Load into docked view
        } else {
            handleNewGame(); // Fallback if save is corrupt/missing
        }
    }, [handleNewGame]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        
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
            if (key === 'c') {
                if (!pressedKeys.current.has('c')) {
                    handleDock();
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
    }, [view, handleTargetNext, handlePipChange, resetPips, handleArmMissile, handleFire, handleDock]);

    useEffect(() => {
        if (view === 'SYSTEM') {
            document.body.style.cursor = 'crosshair';
        } else {
            document.body.style.cursor = 'default';
        }
    }, [view]);
    
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
            playerController3D.handlePlayerInput(pressedKeys.current);
            weaponService.update(deltaTime);

            // 2. Handle AI
            aiService.update(deltaTime);
            
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

    const handleUndock = () => {
        audioService.playUndockingSound();
        setSystemEntryMode('UNDOCK');
        setView('SYSTEM');
        // Auto-save on undock
        persistenceService.save(playerShipService.getShip(), currentSystem);
    }

    const handleAcceptMission = (mission: Mission) => {
        if (activeMission) {
            setModalConfig({
                isOpen: true,
                title: "Mission Board",
                message: "You already have an active mission.",
                onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
            });
            return;
        }
        audioService.playAcceptMissionSound();
        missionService.acceptMission(mission);
        setView('DOCKED');
    };

    const renderView = () => {
        switch (view) {
            case 'START':
                return <StartScreen onNewGame={handleNewGame} onContinue={handleContinueGame} hasSave={persistenceService.hasSave()} />;
            case 'HYPERSPACE':
                return <HyperspaceView onComplete={handleHyperspaceComplete} />;
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
                  <button onClick={() => { audioService.playUIClick(); handleNewGame(); }} className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition duration-200">Try Again</button>
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
                              style={{ left: `${((GALAXY_WIDTH - system.x) / GALAXY_WIDTH) * 100}%`, top: `${((GALAXY_HEIGHT - system.y) / GALAXY_HEIGHT) * 100}%`, transform: 'translate(-50%, -50%)' }}
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
                              x1={`${((GALAXY_WIDTH - currentSystem.x) / GALAXY_WIDTH) * 100}%`}
                              y1={`${((GALAXY_HEIGHT - currentSystem.y) / GALAXY_HEIGHT) * 100}%`}
                              x2={`${((GALAXY_WIDTH - selectedSystem.x) / GALAXY_WIDTH) * 100}%`}
                              y2={`${((GALAXY_HEIGHT - selectedSystem.y) / GALAXY_HEIGHT) * 100}%`}
                              stroke="rgba(251, 146, 60, 0.5)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          </svg>
                        )}
                      </section>
                      <aside className="flex flex-col gap-2">
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
                {view !== 'START' && <Header />}
                {renderView()}
                <Modal 
                    isOpen={modalConfig.isOpen} 
                    title={modalConfig.title} 
                    message={modalConfig.message} 
                    onConfirm={modalConfig.onConfirm}
                    onCancel={modalConfig.onCancel}
                    isConfirm={modalConfig.isConfirm}
                />
            </div>
        </div>
    );
};

export default App;
