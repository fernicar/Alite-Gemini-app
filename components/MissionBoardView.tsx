
import React, { useState, useEffect } from 'react';
import { Ship, StarSystem, Mission } from '../types';
import { missionService } from '../services/missionService';
import { ShipStatusPanel } from './ShipStatusPanel';

const MissionBoardView: React.FC<{
  currentSystem: StarSystem;
  ship: Ship;
  activeMission: Mission | null; // This prop is kept for compatibility but we'll use service state mostly
  onAcceptMission: (mission: Mission) => void;
  onReturnToStation: () => void;
}> = ({ currentSystem, ship, onReturnToStation }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [currentActiveMission, setCurrentActiveMission] = useState<Mission | null>(missionService.getActiveMission());

  useEffect(() => {
    // Load missions for this system
    setMissions(missionService.getAvailableMissions(currentSystem));
    setSelectedMission(null);
    
    const unsubscribe = missionService.subscribe(() => {
        setCurrentActiveMission(missionService.getActiveMission());
        setMissions(missionService.getAvailableMissions(currentSystem));
    });

    return unsubscribe;
  }, [currentSystem]);

  const handleAccept = () => {
    if (selectedMission) {
      missionService.acceptMission(selectedMission);
      // We don't need to call onAcceptMission parent prop necessarily if the service handles state, 
      // but if the parent `App` relies on it for sound effects or view changes, we can keep it purely visual.
      // However, App.tsx was handling state. We will update App.tsx to remove state handling there.
    }
  };
  
  const handleAbandon = () => {
      if (confirm("Are you sure you want to abandon the current mission?")) {
          missionService.abandonMission();
      }
  }

  return (
    <main className="grid flex-grow grid-cols-1 gap-4 p-4 min-h-0 lg:grid-cols-[1fr_350px]">
      <section className="bg-black/50 rounded-lg border border-cyan-400/20 p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="font-orbitron text-2xl text-cyan-300">Mission Board: {currentSystem.name}</h2>
            <button
              onClick={onReturnToStation}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Return to Station
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 flex-grow overflow-hidden">
            {/* Mission List */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Available Contracts</h3>
                <div className="flex-grow overflow-y-auto pr-2">
                    {missions.length > 0 ? missions.map(mission => (
                        <button key={mission.id} 
                            onClick={() => setSelectedMission(mission)}
                            className={`w-full text-left p-3 rounded-md transition duration-200 mb-2 ${selectedMission?.id === mission.id ? 'bg-cyan-500/20 ring-2 ring-cyan-400' : 'hover:bg-slate-700/50'}`}>
                            <p className="text-cyan-300 font-bold truncate">{mission.title}</p>
                            <p className="text-xs text-gray-400">{mission.type}</p>
                            <p className="text-xs text-yellow-300">{mission.reward.toLocaleString()} ©</p>
                        </button>
                    )) : <p className="text-gray-500">No missions available in this system.</p>}
                </div>
            </div>
            
            {/* Mission Details */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                <h3 className="font-orbitron text-lg text-orange-300 border-b border-orange-300/30 pb-2 mb-4">Contract Details</h3>
                <div className="flex-grow overflow-y-auto pr-2 text-white">
                {selectedMission ? (
                    <div>
                        <h4 className="text-xl font-bold text-cyan-200 mb-2">{selectedMission.title}</h4>
                        <p className="text-sm text-gray-300 mb-4">{selectedMission.description}</p>
                        <div className="font-mono text-sm space-y-2 bg-black/20 p-3 rounded">
                           <p>TYPE: <span className="text-yellow-300">{selectedMission.type}</span></p>
                           <p>REWARD: <span className="text-green-400">{selectedMission.reward.toLocaleString()} ©</span></p>
                           <p>LOCATION: <span className="text-purple-300">{currentSystem.name} System</span></p>
                           {selectedMission.type === 'Delivery' && <p>CARGO: <span className="text-blue-300">{selectedMission.cargoRequired?.quantity}t {selectedMission.cargoRequired?.name}</span></p>}
                        </div>
                        <button
                            onClick={handleAccept}
                            disabled={!!currentActiveMission}
                            className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                           {currentActiveMission ? 'Mission Slot Full' : 'Accept Contract'}
                        </button>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center flex-col gap-4">
                        <p className="text-gray-500">Select a contract to view details.</p>
                        {currentActiveMission && (
                            <div className="w-full bg-slate-900/50 p-4 rounded border border-yellow-500/30">
                                <h4 className="text-yellow-500 font-bold mb-2">Active Mission</h4>
                                <p className="text-white font-bold">{currentActiveMission.title}</p>
                                <p className="text-sm text-gray-400">{currentActiveMission.description}</p>
                                <div className="mt-2 text-xs font-mono">
                                    {currentActiveMission.type === 'Bounty' && <p>Kills: {currentActiveMission.currentKills || 0} / {currentActiveMission.requiredKills || 1}</p>}
                                    <p>Status: <span className={currentActiveMission.status === 'Completed' ? 'text-green-400' : 'text-blue-400'}>{currentActiveMission.status}</span></p>
                                </div>
                                <button onClick={handleAbandon} className="mt-4 text-xs text-red-400 hover:text-red-300 underline">Abandon Mission</button>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </div>
      </section>
      <aside className="space-y-4 flex flex-col">
        <ShipStatusPanel ship={ship} activeMission={currentActiveMission} />
      </aside>
    </main>
  );
};

export default MissionBoardView;
