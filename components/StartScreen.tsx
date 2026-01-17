
import React from 'react';

interface StartScreenProps {
  onNewGame: () => void;
  onContinue: () => void;
  hasSave: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onNewGame, onContinue, hasSave }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 bg-[url('https://source.unsplash.com/random/1920x1080/?galaxy,cosmos')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/60"></div>
      
      <div className="relative z-10 flex flex-col items-center gap-8 p-12 bg-black/40 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(8,145,178,0.3)]">
        <div className="text-center mb-4">
            <h1 className="text-8xl font-orbitron text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            ALITE
            </h1>
            <p className="text-cyan-400/80 font-mono tracking-[0.2em] mt-2 text-sm uppercase">Elite Space Trading Simulation</p>
        </div>

        <div className="flex flex-col gap-4 w-64">
            {hasSave && (
                <button 
                    onClick={onContinue}
                    className="w-full py-4 px-6 bg-cyan-700/80 hover:bg-cyan-600 text-white font-bold rounded border border-cyan-400/50 transition-all duration-200 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                >
                    CONTINUE
                </button>
            )}
            
            <button 
                onClick={onNewGame}
                className={`w-full py-4 px-6 text-white font-bold rounded border transition-all duration-200 transform hover:scale-105 ${hasSave ? 'bg-slate-700/80 hover:bg-slate-600 border-slate-400/50' : 'bg-cyan-700/80 hover:bg-cyan-600 border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'}`}
            >
                NEW GAME
            </button>
        </div>
        
        <div className="text-slate-500 text-xs mt-8">
            v1.0.0 • TypeScript Edition
        </div>
      </div>
    </div>
  );
};
