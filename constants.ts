
import { StarSystem } from './types';

export const GALAXY_WIDTH = 800;
export const GALAXY_HEIGHT = 600;

export const GALAXY_MAP: StarSystem[] = [
  { id: 1, name: 'Sol', x: 400, y: 300, economy: 'Industrial', government: 'Democracy', description: 'The birthplace of humanity, a bustling hub of trade and culture.' },
  { id: 2, name: 'Alpha Centauri', x: 420, y: 310, economy: 'High-Tech', government: 'Corporate', description: 'A system dominated by mega-corporations, known for its advanced research facilities.' },
  { id: 3, name: 'Sirius', x: 380, y: 280, economy: 'Refinery', government: 'Corporate', description: 'Rich in mineral resources, its refineries work day and night to fuel the core worlds.' },
  { id: 4, name: 'Luyten 726-8', x: 450, y: 350, economy: 'Agricultural', government: 'Democracy', description: 'The breadbasket of the local sector, exporting vast quantities of food.' },
  { id: 5, name: 'Wolf 359', x: 350, y: 320, economy: 'Mining', government: 'Anarchy', description: 'A notorious pirate haven, only the brave or foolish venture here without an escort.' },
  { id: 6, name: 'Procyon', x: 480, y: 250, economy: 'Tourism', government: 'Alliance', description: 'Famous for its beautiful ringed planets and luxury resorts.' },
  { id: 7, name: 'Epsilon Eridani', x: 330, y: 250, economy: 'Industrial', government: 'Alliance', description: 'A major shipbuilding hub for the Alliance fleet.' },
  { id: 8, name: 'Tau Ceti', x: 410, y: 390, economy: 'High-Tech', government: 'Democracy', description: 'A peaceful system known for its universities and technological innovations.' },
];
