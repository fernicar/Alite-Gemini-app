
export const SHIP_FILE_MAPPING: Record<string, string> = {
    'Adder': 'adder.dat',
    'Anaconda': 'anaconda.dat',
    'Asp Explorer': 'aspmkii.dat', 
    'Boa': 'boaclasscruiser.dat', 
    'Cobra Mk I': 'cobramki.dat',
    'Cobra Mk III': 'cobra_mk_iii.dat',
    'Fer-de-Lance': 'ferdelance.dat',
    'Gecko': 'gecko.dat',
    'Krait': 'krait.dat', 
    'Mamba': 'mamba.dat',
    'Python': 'python.dat',
    'Sidewinder': 'sidewinder.dat',
    'Thargoid': 'thargoid.dat',
    'Thargon': 'thargon.dat',
    'Transporter': 'transporter.dat',
    'Viper': 'viper.dat',
    'Viper Mk I': 'viper.dat',
    'Coriolis': 'coriolis.dat',
    'Orbit Shuttle': 'orbitshuttle.dat',
    'Wolf Mk II': 'wolfmkii.dat',
    'Asteroid': 'asteroid1.dat',
    'Missile': 'missile.dat',
    'Escape Capsule': 'escapecapsule.dat',
    'Cargo Canister': 'cargo_canister.dat',
    'Worm': 'adder.dat', // Fallback
    'Shuttle': 'orbitshuttle.dat'
};

export const getShipFilename = (type: string): string => {
    return SHIP_FILE_MAPPING[type] || 'cobra_mk_iii.dat'; // Default to Cobra
};
