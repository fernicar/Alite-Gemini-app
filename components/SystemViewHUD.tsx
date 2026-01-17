
import React, { useEffect, useRef, useState } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Target, NpcEntity, CelestialEntity } from '../App';
import { Salvage } from '../types';

interface SystemViewHUDProps {
  shipBody: CANNON.Body | null;
  pressedKeys: Set<string>;
  target: Target;
  energyPips: { sys: number; eng: number; wep: number };
  camera: THREE.Camera | null;
  npcs: NpcEntity[];
  celestials: CelestialEntity[];
  salvage: Salvage[];
}

const Pip: React.FC<{ active: boolean }> = ({ active }) => (
    <div className={`w-2 h-3 border border-cyan-400 ${active ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'bg-transparent opacity-30'}`} />
);

export const SystemViewHUD: React.FC<SystemViewHUDProps> = ({ shipBody, energyPips, npcs, celestials, salvage }) => {
  const [velocity, setVelocity] = useState(0);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const panoramicCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Main HUD Loop for Radars ---
  useEffect(() => {
      if (!shipBody) return;

      let animationFrameId: number;

      const render = () => {
          // 1. Calculate Player's Inverse Rotation
          // This transforms world coordinates into "Ship Local" coordinates.
          // In Ship Local: (0,0,-Z) is Forward, (X,0,0) is Right.
          const inverseRotation = shipBody.quaternion.inverse();

          const transformToLocal = (worldPos: CANNON.Vec3): CANNON.Vec3 => {
              const relativePos = worldPos.vsub(shipBody.position);
              return inverseRotation.vmult(relativePos);
          };

          // --- Circular Radar (Tactical) ---
          const radarCanvas = radarCanvasRef.current;
          if (radarCanvas) {
              const ctx = radarCanvas.getContext('2d');
              if (ctx) {
                  ctx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
                  
                  const radarRadius = 70;
                  const center = { x: radarCanvas.width / 2, y: radarCanvas.height / 2 };
                  const range = 3000; // 3km radar range
                  const scale = radarRadius / range;

                  // Draw Background
                  ctx.fillStyle = 'rgba(0, 20, 30, 0.8)';
                  ctx.beginPath();
                  ctx.arc(center.x, center.y, radarRadius, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
                  ctx.lineWidth = 1;
                  ctx.stroke();

                  // Draw Player Marker (Fixed in center, pointing up)
                  ctx.fillStyle = '#ffffff';
                  ctx.beginPath();
                  ctx.moveTo(center.x, center.y - 4);
                  ctx.lineTo(center.x - 3, center.y + 3);
                  ctx.lineTo(center.x + 3, center.y + 3);
                  ctx.fill();

                  // Helper to draw blips
                  const drawBlip = (worldPos: CANNON.Vec3, color: string, size: number) => {
                      const localPos = transformToLocal(worldPos);
                      
                      // In local space: -Z is forward (Up on screen), +X is right
                      // Canvas Y is down. So Canvas Y = localPos.z
                      let bx = localPos.x * scale;
                      let by = localPos.z * scale;

                      // Clamp to circle if out of range
                      const dist = Math.sqrt(bx*bx + by*by);
                      if (dist > radarRadius - 2) {
                          const angle = Math.atan2(by, bx);
                          bx = Math.cos(angle) * (radarRadius - 2);
                          by = Math.sin(angle) * (radarRadius - 2);
                      }

                      ctx.fillStyle = color;
                      ctx.beginPath();
                      ctx.arc(center.x + bx, center.y + by, size, 0, Math.PI * 2);
                      ctx.fill();
                      
                      // Height stalk
                      if (Math.abs(localPos.y) > 100) {
                          ctx.beginPath();
                          ctx.moveTo(center.x + bx, center.y + by);
                          // Stalk goes UP if object is above, DOWN if below
                          // On canvas, UP is negative Y.
                          // If local.y > 0 (above), stalk should go down to the plane? 
                          // Convention: Stalk extends from the plane TO the blip.
                          // Let's keep it simple: small line indicating up/down
                          const stalkLen = Math.min(10, Math.abs(localPos.y) / 100);
                          const dir = localPos.y > 0 ? -1 : 1;
                          ctx.lineTo(center.x + bx, center.y + by + (stalkLen * dir * 5));
                          ctx.strokeStyle = color;
                          ctx.lineWidth = 1;
                          ctx.stroke();
                      }
                  };

                  celestials.forEach(c => drawBlip(c.body.position, c.data.type === 'Station' ? '#00ffff' : '#ffff00', c.data.type === 'Station' ? 3 : 4));
                  npcs.forEach(n => drawBlip(n.body.position, n.data.isHostile ? '#ff0000' : '#00ff00', 2.5));
              }
          }

          // --- Panoramic Radar (Top Bar) ---
          const panoCanvas = panoramicCanvasRef.current;
          if (panoCanvas) {
              const ctx = panoCanvas.getContext('2d');
              if (ctx) {
                  ctx.clearRect(0, 0, panoCanvas.width, panoCanvas.height);
                  const width = panoCanvas.width;
                  const height = panoCanvas.height;

                  // Background
                  ctx.fillStyle = 'rgba(0, 20, 30, 0.5)';
                  ctx.fillRect(0, 0, width, height);
                  ctx.strokeStyle = '#005f6b';
                  ctx.strokeRect(0, 0, width, height);

                  // Center Marker (Forward)
                  ctx.strokeStyle = '#ff8c00';
                  ctx.beginPath();
                  ctx.moveTo(width / 2, 0);
                  ctx.lineTo(width / 2, height);
                  ctx.stroke();

                  const drawPanoBlip = (worldPos: CANNON.Vec3, color: string, h: number) => {
                      const localPos = transformToLocal(worldPos);
                      
                      // Calculate angle on XZ plane relative to forward (-Z)
                      // atan2(x, -z) -> 0 is forward, PI/2 is Right, -PI/2 is Left
                      const angle = Math.atan2(localPos.x, -localPos.z);
                      
                      // Map -PI to PI to screen width
                      // Let's use a 180 degree FOV for the scanner bar (-PI/2 to PI/2)
                      // Objects behind are not shown or clamped to edges
                      
                      const fov = Math.PI; // 180 degrees wide scanner
                      
                      if (Math.abs(angle) > fov / 2) return; // Behind us (optional: could clamp to edges)

                      const x = (angle / (fov/2)) * (width / 2) + (width / 2);
                      
                      ctx.fillStyle = color;
                      ctx.fillRect(x - 2, height/2 - h/2, 4, h);
                  };

                  celestials.forEach(c => drawPanoBlip(c.body.position, c.data.type === 'Station' ? '#00ffff' : '#ffff00', 16));
                  npcs.forEach(n => drawPanoBlip(n.body.position, n.data.isHostile ? '#ff0000' : '#00ff00', 10));
              }
          }

          // Update Velocity Text
          setVelocity(shipBody.velocity.length());

          animationFrameId = requestAnimationFrame(render);
      };

      animationFrameId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animationFrameId);
  }, [shipBody, npcs, celestials]); // Dependencies for restarting the loop if critical objects change

  return (
    <div className="absolute inset-0 pointer-events-none font-orbitron">
      {/* Reticle */}
      <div className="aiming-reticle" />

      {/* Panoramic Radar (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[600px] h-[40px] z-20">
          <canvas ref={panoramicCanvasRef} width={600} height={40} className="w-full h-full rounded border border-cyan-500/50 bg-slate-900/50" />
      </div>
      
      {/* Velocity Indicator (Bottom Right) */}
      <div className="absolute bottom-6 right-6 text-cyan-400 text-lg font-bold bg-slate-900/50 px-3 py-1 rounded border border-cyan-500/30">
        {velocity.toFixed(0)} m/s
      </div>

      {/* Tactical Radar (Bottom Left) */}
      <div className="absolute bottom-4 left-4 w-[150px] h-[150px] bg-slate-900/80 rounded-full border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.2)]">
         <canvas ref={radarCanvasRef} width={150} height={150} className="w-full h-full rounded-full" />
      </div>

      {/* Energy Pips (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-1 bg-slate-900/70 p-2 rounded border border-cyan-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-cyan-400 w-6">SYS</span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.sys} />)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-cyan-400 w-6">ENG</span>
           <div className="flex gap-1">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.eng} />)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-cyan-400 w-6">WEP</span>
           <div className="flex gap-1">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.wep} />)}
          </div>
        </div>
      </div>
      
    </div>
  );
};
