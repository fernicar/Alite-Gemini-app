

import React, { useEffect, useRef, useState } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Target } from '../App';

interface SystemViewHUDProps {
  shipBody: CANNON.Body | null;
  pressedKeys: Set<string>;
  target: Target;
  energyPips: { sys: number; eng: number; wep: number };
  mouseAim: boolean;
  camera: THREE.Camera | null;
}

const Pip: React.FC<{ active: boolean }> = ({ active }) => (
    <div className={`pip ${active ? 'active' : ''}`} />
);

export const SystemViewHUD: React.FC<SystemViewHUDProps> = ({ shipBody, pressedKeys, target, energyPips, mouseAim, camera }) => {
  const [velocity, setVelocity] = useState(0);
  const [attitude, setAttitude] = useState({ pitch: 0, roll: 0, yaw: 0 });
  const [targetYaw, setTargetYaw] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [leadIndicatorPos, setLeadIndicatorPos] = useState({ x: 0, y: 0, visible: false });
  const threeEuler = useRef(new THREE.Euler()).current;
  const compassTapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        setCursorPos({ x: e.clientX, y: e.clientY });
    };
    if (mouseAim) {
        window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseAim]);

  useEffect(() => {
    if (!shipBody) return;
    let animationFrameId: number;

    const updateHUD = () => {
      // Update velocity
      const speed = shipBody.velocity.length();
      setVelocity(speed);

      // Update attitude from ship quaternion
      threeEuler.setFromQuaternion(shipBody.quaternion as any, 'YXZ');
      const shipYaw = THREE.MathUtils.radToDeg(threeEuler.y);
      setAttitude({
        pitch: THREE.MathUtils.radToDeg(threeEuler.x),
        roll: THREE.MathUtils.radToDeg(threeEuler.z),
        yaw: shipYaw,
      });

      // Calculate yaw to target
      if (target && camera) {
        const shipPos = shipBody.position;
        const targetPos = target.entity.body.position;
        const targetVel = target.entity.body.velocity;

        const dx = targetPos.x - shipPos.x;
        const dz = targetPos.z - shipPos.z;
        // atan2(z,x) for compass heading, then convert to degrees
        const angleToTarget = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));
        setTargetYaw(angleToTarget);
        
        // Lead target indicator logic
        const Vp = 800; // Projectile speed, should be dynamic based on weapon
        const Ps = shipBody.position;
        const Pt = target.entity.body.position;
        const Vt = target.entity.body.velocity;

        const deltaP = new CANNON.Vec3(Pt.x - Ps.x, Pt.y - Ps.y, Pt.z - Ps.z);
        
        const a = Vt.dot(Vt) - Vp*Vp;
        const b = 2 * deltaP.dot(Vt);
        const c = deltaP.dot(deltaP);
        
        const discriminant = b*b - 4*a*c;
        
        if (discriminant >= 0) {
            const t1 = (-b + Math.sqrt(discriminant)) / (2*a);
            const t2 = (-b - Math.sqrt(discriminant)) / (2*a);
            
            const t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

            if (t > 0) {
                const Pi = new THREE.Vector3(
                    Pt.x + Vt.x * t,
                    Pt.y + Vt.y * t,
                    Pt.z + Vt.z * t
                );
                
                const screenPos = Pi.clone().project(camera);
                
                // convert normalized device coordinates to screen pixels
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                
                // Only show if it's in front of camera
                const isVisible = screenPos.z < 1;
                setLeadIndicatorPos({ x, y, visible: isVisible });
            } else {
                 setLeadIndicatorPos({ x: 0, y: 0, visible: false });
            }
        } else {
             setLeadIndicatorPos({ x: 0, y: 0, visible: false });
        }

      } else {
          if (leadIndicatorPos.visible) {
              setLeadIndicatorPos({ x:0, y:0, visible: false});
          }
      }


      animationFrameId = requestAnimationFrame(updateHUD);
    };

    animationFrameId = requestAnimationFrame(updateHUD);
    return () => cancelAnimationFrame(animationFrameId);
  }, [shipBody, threeEuler, target, camera, leadIndicatorPos.visible]);

  // Compass tape transform
  useEffect(() => {
    if (compassTapeRef.current) {
      // The background position moves instead of the element itself.
      const offset = (attitude.yaw * 3); // Adjust multiplier for desired tape speed
      compassTapeRef.current.style.backgroundPositionX = `${-offset}px`;
    }
  }, [attitude.yaw]);

  const renderCompassLabels = () => {
    const labels = [];
    const compassWidth = 300;
    const degreesPerPixel = 3; 
    const degreesVisible = compassWidth / degreesPerPixel;
    const currentYaw = attitude.yaw;
    const startDegree = Math.round(currentYaw - degreesVisible / 2);

    for (let i = 0; i < degreesVisible + 20; i++) {
        const deg = (startDegree + i * 5 + 3600) % 360; // Every 5 degrees
        if (deg % 15 === 0) {
            const label = {0: 'N', 90: 'E', 180: 'S', 270: 'W'}[deg as 0|90|180|270] || deg.toString();
            
            let deltaYaw = deg - currentYaw;
            if (deltaYaw > 180) deltaYaw -= 360;
            if (deltaYaw < -180) deltaYaw += 360;

            const position = (deltaYaw * degreesPerPixel) + (compassWidth / 2);

            if (position > -20 && position < compassWidth + 20) {
                labels.push(
                    <div key={`${deg}-${i}`} className="hud-compass-label" style={{ left: `${position}px`, transform: 'translateX(-50%)' }}>
                        {label}
                    </div>
                );
            }
        }
    }
    return labels;
  };
  
  const renderTargetIndicator = () => {
      if (!target) return null;
      const compassWidth = 300;
      const degreesPerPixel = 3;
      let deltaYaw = targetYaw - attitude.yaw;
      if (deltaYaw > 180) deltaYaw -= 360;
      if (deltaYaw < -180) deltaYaw += 360;
      
      const position = (deltaYaw * degreesPerPixel) + (compassWidth / 2);

      if (position < 0 || position > compassWidth) return null; // Off-screen

      return (
        <div style={{
            position: 'absolute',
            left: `${position}px`,
            top: '5px',
            transform: 'translateX(-50%)',
            color: '#00ff00',
            fontSize: '14px',
        }}>
           &#9679;
        </div>
      )
  }


  return (
    <div className="hud">
      <div className="aiming-reticle" />
      {leadIndicatorPos.visible && (
        <div className="lead-indicator" style={{ left: leadIndicatorPos.x, top: leadIndicatorPos.y }} />
      )}
      {mouseAim && (
        <div 
            className="flight-cursor"
            style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
            }}
        />
      )}
      <div className="hud-velocity">
        {velocity.toFixed(0)} m/s
      </div>

      <div className="hud-flight-assist">FLIGHT ASSIST ON</div>

      <div className="hud-mouse-aim" style={{ color: mouseAim ? '#00e5ff' : '#ff8c00' }}>
        MOUSE AIM {mouseAim ? 'ON' : 'OFF'}
      </div>

      <div className="hud-compass">
        <div ref={compassTapeRef} className="hud-compass-tape"></div>
        {renderCompassLabels()}
        {renderTargetIndicator()}
        <div className="hud-compass-marker" />
      </div>

      <div className="hud-pips">
        <div className="pip-group">
          <span>SYS</span>
          <div className="pip-container">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.sys} />)}
          </div>
        </div>
        <div className="pip-group">
          <span>ENG</span>
           <div className="pip-container">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.eng} />)}
          </div>
        </div>
        <div className="pip-group">
          <span>WEP</span>
           <div className="pip-container">
            {[...Array(4)].map((_, i) => <Pip key={i} active={i < energyPips.wep} />)}
          </div>
        </div>
      </div>
      
    </div>
  );
};