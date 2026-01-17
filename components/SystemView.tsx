
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

// Ship Dimensions mapping based on XML assets (W x H x L)
// We apply a scale factor (e.g. 0.1) to fit the scene scale.
const SHIP_DEFINITIONS: Record<string, { w: number; h: number; l: number; shape: 'wedge' | 'box' | 'cylinder' | 'saucer' }> = {
    'Adder': { w: 70, h: 18, l: 105, shape: 'wedge' },
    'Anaconda': { w: 137, h: 110, l: 312, shape: 'box' }, 
    'Asp Explorer': { w: 128, h: 39, l: 138, shape: 'wedge' },
    'Boa': { w: 113, h: 104, l: 200, shape: 'box' },
    'Cobra Mk I': { w: 146, h: 31, l: 114, shape: 'wedge' },
    'Cobra Mk III': { w: 180, h: 41, l: 90, shape: 'wedge' },
    'Fer-de-Lance': { w: 84, h: 37, l: 160, shape: 'wedge' },
    'Gecko': { w: 132, h: 24, l: 81, shape: 'wedge' },
    'Krait': { w: 180, h: 40, l: 160, shape: 'wedge' },
    'Mamba': { w: 140, h: 25, l: 118, shape: 'wedge' },
    'Python': { w: 206, h: 103, l: 336, shape: 'wedge' },
    'Sidewinder': { w: 128, h: 29, l: 68, shape: 'wedge' },
    'Thargoid': { w: 328, h: 72, l: 328, shape: 'saucer' }, // Octagon
    'Thargon': { w: 46, h: 10, l: 43, shape: 'saucer' },
    'Transporter': { w: 100, h: 33, l: 116, shape: 'box' },
    'Viper': { w: 87, h: 27, l: 96, shape: 'wedge' },
    'Viper Mk I': { w: 87, h: 27, l: 96, shape: 'wedge' },
    // Default fallback
    'default': { w: 50, h: 20, l: 80, shape: 'wedge' }
};

const SCALE_FACTOR = 0.1; 

const SystemView: React.FC<SystemViewProps> = (props) => {
  const { onReturnToGalaxy, onDock, onFire, onTargetNext, onScoop, canDock, scoopableSalvage, missileStatus } = props;
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const npcMeshes = useRef(new Map<string, THREE.Group>());
  const celestialMeshes = useRef(new Map<string, THREE.Group>());
  const projectileMeshes = useRef(new Map<string, THREE.Mesh>());
  
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
    // Initial setup, values will be updated by ResizeObserver
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
    // Camera looks down -Y, forward is -Z.
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

    // Reference Grid (XZ plane)
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

    // --- Meshes ---
    const createWedgeGeometry = (w: number, h: number, l: number) => {
        // A wedge that tapers to the front (-Z)
        // Back face vertices (Z = +l/2)
        // Front face (Z = -l/2) could be a line or point.
        // Let's make it simple: 5 vertices (pyramid on its side) or 6 (prism)
        // Standard Elite ships are often flattened wedges.
        
        // Vertices
        // 0: Nose (0, 0, -l/2)
        // 1: Back-Top-Right (w/2, h/2, l/2)
        // 2: Back-Top-Left (-w/2, h/2, l/2)
        // 3: Back-Bottom-Left (-w/2, -h/2, l/2)
        // 4: Back-Bottom-Right (w/2, -h/2, l/2)
        
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Top face (0, 1, 2)
            0, 0, -l/2,   w/2, h/2, l/2,   -w/2, h/2, l/2,
            // Right face (0, 4, 1)
            0, 0, -l/2,   w/2, -h/2, l/2,  w/2, h/2, l/2,
            // Left face (0, 2, 3)
            0, 0, -l/2,   -w/2, h/2, l/2,  -w/2, -h/2, l/2,
            // Bottom face (0, 3, 4)
            0, 0, -l/2,   -w/2, -h/2, l/2, w/2, -h/2, l/2,
            // Back face (1, 4, 3) and (1, 3, 2) - quad
            w/2, h/2, l/2, w/2, -h/2, l/2, -w/2, -h/2, l/2,
            w/2, h/2, l/2, -w/2, -h/2, l/2, -w/2, h/2, l/2
        ]);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        return geometry;
    };
    
    const createBoxGeometry = (w: number, h: number, l: number) => {
        return new THREE.BoxGeometry(w, h, l);
    };

    const createSaucerGeometry = (w: number, h: number, l: number) => {
         // Thargoid octagon
         const radius = Math.max(w, l) / 2;
         const geometry = new THREE.CylinderGeometry(radius, radius, h, 8);
         geometry.rotateX(Math.PI / 2); // Rotate to face forward? No, saucer is flat on Y usually.
         // Actually in top-down view, Cylinder(..., 8) standing up (Y axis) looks like an octagon.
         // That's perfect.
         return geometry;
    };

    const createShipMesh = (color: number, shipType: string) => {
        const group = new THREE.Group();
        
        const dims = SHIP_DEFINITIONS[shipType] || SHIP_DEFINITIONS['default'];
        const w = dims.w * SCALE_FACTOR;
        const h = dims.h * SCALE_FACTOR;
        const l = dims.l * SCALE_FACTOR;
        
        let bodyGeo: THREE.BufferGeometry;
        
        if (dims.shape === 'wedge') {
            bodyGeo = createWedgeGeometry(w, h, l);
        } else if (dims.shape === 'box') {
            bodyGeo = createBoxGeometry(w, h, l);
        } else if (dims.shape === 'saucer') {
            bodyGeo = createSaucerGeometry(w, h, l);
        } else {
            bodyGeo = createWedgeGeometry(w, h, l);
        }

        const bodyMat = new THREE.MeshPhongMaterial({ color: color, emissive: 0x001111, flatShading: true });
        const mesh = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(mesh);
        
        // Thruster glow (only for player/wedge/box)
        if (dims.shape !== 'saucer') {
            const thrusterGeo = new THREE.BoxGeometry(w * 0.6, h * 0.4, 1);
            const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
            thruster.position.z = l / 2 + 0.1; // Position at back
            group.add(thruster);
            return { group, thruster };
        }

        return { group, thruster: null };
    }

    // Player Ship
    const { group: playerGroup, thruster: playerThruster } = createShipMesh(0x00ffff, props.ship.type);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    // --- Resize Observer ---
    // Calculates available height/width of the container dynamically
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            
            // Avoid 0 divide or invalid sizes
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
        
        const { npcs, celestials, projectiles, shipBody: currentShipBody, pressedKeys } = propsRef.current;

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
            
            if (playerThruster) {
                playerThruster.visible = pressedKeys.has('w') || pressedKeys.has('arrowup');
            }
        }

        // 2. Sync NPCs
        const activeNpcIds = new Set<string>();
        npcs.forEach(npc => {
            activeNpcIds.add(npc.data.id);
            let meshGroup = npcMeshes.current.get(npc.data.id);
            
            if (!meshGroup) {
                const color = npc.data.isHostile ? 0xff4444 : 0x00ff00;
                const { group } = createShipMesh(color, npc.data.shipType);
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
                    // Station is usually a Dodecahedron or Icosahedron in Elite
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
