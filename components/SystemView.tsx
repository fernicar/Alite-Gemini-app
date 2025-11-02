

import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ship, StarSystem, NPC, Salvage, Projectile, VisualEffect, Celestial } from '../types';
import { NpcEntity, CelestialEntity, Target } from '../App';
import { ShipStatusPanel } from './ShipStatusPanel';
import { StationIcon, FireIcon, SalvageIcon } from './icons';
import { TargetInfoPanel } from './TargetInfoPanel';
import { audioService } from '../services/audioService';
import { SystemViewHUD } from './SystemViewHUD';

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
  mouseAim: boolean;
  scoopableSalvage: Salvage | null;
  cameraDirectionRef: React.MutableRefObject<THREE.Vector3>;
  missileStatus: 'unarmed' | 'armed' | 'locked';
  energyPips: { sys: number; eng: number; wep: number };
}

const SystemView: React.FC<SystemViewProps> = (props) => {
  const { onReturnToGalaxy, onDock, onFire, onTargetNext, onScoop, canDock, scoopableSalvage, missileStatus } = props;
  const mountRef = useRef<HTMLDivElement>(null);
  const npcMeshes = useRef(new Map<string, THREE.Group>());
  const celestialMeshes = useRef(new Map<string, THREE.Group>());
  const projectileMeshes = useRef(new Map<string, THREE.Mesh>());
  const effectMeshes = useRef(new Map<string, THREE.Object3D>());
  const salvageMeshes = useRef(new Map<string, THREE.Mesh>());
  const targetIndicatorRef = useRef<THREE.BoxHelper | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);

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
    if (propsRef.current.pressedKeys.has('c')) {
      propsRef.current.onDock();
    }
   }, [props.pressedKeys, props.onDock]);

  useEffect(() => {
    const { shipBody } = props;
    if (!mountRef.current || !shipBody) return;

    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const newCamera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 50000);
    setCamera(newCamera);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000); // Set background to black
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
    scene.add(ambientLight);
    
    // Sun
    const sun = props.celestials.find(c => c.data.type === 'Star');
    if (sun) {
        const sunLight = new THREE.PointLight(0xffddaa, 3, 100000);
        sunLight.position.set(sun.data.position.x, sun.data.position.y, sun.data.position.z);
        scene.add(sunLight);
    }


    // Starfield
    const starVertices = [];
    for (let i = 0; i < 20000; i++) { // Increased star count
        const x = THREE.MathUtils.randFloatSpread(50000); // Increased spread
        const y = THREE.MathUtils.randFloatSpread(50000);
        const z = THREE.MathUtils.randFloatSpread(50000);
        starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 2.5 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Player Ship Model
    const playerShipMesh = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x003333 });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 25), bodyMat);
    playerShipMesh.add(mainBody);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), bodyMat);
    cockpit.position.set(0, 2.5, 8);
    playerShipMesh.add(cockpit);
    scene.add(playerShipMesh);
    
    // Main Thruster Effect
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const thrusterFlame = new THREE.Mesh(new THREE.ConeGeometry(2.5, 20, 8), thrusterMat);
    thrusterFlame.position.z = -22.5; // At the back of the ship
    thrusterFlame.rotation.x = Math.PI / 2;
    thrusterFlame.visible = false;
    playerShipMesh.add(thrusterFlame);
    
    // Celestial Meshes
    props.celestials.forEach(cel => {
        const group = new THREE.Group();
        let mesh: THREE.Mesh | undefined;
        switch(cel.data.type) {
            case 'Star':
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(cel.data.radius, 32, 32),
                    new THREE.MeshPhongMaterial({ color: 0xffddaa, emissive: 0xffddaa, emissiveIntensity: 2 })
                );
                break;
            case 'Planet':
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(cel.data.radius, 32, 32),
                    new THREE.MeshPhongMaterial({ color: 0x4466ff })
                );
                break;
            case 'Station':
                const stationGroup = new THREE.Group();
                const stationMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
                const ringGeo = new THREE.TorusGeometry(cel.data.radius, 15, 8, 12);
                const ring1 = new THREE.Mesh(ringGeo, stationMat);
                stationGroup.add(ring1);
                const coreGeo = new THREE.CylinderGeometry(20, 20, 200, 12);
                const core = new THREE.Mesh(coreGeo, stationMat);
                core.rotation.x = Math.PI / 2;
                stationGroup.add(core);
                group.add(stationGroup);
                break;
        }
        if(mesh) group.add(mesh);

        group.position.set(cel.data.position.x, cel.data.position.y, cel.data.position.z);
        scene.add(group);
        celestialMeshes.current.set(cel.data.id, group);
    });

    // Target Indicator
    targetIndicatorRef.current = new THREE.BoxHelper(new THREE.Object3D(), 0x00ff00);
    targetIndicatorRef.current.visible = false;
    scene.add(targetIndicatorRef.current);

    // Camera smoothing variables
    const currentCameraPosition = new THREE.Vector3();
    const currentLookat = new THREE.Vector3();
    
    const handleResize = () => {
        if (currentMount) {
            newCamera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            newCamera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Call once initially to set size

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        const { npcs, projectiles, visualEffects, salvage, target, pressedKeys, shipBody: currentShipBody, cameraDirectionRef } = propsRef.current;

        // Rotate station
        const stationMesh = celestialMeshes.current.get('station-1');
        if (stationMesh) {
            stationMesh.rotation.z += 0.002;
        }

        if (currentShipBody) {
            playerShipMesh.position.copy(currentShipBody.position as unknown as THREE.Vector3);
            playerShipMesh.quaternion.copy(currentShipBody.quaternion as unknown as THREE.Quaternion);

            // Thruster visibility
            thrusterFlame.visible = pressedKeys.has('w') || pressedKeys.has('arrowup');
            if (thrusterFlame.visible) {
                 thrusterFlame.scale.set(1, 1, 1 + Math.random() * 0.2); // Flicker effect
            }
            
            // Smoother camera follow (third-person view)
            const cameraOffset = new THREE.Vector3(0, 25, 60);
            const worldOffset = cameraOffset.clone().applyQuaternion(playerShipMesh.quaternion);
            const targetPosition = playerShipMesh.position.clone().add(worldOffset);
            
            currentCameraPosition.lerp(targetPosition, 0.1);
            newCamera.position.copy(currentCameraPosition);

            const lookAtTarget = playerShipMesh.position.clone();
            
            currentLookat.lerp(lookAtTarget, 0.15);
            newCamera.lookAt(currentLookat);

            newCamera.getWorldDirection(cameraDirectionRef.current);
        }

        // NPC ship sync
        npcs.forEach(npc => {
            let mesh = npcMeshes.current.get(npc.data.id);
            if (!mesh) {
                const npcMesh = new THREE.Group();
                const color = npc.data.isHostile ? 0xff4444 : 0x44ff44;
                const emissiveColor = npc.data.isHostile ? 0x550000 : 0x005500;
                const npcMat = new THREE.MeshPhongMaterial({ color, emissive: emissiveColor });
                const npcBody = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 6).rotateX(Math.PI / 2), npcMat);
                npcMesh.add(npcBody);
                scene.add(npcMesh);
                npcMeshes.current.set(npc.data.id, npcMesh);
                mesh = npcMesh;
            }
            mesh.position.copy(npc.body.position as unknown as THREE.Vector3);
            mesh.quaternion.copy(npc.body.quaternion as unknown as THREE.Quaternion);
        });
         const currentNpcIds = new Set(npcs.map(n => n.data.id));
        npcMeshes.current.forEach((mesh, id) => {
            if (!currentNpcIds.has(id)) {
                scene.remove(mesh);
                npcMeshes.current.delete(id);
            }
        });


        // Sync projectiles
        projectiles.forEach(p => {
            let mesh = projectileMeshes.current.get(p.id);
            if (!mesh) {
                if (p.type === 'missile') {
                    const geo = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
                    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaaaaa });
                    mesh = new THREE.Mesh(geo, mat);
                } else { // laser
                    const geo = new THREE.SphereGeometry(0.5, 8, 8);
                    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                    mesh = new THREE.Mesh(geo, mat);
                }
                
                mesh.position.set(p.position.x, p.position.y, p.position.z);
                scene.add(mesh);
                projectileMeshes.current.set(p.id, mesh);
            }
            mesh.position.set(p.position.x, p.position.y, p.position.z);
            if (p.type === 'missile' && p.velocity) {
                // Orient missile
                const dir = new THREE.Vector3(p.velocity.x, p.velocity.y, p.velocity.z).normalize();
                if (dir.lengthSq() > 0) {
                  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                }
            }
        });
        const currentProjectileIds = new Set(projectiles.map(p => p.id));
        projectileMeshes.current.forEach((mesh, id) => {
            if (!currentProjectileIds.has(id)) {
                scene.remove(mesh);
                projectileMeshes.current.delete(id);
            }
        });

        // Sync visual effects
        visualEffects.forEach(effect => {
            let mesh = effectMeshes.current.get(effect.id);
            if (!mesh) {
                if (effect.type === 'explosion') {
                    const geo = new THREE.SphereGeometry(1, 16, 16);
                    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 1 });
                    mesh = new THREE.Mesh(geo, mat);
                } else if (effect.type === 'shield_impact') {
                    const geo = new THREE.SphereGeometry(1, 16, 16);
                    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
                    mesh = new THREE.Mesh(geo, mat);
                } else if (effect.type === 'hull_impact') {
                    const geo = new THREE.SphereGeometry(0.5, 8, 8);
                    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
                    mesh = new THREE.Mesh(geo, mat);
                }
                
                if (mesh) {
                    mesh.position.set(effect.position.x, effect.position.y, effect.position.z);
                    scene.add(mesh);
                    effectMeshes.current.set(effect.id, mesh);
                }
            }
            if (mesh) {
                const lifeProgress = 1 - (effect.remainingLife / effect.maxLife);
                const scale = effect.maxSize * lifeProgress;
                mesh.scale.set(scale, scale, scale);
                if ((mesh as THREE.Mesh).material) {
                    ((mesh as THREE.Mesh).material as THREE.Material & { opacity: number }).opacity = 1 - lifeProgress;
                }
            }
        });
        const currentEffectIds = new Set(visualEffects.map(e => e.id));
        effectMeshes.current.forEach((mesh, id) => {
            if (!currentEffectIds.has(id)) {
                scene.remove(mesh);
                effectMeshes.current.delete(id);
            }
        });

        // Sync salvage
        salvage.forEach(s => {
            let mesh = salvageMeshes.current.get(s.id);
            if (!mesh) {
                const geo = new THREE.BoxGeometry(3, 3, 3);
                const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(s.position.x, s.position.y, s.position.z);
                scene.add(mesh);
                salvageMeshes.current.set(s.id, mesh);
            }
            mesh.rotation.y += 0.01;
        });
        const currentSalvageIds = new Set(salvage.map(s => s.id));
        salvageMeshes.current.forEach((mesh, id) => {
            if (!currentSalvageIds.has(id)) {
                scene.remove(mesh);
                salvageMeshes.current.delete(id);
            }
        });


        // Update target indicator
        if (target && targetIndicatorRef.current) {
            let targetMesh: THREE.Object3D | undefined;
            if (target.type === 'npc') {
                targetMesh = npcMeshes.current.get(target.entity.data.id);
            } else if (target.type === 'celestial') {
                targetMesh = celestialMeshes.current.get(target.entity.data.id);
            }
            
            if (targetMesh) {
                targetIndicatorRef.current.setFromObject(targetMesh);
                targetIndicatorRef.current.visible = true;
            } else {
                targetIndicatorRef.current.visible = false;
            }
        } else if (targetIndicatorRef.current) {
            targetIndicatorRef.current.visible = false;
        }


        renderer.render(scene, newCamera);
    };
    animate();

    // Cleanup
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        
        npcMeshes.current.forEach(mesh => scene.remove(mesh));
        celestialMeshes.current.forEach(mesh => scene.remove(mesh));
        projectileMeshes.current.forEach(mesh => scene.remove(mesh));
        effectMeshes.current.forEach(mesh => scene.remove(mesh));
        salvageMeshes.current.forEach(mesh => scene.remove(mesh));
        npcMeshes.current.clear();
        celestialMeshes.current.clear();
        projectileMeshes.current.clear();
        effectMeshes.current.clear();
        salvageMeshes.current.clear();
        
        if (currentMount && renderer.domElement) {
            currentMount.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };
  }, [props.shipBody]);

  const { ship, currentSystem, mouseAim } = props;
  const isCritical = ship.hull / ship.maxHull < 0.25;

  const isDockingHazardous = false; // TODO
  const canScoop = !!scoopableSalvage;

  const fireEnergyCost = useMemo(() => {
    return ship.slots
        .filter(s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon')
        .reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
  }, [ship.slots]);

  return (
    <div className={`w-full h-full relative ${
        damageEffect === 'hull' ? 'animate-hull-damage' : ''
      } ${damageEffect === 'shield' ? 'animate-shield-damage' : ''} ${
        isCritical ? 'critical-vignette' : ''
      }`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-[1fr_350px] pointer-events-none">
        <section className="bg-transparent rounded-lg relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
            <button
                onClick={onReturnToGalaxy}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
                Galaxy Map
            </button>
            </div>
        </section>

        <aside className="space-y-4 flex flex-col z-10 p-4 pointer-events-auto">
            <ShipStatusPanel ship={ship} />
            <TargetInfoPanel target={props.target} shipBody={props.shipBody} />
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-2">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2">CONTROLS</h3>
                <div className="text-xs text-gray-400 space-y-1">
                    <p><b>W/↑:</b> Thrust | <b>S/↓:</b> Reverse</p>
                    <p><b>A/←:</b> Yaw Left | <b>D/→:</b> Yaw Right</p>
                    <p><b>R/F:</b> Pitch | <b>Shift+A/D:</b> Roll</p>
                    <p><b>Q/E:</b> Strafe L/R | <b>PgUp/Ctrl:</b> Strafe U/D</p>
                    <p><b>M:</b> Mouse Aim ({mouseAim ? 'ON' : 'OFF'}) | <b>T:</b> Next Target</p>
                    <p><b>Space:</b> Fire | <b>N:</b> Arm Missile</p>
                    <p><b>C:</b> Dock | <b>U/I/O:</b> Pips (SYS/ENG/WEP) | <b>P:</b> Reset</p>
                </div>
                <button
                    onClick={onTargetNext}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Target Next
                </button>
                <button
                    onClick={onFire}
                    disabled={(ship.energy < fireEnergyCost && missileStatus !== 'locked') || missileStatus === 'armed'}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <FireIcon className="w-5 h-5" /> Fire
                </button>
                <button
                    onClick={onDock}
                    disabled={!canDock}
                    title={isDockingHazardous ? "Cannot dock: hostiles nearby" : (canDock ? "Proceed to docking (C)" : "Move closer to station to dock")}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Dock at Station
                </button>
                <button
                    onClick={() => scoopableSalvage && onScoop(scoopableSalvage.id)}
                    disabled={!canScoop}
                    title={canScoop ? `Scoop ${scoopableSalvage.contents.name}` : "No salvage in range"}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled-cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <SalvageIcon className="w-5 h-5" /> Scoop
                </button>
            </div>
        </aside>
      </div>
      <SystemViewHUD {...props} camera={camera} />
    </div>
  );
};

export default SystemView;