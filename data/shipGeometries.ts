
import * as THREE from 'three';

// Helper to generate a classic Elite "Wedge" ship (Cobra, Viper, etc.)
// Returns vertices and indices for a BufferGeometry
const generateWedge = (width: number, height: number, length: number, wingWidth: number, noseWidth: number = 0): THREE.BufferGeometry => {
    const halfW = width / 2;
    const halfH = height / 2;
    const halfL = length / 2;
    const wingX = wingWidth / 2;
    const noseX = noseWidth / 2;

    // Standard Elite Wedge Layout (Y-up, -Z forward)
    // Vertices
    const vertices = [
        // Rear Face (0-5)
        -halfW,  halfH,  halfL,  // 0: Top Left Rear
         halfW,  halfH,  halfL,  // 1: Top Right Rear
         halfW, -halfH,  halfL,  // 2: Bottom Right Rear
        -halfW, -halfH,  halfL,  // 3: Bottom Left Rear
        -wingX,      0,  halfL,  // 4: Wing Tip Left Rear
         wingX,      0,  halfL,  // 5: Wing Tip Right Rear

        // Front Face (6-9)
        -noseX,  halfH * 0.5, -halfL, // 6: Top Left Nose
         noseX,  halfH * 0.5, -halfL, // 7: Top Right Nose
         noseX, -halfH * 0.5, -halfL, // 8: Bottom Right Nose
        -noseX, -halfH * 0.5, -halfL, // 9: Bottom Left Nose
    ];

    // If nose is 0 (pointy), indices 6-9 are same, but we keep structure for flat noses (like Adder)
    
    // Indices (Triangles)
    const indices = [
        // Rear Face
        0, 1, 2,  0, 2, 3,  // Central Body Rear
        3, 2, 5,  3, 5, 4,  // Wings Rear (if applicable, usually flat, but handled as mesh)

        // Top Face
        0, 6, 7,  0, 7, 1, // Main Body Top
        0, 4, 6,  // Left Wing Top Slant
        1, 7, 5,  // Right Wing Top Slant

        // Bottom Face
        3, 8, 9,  3, 2, 8, // Main Body Bottom
        3, 9, 4,  // Left Wing Bottom Slant
        2, 5, 8,  // Right Wing Bottom Slant

        // Side Faces (Wings)
        4, 9, 6,  // Left Side
        5, 7, 8,  // Right Side

        // Front Face (Nose)
        6, 9, 8,  6, 8, 7
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};

// Helper for Boxy ships (Anaconda, Boa)
const generateBoxShip = (w: number, h: number, l: number): THREE.BufferGeometry => {
    return new THREE.BoxGeometry(w, h, l);
};

// Helper for Saucers (Thargoids)
const generateSaucer = (radius: number, height: number): THREE.BufferGeometry => {
    const geometry = new THREE.CylinderGeometry(radius * 0.8, radius, height, 8);
    // Add a dome
    const dome = new THREE.ConeGeometry(radius * 0.6, height, 8);
    dome.translate(0, height, 0);
    // Merge not easily possible without external libs in this setup, so we just return the main body
    // and rely on the renderer to handle it or just use the cylinder for now.
    return geometry;
};

// Central Registry of Ship Geometries
export const getShipGeometry = (type: string): THREE.BufferGeometry => {
    switch (type) {
        case 'Cobra Mk III':
            return generateWedge(40, 12, 60, 80, 5); // Iconic wide wedge
        case 'Viper Mk I':
        case 'Viper':
            return generateWedge(20, 10, 40, 30, 2); // Sharper, smaller
        case 'Sidewinder':
            return generateWedge(25, 8, 30, 40, 4); // Small wedge
        case 'Adder':
             return generateWedge(25, 12, 40, 35, 8); // Boxier wedge
        case 'Python':
            return generateWedge(40, 15, 90, 50, 6); // Long wedge
        case 'Fer-de-Lance':
            return generateWedge(20, 8, 80, 30, 1); // Very long, needle like
        case 'Asp Explorer':
            return generateWedge(35, 15, 50, 45, 10); // Stout wedge
        case 'Krait':
            return generateWedge(60, 5, 50, 70, 2); // Very wide, flat
        case 'Mamba':
             return generateWedge(30, 10, 50, 40, 2); // Racer
        case 'Anaconda':
            return generateBoxShip(40, 30, 120); // Massive freighter
        case 'Boa':
             return generateBoxShip(50, 40, 100);
        case 'Thargoid':
            return generateSaucer(50, 15);
        case 'Thargon':
            return generateSaucer(10, 3);
        case 'Transporter':
            return generateBoxShip(30, 15, 60);
        default:
            return generateWedge(30, 10, 50, 40, 5); // Generic fallback
    }
};
