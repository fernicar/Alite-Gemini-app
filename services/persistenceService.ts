
import { Ship, StarSystem } from '../types';
import { getGalaxy } from './galaxyService';

const SAVE_KEY = 'alite_save_v1';

export interface SaveState {
  ship: Ship;
  systemId: number;
}

export const persistenceService = {
  save: (ship: Ship, system: StarSystem) => {
    const state: SaveState = { ship, systemId: system.id };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save game", e);
    }
  },
  load: (): SaveState | null => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse save", e);
      return null;
    }
  },
  hasSave: () => !!localStorage.getItem(SAVE_KEY),
  clear: () => localStorage.removeItem(SAVE_KEY)
};
