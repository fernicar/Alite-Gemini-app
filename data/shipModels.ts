

export const shipPaths: Record<string, string> = {
    'Cobra Mk III': "M12 2 L22 20 L12 16 L2 20 Z",
    'Viper': "M12 2 L18 22 L12 17 L6 22 Z",
    'Viper Mk I': "M12 2 L18 22 L12 17 L6 22 Z",
    'Adder': "M4 6 L20 6 L22 12 L20 18 L4 18 L2 12 Z",
    'default': "M12 2 L22 22 L12 17 L2 22 L12 2Z",
};

export const SHIP_DEFINITIONS: Record<string, { w: number; h: number; l: number; shape: 'wedge' | 'box' | 'cylinder' | 'saucer' }> = {
    'Adder': { w: 70, h: 18, l: 105, shape: 'wedge' },
    'Anaconda': { w: 137, h: 110, l: 312, shape: 'box' }, 
    'Asp Explorer': { w: 128, h: 39, l: 138, shape: 'wedge' },
    'Boa': { w: 113, h: 104, l: 200, shape: 'box' },
    'Cobra Mk I': { w: 146, h: 31, l: 114, shape: 'wedge' },
    'Cobra Mk III': { w: 180, h: 41, l: 90, shape: 'wedge' },
    'Fer-de-Lance': { w: 84, h: 37, l: 160, shape: 'wedge' },
    'Gecko': { w: 132, h: 24, l: 81, shape: 'wedge' },
    'Krait': { w: 180, h: 40, l: 160, shape: 'wedge' },
    'Mamba': { w: 140, h: 25, l: 118, shape: 'wedge' },
    'Python': { w: 206, h: 103, l: 336, shape: 'wedge' },
    'Sidewinder': { w: 128, h: 29, l: 68, shape: 'wedge' },
    'Thargoid': { w: 328, h: 72, l: 328, shape: 'saucer' }, // Octagon
    'Thargon': { w: 46, h: 10, l: 43, shape: 'saucer' },
    'Transporter': { w: 100, h: 33, l: 116, shape: 'box' },
    'Viper': { w: 87, h: 27, l: 96, shape: 'wedge' },
    'Viper Mk I': { w: 87, h: 27, l: 96, shape: 'wedge' },
    // Default fallback
    'default': { w: 50, h: 20, l: 80, shape: 'wedge' }
};
