
import React, { useState, useEffect } from 'react';
import { NPC, Celestial } from '../types';
import { ShieldIcon, HullIcon } from './icons';
import { Target } from '../App';
import * as CANNON from 'cannon-es';

export const TargetInfoPanel: React.FC<{ target: Target, shipBody: CANNON.Body | null }> = ({ target, shipBody }) => {
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!target || !shipBody) return;
    
    let animationFrameId: number;
    
    const updateDistance = () => {
      const dist = shipBody.position.distanceTo(target.entity.body.position);
      setDistance(dist);
      animationFrameId = requestAnimationFrame(updateDistance);
    };

    animationFrameId = requestAnimationFrame(updateDistance);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, shipBody]);


  if (!target) {
    return (
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h3 className="font-orbitron text-lg text-red-400 border-b border-red-400/30 pb-2">TARGET INFO</h3>
          <p className="text-gray-500 mt-4 text-center">NO TARGET</p>
      </div>
    );
  }

  // FIX: Use a variable for the display name since NPC has no `name` property.
  const displayName = target.type === 'npc' ? target.entity.data.shipType : target.entity.data.name;
  const isHostile = target.type === 'npc' && target.entity.data.isHostile;

  return (
    <div className={`bg-slate-800/50 p-4 rounded-lg border ${isHostile ? 'border-red-500' : 'border-slate-700'} space-y-3`}>
        <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: isHostile ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)'}}>
            <h3 className={`font-orbitron text-lg ${isHostile ? 'text-red-400' : 'text-orange-300'}`}>{target.entity.data.type}: {displayName}</h3>
            {isHostile && <span className="text-red-500 text-xs font-bold animate-pulse">HOSTILE</span>}
        </div>
        <div className="font-mono text-sm text-yellow-300">
            Distance: {distance.toFixed(0)}m
        </div>
        {target.type === 'npc' && (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm"><ShieldIcon className="w-4 h-4 text-blue-400" /> Shields</div>
                    {/* FIX: Use `target.entity.data` to leverage type narrowing from the parent conditional. */}
                    <div className="font-mono text-blue-300 text-sm">{target.entity.data.shields.toFixed(0)} / {target.entity.data.maxShields}</div>
                </div>
                <div className="w-full bg-blue-900/50 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(target.entity.data.shields / target.entity.data.maxShields) * 100}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm"><HullIcon className="w-4 h-4 text-gray-400" /> Hull</div>
                    {/* FIX: Use `target.entity.data` to leverage type narrowing from the parent conditional. */}
                    <div className="font-mono text-gray-300 text-sm">{target.entity.data.hull.toFixed(0)} / {target.entity.data.maxHull}</div>
                </div>
                <div className="w-full bg-gray-900/50 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${(target.entity.data.hull / target.entity.data.maxHull) * 100}%` }}></div>
                </div>
            </div>
        )}
    </div>
  );
};