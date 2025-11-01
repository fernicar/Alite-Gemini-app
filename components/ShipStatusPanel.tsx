
import React from 'react';
import { Ship, Mission } from '../types';
import { ShieldIcon, FuelIcon, CargoIcon, CreditsIcon, HullIcon, EnergyIcon, MissionIcon } from './icons';

export const ShipStatusPanel: React.FC<{ ship: Ship; activeMission?: Mission | null }> = ({ ship, activeMission }) => (
  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
    <h2 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2">SHIP STATUS: {ship.name}</h2>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><HullIcon className="w-5 h-5 text-gray-400" /> Hull</div>
        <div className="font-mono text-gray-300">{ship.hull.toFixed(0)} / {ship.maxHull}</div>
      </div>
      <div className="w-full bg-gray-900/50 rounded-full h-2.5">
        <div className="bg-gray-400 h-2.5 rounded-full" style={{ width: `${(ship.hull / ship.maxHull) * 100}%` }}></div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-blue-400" /> Shields</div>
        <div className="font-mono text-blue-300">{ship.shields.toFixed(0)} / {ship.maxShields}</div>
      </div>
      <div className="w-full bg-blue-900/50 rounded-full h-2.5">
        <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${(ship.shields / ship.maxShields) * 100}%` }}></div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FuelIcon className="w-5 h-5 text-green-400" /> Fuel</div>
        <div className="font-mono text-green-300">{ship.fuel.toFixed(1)} / {ship.maxFuel} LY</div>
      </div>
      <div className="w-full bg-green-900/50 rounded-full h-2.5">
        <div className="bg-green-400 h-2.5 rounded-full" style={{ width: `${(ship.fuel / ship.maxFuel) * 100}%` }}></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><EnergyIcon className="w-5 h-5 text-yellow-400" /> Energy</div>
        <div className="font-mono text-yellow-300">{ship.energy.toFixed(0)} / {ship.maxEnergy}</div>
      </div>
      <div className="w-full bg-yellow-900/50 rounded-full h-2.5">
        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(ship.energy / ship.maxEnergy) * 100}%` }}></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><CargoIcon className="w-5 h-5 text-yellow-400" /> Cargo</div>
        <div className="font-mono text-yellow-300">{ship.cargo.reduce((acc, item) => acc + (item.quantity * item.weight), 0)} / {ship.cargoCapacity} T</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><CreditsIcon className="w-5 h-5 text-purple-400" /> Credits</div>
        <div className="font-mono text-purple-300">{ship.credits.toLocaleString()} ©</div>
      </div>
    </div>
    {activeMission && (
      <div className="border-t border-slate-700 pt-3 mt-3">
        <h3 className="font-orbitron text-md text-yellow-300 mb-2 flex items-center gap-2"><MissionIcon className="w-5 h-5" /> Active Mission</h3>
        <p className="text-sm text-gray-300 font-bold">{activeMission.title}</p>
        <p className="text-xs text-gray-400">Status: {activeMission.status}</p>
      </div>
    )}
  </div>
);
