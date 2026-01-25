
import * as THREE from 'three';
import { getShipGeometry } from '../data/shipGeometries';

const SCALE_FACTOR = 0.1;

export const createShipMesh = (shipType: string, color: number) => {
    const group = new THREE.Group();
    
    // Get Geometry Synchronously
    const geometry = getShipGeometry(shipType);
    
    // Create Main Body
    const material = new THREE.MeshPhongMaterial({ 
        color: color, 
        emissive: 0x111111,
        specular: 0x666666,
        shininess: 30,
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
    
    // Orient correctly: In our game -Z is forward.
    // The generator makes them Z-aligned usually. 
    // Rotate 180 Y to face -Z.
    mesh.rotation.y = Math.PI;

    group.add(mesh);

    // Add Engine Glow (Thrusters)
    const thrusterGeo = new THREE.BoxGeometry(4, 2, 1);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    
    // Calculate bounding box to place thrusters at the back
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        // The geometry is rotated 180, so "back" is actually the positive Z of the geometry before rotation.
        // But after rotation y=PI, +Z of geometry becomes -Z in world.
        // Wait, simpler: The geometry generator makes the back at +Z (halfL).
        // After rotating 180, the back is at -Z world. 
        // Our game expects forward to be -Z.
        // So the back of the ship is at +Z.
        // Let's re-verify orientation.
        // If we want the ship to face -Z, and the geometry has a "nose" at -L/2 (negative Z), 
        // then the geometry is already facing -Z.
        // generateWedge makes Nose at -halfL (-Z). So it IS facing -Z by default.
        // So no rotation needed?
        // Rear Face is at +halfL (+Z).
        // So yes, it faces -Z.
        
        mesh.rotation.y = 0; // No rotation needed if geometry is generated facing -Z

        thruster.position.z = (geometry.boundingBox.max.z * SCALE_FACTOR) + 0.1;
        thruster.position.y = 0;
    }
    
    group.add(thruster);

    // Add Wireframe overlay for "tactical" look
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true }));
    line.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
    group.add(line);

    return { group, thruster };
}
