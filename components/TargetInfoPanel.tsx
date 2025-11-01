import React from 'react';
import { NPC } from '../types';
import { ShieldIcon, HullIcon } from './icons';

export const TargetInfoPanel: React.FC<{ target: NPC | null }> = ({ target }) => {
  if (!target) {
    return (
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h3 className="font-orbitron text-lg text-red-400 border-b border-red-400/30 pb-2">TARGET INFO</h3>
          <p className="text-gray-500 mt-4 text-center">NO TARGET</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-red-500/50 space-y-3">
        <h3 className="font-orbitron text-lg text-red-400 border-b border-red-400/30 pb-2">{target.type}: {target.shipType}</h3>
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><ShieldIcon className="w-4 h-4 text-blue-400" /> Shields</div>
                <div className="font-mono text-blue-300 text-sm">{target.shields.toFixed(0)} / {target.maxShields}</div>
            </div>
            <div className="w-full bg-blue-900/50 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(target.shields / target.maxShields) * 100}%` }}></div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><HullIcon className="w-4 h-4 text-gray-400" /> Hull</div>
                <div className="font-mono text-gray-300 text-sm">{target.hull.toFixed(0)} / {target.maxHull}</div>
            </div>
            <div className="w-full bg-gray-900/50 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${(target.hull / target.maxHull) * 100}%` }}></div>
            </div>
        </div>
    </div>
  );
};
