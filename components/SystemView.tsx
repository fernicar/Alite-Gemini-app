
import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ship, StarSystem, NPC, Salvage, Projectile, VisualEffect, Celestial } from '../types';
import { NpcEntity, CelestialEntity, Target } from '../App';
import { ShipStatusPanel } from './ShipStatusPanel';
import { StationIcon, FireIcon, SalvageIcon } from './icons';
import { TargetInfoPanel } from './TargetInfoPanel';
import { SystemViewHUD } from './SystemViewHUD';
import { playerController3D } from '../services/playerController3D';
import { physicsService3D } from '../services/physicsService3D';
import { createShipMesh } from '../utils/ship3d';

interface SystemViewProps {
  currentSystem: StarSystem;
  ship: Ship;
  onReturnToGalaxy: () => void;
  onDock: () => void;
  canDock: boolean;
  npcs: NpcEntity[];
  celestials: CelestialEntity[];
  salvage: Salvage[];
  target: Target;
  onFire: () => void;
  onTargetNext: () => void;
  onScoop: (salvageId: string) => void;
  projectiles: Projectile[];
  visualEffects: VisualEffect[];
  shipBody: CANNON.Body | null;
  pressedKeys: Set<string>;
  scoopableSalvage: Salvage | null;
  cameraDirectionRef: React.MutableRefObject<THREE.Vector3>;
  missileStatus: 'unarmed' | 'armed' | 'locked';
  energyPips: { sys: number; eng: number; wep: number };
}

const SystemView: React.FC<SystemViewProps> = (props) => {
  const { onReturnToGalaxy, onDock, onFire, onTargetNext, onScoop, canDock, scoopableSalvage, missileStatus } = props;
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const npcMeshes = useRef(new Map<string, THREE.Group>());
  const celestialMeshes = useRef(new Map<string, THREE.Group>());
  const projectileMeshes = useRef(new Map<string, THREE.Mesh>());
  const salvageMeshes = useRef(new Map<string, THREE.Mesh>());
  
  const [camera, setCamera] = useState<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [damageEffect, setDamageEffect] = useState<'hull' | 'shield' | null>(null);
  const prevShipState = useRef(props.ship);
  
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    const { ship } = propsRef.current;
    const hullDamageTaken = prevShipState.current.hull > ship.hull;
    const shieldDamageTaken = prevShipState.current.shields > ship.shields;

    if (hullDamageTaken) setDamageEffect('hull');
    else if (shieldDamageTaken) setDamageEffect('shield');

    prevShipState.current = ship;
  }, [props.ship.hull, props.ship.shields]);

  useEffect(() => {
    if (damageEffect) {
        const timer = setTimeout(() => setDamageEffect(null), 400);
        return () => clearTimeout(timer);
    }
  }, [damageEffect]);

   useEffect(() => {
    const { shipBody } = props;
    if (!mountRef.current || !shipBody) return;

    const currentMount = mountRef.current;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Orthographic Camera Setup
    const frustumSize = 400; 
    const aspect = currentMount.clientWidth / currentMount.clientHeight;
    const newCamera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,
        2000
    );
    newCamera.position.set(0, 500, 0);
    newCamera.lookAt(0, 0, 0);
    setCamera(newCamera);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x050510); 
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xaaaaaa, 2); 
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffddaa, 2);
    sunLight.position.set(50, 100, 50);
    scene.add(sunLight);

    // Reference Grid
    const gridHelper = new THREE.GridHelper(50000, 200, 0x333333, 0x111111);
    gridHelper.position.y = -50; 
    scene.add(gridHelper);

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for(let i=0; i<3000; i++) {
        starVertices.push(THREE.MathUtils.randFloatSpread(4000), -200, THREE.MathUtils.randFloatSpread(4000));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({color: 0x888888, size: 1.5});
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Player Ship - Synchronous creation
    const { group: playerGroup, thruster: playerThruster } = createShipMesh(props.ship.type, 0x00ffff);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;
    playerGroup.userData.thruster = playerThruster;


    // --- Resize Observer ---
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width === 0 || height === 0) return;

            const newAspect = width / height;
            newCamera.left = -frustumSize * newAspect / 2;
            newCamera.right = frustumSize * newAspect / 2;
            newCamera.top = frustumSize / 2;
            newCamera.bottom = -frustumSize / 2;
            newCamera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    });
    
    resizeObserver.observe(currentMount);

    // --- Animation Loop ---
    let animationFrameId: number;
    const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        const { npcs, celestials, projectiles, salvage, shipBody: currentShipBody, pressedKeys } = propsRef.current;

        // 1. Sync Player
        if (currentShipBody && playerMeshRef.current) {
            playerMeshRef.current.position.set(currentShipBody.position.x, 0, currentShipBody.position.z);
            
            playerMeshRef.current.quaternion.set(
                currentShipBody.quaternion.x,
                currentShipBody.quaternion.y,
                currentShipBody.quaternion.z,
                currentShipBody.quaternion.w
            );

            playerMeshRef.current.rotateZ(playerController3D.visualRoll);

            newCamera.position.x = currentShipBody.position.x;
            newCamera.position.z = currentShipBody.position.z;
            
            const thruster = playerMeshRef.current.userData.thruster;
            if (thruster) {
                thruster.visible = pressedKeys.has('w') || pressedKeys.has('arrowup');
            }
        }

        // 2. Sync NPCs
        const activeNpcIds = new Set<string>();
        npcs.forEach(npc => {
            activeNpcIds.add(npc.data.id);
            let meshGroup = npcMeshes.current.get(npc.data.id);
            
            if (!meshGroup) {
                const color = npc.data.isHostile ? 0xff4444 : 0x00ff00;
                const { group } = createShipMesh(npc.data.shipType, color);
                scene.add(group);
                npcMeshes.current.set(npc.data.id, group);
                meshGroup = group;
            }
            
            meshGroup.position.set(npc.body.position.x, 0, npc.body.position.z);
            meshGroup.quaternion.set(
                npc.body.quaternion.x,
                npc.body.quaternion.y,
                npc.body.quaternion.z,
                npc.body.quaternion.w
            );
        });
        
        // Remove dead NPCs
        npcMeshes.current.forEach((mesh, id) => {
            if (!activeNpcIds.has(id)) {
                scene.remove(mesh);
                npcMeshes.current.delete(id);
            }
        });

        // 3. Sync Celestials
        celestials.forEach(cel => {
            let mesh = celestialMeshes.current.get(cel.data.id);
            
            if (!mesh) {
                const group = new THREE.Group();
                let body: THREE.Mesh | undefined;
                
                if (cel.data.type === 'Station') {
                    // Station mesh (Dodecahedron)
                    body = new THREE.Mesh(
                        new THREE.IcosahedronGeometry(cel.data.radius, 0),
                        new THREE.MeshStandardMaterial({ color: 0xcccccc, wireframe: true })
                    );
                } else {
                    const color = cel.data.type === 'Star' ? 0xffddaa : 0x4466ff;
                    body = new THREE.Mesh(
                        new THREE.SphereGeometry(cel.data.radius, 16, 16),
                        new THREE.MeshStandardMaterial({ color })
                    );
                }
                
                if(body) group.add(body);
                scene.add(group);
                celestialMeshes.current.set(cel.data.id, group);
                mesh = group;
            }
            
            mesh.position.set(cel.data.position.x, -50, cel.data.position.z);
            
            if (cel.data.type === 'Station') {
                mesh.rotation.y += 0.005;
                mesh.rotation.x += 0.002;
            }
        });

        // 4. Sync Projectiles
        const activeProjIds = new Set<string>();
        projectiles.forEach(p => {
            activeProjIds.add(p.id);
            let mesh = projectileMeshes.current.get(p.id);
            
            if (!mesh) {
                const geo = new THREE.BoxGeometry(2, 2, 10);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                mesh = new THREE.Mesh(geo, mat);
                scene.add(mesh);
                projectileMeshes.current.set(p.id, mesh);
            }
            
            mesh.position.set(p.position.x, 0, p.position.z);
            
            if (p.velocity.x !== 0 || p.velocity.z !== 0) {
                 mesh.lookAt(mesh.position.x + p.velocity.x, mesh.position.y, mesh.position.z + p.velocity.z);
            }
        });
        
        projectileMeshes.current.forEach((mesh, id) => {
            if (!activeProjIds.has(id)) {
                scene.remove(mesh);
                projectileMeshes.current.delete(id);
            }
        });

        // 5. Sync Salvage (Scrap Metal/Cargo)
        const activeSalvageIds = new Set<string>();
        salvage.forEach(s => {
            activeSalvageIds.add(s.id);
            let mesh = salvageMeshes.current.get(s.id);
            
            if (!mesh) {
                // Use a Dodecahedron for generic cargo canister look, scaled down
                const geo = new THREE.DodecahedronGeometry(5);
                const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, metalness: 0.8 });
                mesh = new THREE.Mesh(geo, mat);
                scene.add(mesh);
                salvageMeshes.current.set(s.id, mesh);
            }
            
            mesh.position.set(s.position.x, s.position.y, s.position.z);
            // Slowly rotate floating debris
            mesh.rotation.x += 0.01;
            mesh.rotation.y += 0.01;
        });

        salvageMeshes.current.forEach((mesh, id) => {
            if (!activeSalvageIds.has(id)) {
                scene.remove(mesh);
                salvageMeshes.current.delete(id);
            }
        });

        renderer.render(scene, newCamera);
    };
    animate();

    return () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animationFrameId);
        if (currentMount) {
            currentMount.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };
  }, [props.shipBody]);

  const { ship } = props;
  const isCritical = ship.hull / ship.maxHull < 0.25;
  const canScoop = !!scoopableSalvage;

  const fireEnergyCost = useMemo(() => {
    return ship.slots
        .filter(s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon')
        .reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
  }, [ship.slots]);

  return (
    <div className="flex w-full h-full bg-black overflow-hidden">
      {/* Main Viewport Area */}
      <div className={`relative flex-grow h-full bg-black overflow-hidden ${
        damageEffect === 'hull' ? 'animate-hull-damage' : ''
      } ${damageEffect === 'shield' ? 'animate-shield-damage' : ''} ${
        isCritical ? 'critical-vignette' : ''
      }`}>
        {/* 3D Render Canvas */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full" />
        
        {/* HUD Overlay */}
        <SystemViewHUD {...props} camera={camera} />

        {/* Galaxy Map Button (Overlay) */}
        <div className="absolute top-4 left-4 z-10 pointer-events-auto">
            <button
                onClick={onReturnToGalaxy}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200 border border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.5)]"
            >
                Galaxy Map
            </button>
        </div>
      </div>
      
      {/* Side Panel Area (Dedicated space) */}
      <aside className="w-[350px] flex-none h-full bg-slate-900 border-l border-cyan-900/30 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2 z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.5)]">
            <ShipStatusPanel ship={ship} />
            <TargetInfoPanel target={props.target} shipBody={props.shipBody} />
            
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-2">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2">CONTROLS</h3>
                <div className="text-xs text-gray-400 space-y-1">
                    <p><b>W/S/↑/↓:</b> Thrust</p>
                    <p><b>A/D/←/→:</b> Rotate Ship</p>
                    <p><b>Space:</b> Fire Laser</p>
                    <p><b>T:</b> Next Target</p>
                    <p><b>C:</b> Dock</p>
                    <p><b>U/I/O:</b> Power Distribution</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                        onClick={onTargetNext}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1 px-2 rounded transition duration-200 border border-purple-400 text-xs"
                    >
                        Target Next
                    </button>
                    <button
                        onClick={onFire}
                        disabled={(ship.energy < fireEnergyCost && missileStatus !== 'locked') || missileStatus === 'armed'}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2 rounded transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:cursor-not-allowed border border-red-400 text-xs"
                    >
                        <FireIcon className="w-4 h-4" /> Fire
                    </button>
                    <button
                        onClick={onDock}
                        disabled={!canDock}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-2 rounded transition duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed border border-green-400 text-xs"
                    >
                        Dock
                    </button>
                    <button
                        onClick={() => scoopableSalvage && onScoop(scoopableSalvage.id)}
                        disabled={!canScoop}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded transition duration-200 disabled:bg-gray-700 disabled-cursor-not-allowed flex items-center justify-center gap-2 border border-yellow-400 text-xs"
                    >
                        <SalvageIcon className="w-4 h-4" /> Scoop
                    </button>
                </div>
            </div>
      </aside>
    </div>
  );
};

export default SystemView;
