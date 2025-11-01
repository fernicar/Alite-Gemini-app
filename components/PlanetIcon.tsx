
import React from 'react';

// Simple seeded PRNG (Pseudo-Random Number Generator)
const mulberry32 = (seed: number) => {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const hashString = (str: string): number => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

interface PlanetIconProps {
  type: 'terrestrial' | 'gas_giant' | 'rocky';
  size: number;
  seed: string | number;
}

const TerrestrialPlanet: React.FC<{ size: number; random: () => number }> = ({ size, random }) => {
    const oceanColor = `hsl(200, ${50 + random() * 30}%, ${30 + random() * 20}%)`;
    const landColor1 = `hsl(${80 + random() * 40}, ${30 + random() * 20}%, ${30 + random() * 20}%)`;
    const landColor2 = `hsl(${25 + random() * 30}, ${40 + random() * 20}%, ${40 + random() * 20}%)`;
    const cloudColor = `rgba(255, 255, 255, ${0.4 + random() * 0.3})`;
    
    const landmasses = [];
    const numLandmasses = Math.floor(random() * 4) + 2;
    for (let i = 0; i < numLandmasses; i++) {
        let path = `M ${size/2 + (random() - 0.5) * size*0.4}, ${size/2 + (random() - 0.5) * size*0.4} `;
        const points = 3 + Math.floor(random() * 4);
        for(let j=0; j<points; j++) {
            path += `Q ${random() * size} ${random() * size}, ${random() * size} ${random() * size} `;
        }
        path += 'Z';
        landmasses.push(
            <path key={`land-${i}`} d={path} fill={random() > 0.5 ? landColor1 : landColor2} opacity="0.8" />
        );
    }

    const clouds = [];
    const numClouds = 7 + Math.floor(random() * 8);
    for(let i=0; i<numClouds; i++) {
        clouds.push(
            <circle key={`cloud-${i}`} cx={random() * size} cy={random() * size} r={random() * size * 0.15 + size * 0.1} fill={cloudColor} opacity={0.5} />
        );
    }
    
    return (
        <g>
            <circle cx={size/2} cy={size/2} r={size/2} fill={oceanColor} />
            {landmasses}
            {clouds}
        </g>
    );
};

const GasGiantPlanet: React.FC<{ size: number; random: () => number }> = ({ size, random }) => {
    const c1 = `hsl(${25 + random() * 20}, 70%, 60%)`;
    const c2 = `hsl(${35 + random() * 20}, 60%, 50%)`;
    const c3 = `hsl(${45 + random() * 20}, 50%, 40%)`;
    
    const bands = [];
    const numBands = 7 + Math.floor(random() * 5);
    for(let i=0; i<numBands; i++) {
        const h = size / numBands;
        const y = i * h;
        const color = [c1, c2, c3, c2][i % 4];
        bands.push(
            <rect key={`band-${i}`} x="0" y={y} width={size} height={h} fill={color} />
        );
    }
    
    const stormX = size * (0.3 + random() * 0.4);
    const stormY = size * (0.3 + random() * 0.4);
    const stormR = size * (0.1 + random() * 0.1);
    
    return (
        <g>
            {bands}
            <circle cx={stormX} cy={stormY} r={stormR} fill="hsl(20, 80%, 40%)" opacity="0.8" />
            <circle cx={stormX} cy={stormY} r={stormR*0.6} fill="hsl(20, 80%, 50%)" opacity="0.7" />
        </g>
    );
};

const RockyPlanet: React.FC<{ size: number; random: () => number }> = ({ size, random }) => {
    const baseColor = `hsl(30, 10%, ${30 + random() * 20}%)`;
    
    const craters = [];
    const numCraters = 10 + Math.floor(random() * 15);
    for(let i=0; i<numCraters; i++) {
        const r = random() * size * 0.1 + size * 0.02;
        const cx = r + random() * (size - 2*r);
        const cy = r + random() * (size - 2*r);
        const craterId = `crater-grad-${i}-${Math.floor(random()*10000)}`;
        craters.push(
            <defs key={`def-${i}`}>
                <radialGradient id={craterId}>
                    <stop offset="60%" stopColor={`hsl(30, 10%, ${20 + random() * 10}%)`} />
                    <stop offset="100%" stopColor={`hsl(30, 10%, ${40 + random() * 10}%)`} />
                </radialGradient>
            </defs>
        );
        craters.push(
            <circle key={`crater-${i}`} cx={cx} cy={cy} r={r} fill={`url(#${craterId})`} />
        );
    }
    
    return (
        <g>
            <circle cx={size/2} cy={size/2} r={size/2} fill={baseColor} />
            {craters}
        </g>
    );
};

export const PlanetIcon: React.FC<PlanetIconProps> = ({ type, size, seed }) => {
    const numSeed = typeof seed === 'string' ? hashString(seed) : seed;
    const random = mulberry32(numSeed);

    const renderPlanet = () => {
        switch(type) {
            case 'terrestrial': return <TerrestrialPlanet size={size} random={random} />;
            case 'gas_giant': return <GasGiantPlanet size={size} random={random} />;
            case 'rocky': return <RockyPlanet size={size} random={random} />;
            default: return <circle cx={size/2} cy={size/2} r={size/2} fill="gray" />;
        }
    }
    
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            <defs>
                 <clipPath id={`planet-clip-${numSeed}`}>
                    <circle cx={size/2} cy={size/2} r={size/2} />
                </clipPath>
                 <radialGradient id={`planet-shadow-${numSeed}`}>
                    <stop offset="70%" stopColor="transparent" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
                </radialGradient>
            </defs>
            <g clipPath={`url(#planet-clip-${numSeed})`}>
                {renderPlanet()}
            </g>
            {/* Shadow on the planet surface */}
            <circle cx={size/2} cy={size/2} r={size/2} fill={`url(#planet-shadow-${numSeed})`} />

             {/* Atmosphere/glow */}
            <circle cx={size/2} cy={size/2} r={size/2} fill="none" 
            stroke={type === 'terrestrial' ? 'rgba(173, 216, 230, 0.3)' : 'rgba(255,255,255,0.1)'} 
            strokeWidth={size*0.1} />
        </svg>
    );
};
