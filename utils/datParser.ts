
import * as THREE from 'three';

export const parseDatModel = (text: string): THREE.BufferGeometry => {
    const lines = text.split(/\r?\n/);
    const vertices: THREE.Vector3[] = [];
    // Store face data: indices, normal, color
    const faces: { v: number[]; n: THREE.Vector3; c: THREE.Color }[] = [];

    let state = 'HEAD'; // HEAD, VERTS, FACES, TEXTURES
    let numVerts = 0;
    let numFaces = 0;
    let vertsRead = 0;
    let facesRead = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        // Skip comments and empty lines
        if (line.length === 0 || line.startsWith('//') || line.startsWith('#')) continue;

        // Oolite DAT files often mix commas and spaces, e.g., "127,127,127, 0.0,0.0,1.0"
        // Split by one or more commas OR whitespace
        const parts = line.split(/[,\s]+/);
        
        // Remove empty strings from parts
        const tokens = parts.filter(p => p !== '');
        
        if (tokens.length === 0) continue;

        if (state === 'HEAD') {
            if (tokens[0] === 'NVERTEX' || tokens[0] === 'NVERTS') {
                numVerts = parseInt(tokens[1], 10);
            } else if (tokens[0] === 'NFACES') {
                numFaces = parseInt(tokens[1], 10);
            } else if (tokens[0] === 'VERTEX') {
                state = 'VERTS';
            } else if (numVerts > 0 && numFaces > 0) {
                 // Implicit start of vertices if headers done
                 // But wait for VERTEX keyword if strict, but let's be loose
                 if (!isNaN(parseFloat(tokens[0]))) {
                     state = 'VERTS';
                     i--; // Process this line again
                 }
            }
        } else if (state === 'VERTS') {
            if (tokens[0] === 'FACES') {
                 state = 'FACES';
                 continue;
            }
            
            if (vertsRead < numVerts) {
                // Parse Vertex: x y z
                const nums = tokens.map(p => parseFloat(p));
                
                if (nums.length >= 3) {
                    // Oolite coordinates: x, y, z. 
                    vertices.push(new THREE.Vector3(nums[0], nums[1], nums[2]));
                    vertsRead++;
                }
            } else {
                // If we are done with verts but haven't hit 'FACES' keyword yet
                if (tokens[0] === 'FACES') {
                    state = 'FACES';
                }
            }
        } else if (state === 'FACES') {
            if (tokens[0] === 'TEXTURES' || tokens[0] === 'END') {
                state = 'TEXTURES';
                continue;
            }
            
            if (facesRead < numFaces) {
                // Parse Face
                // Format: color_r, color_g, color_b, normal_x, normal_y, normal_z, nverts, v0, v1, v2...
                const nums = tokens.map(p => parseFloat(p));
                
                if (nums.length >= 7) {
                    const r = nums[0] / 255;
                    const g = nums[1] / 255;
                    const b = nums[2] / 255;
                    const color = new THREE.Color(r, g, b);

                    const nx = nums[3];
                    const ny = nums[4];
                    const nz = nums[5];
                    const normal = new THREE.Vector3(nx, ny, nz);

                    const nVertsInFace = nums[6];
                    const faceIndices: number[] = [];
                    
                    for (let j = 0; j < nVertsInFace; j++) {
                        // Indices start at index 7
                        const idx = nums[7 + j];
                        if (!isNaN(idx)) {
                            faceIndices.push(idx);
                        }
                    }
                    
                    if (faceIndices.length >= 3) {
                        faces.push({ v: faceIndices, n: normal, c: color });
                    }
                }
                facesRead++;
            }
        }
        // If state is TEXTURES, just skip lines until end
    }
    
    // Construct Geometry
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    
    for (const face of faces) {
        // Triangulate polygon as a triangle fan
        const v0 = vertices[face.v[0]];
        if (!v0) continue;
        
        for (let j = 1; j < face.v.length - 1; j++) {
            const v1 = vertices[face.v[j]];
            const v2 = vertices[face.v[j+1]];
            
            if (v1 && v2) {
                positions.push(v0.x, v0.y, v0.z);
                positions.push(v1.x, v1.y, v1.z);
                positions.push(v2.x, v2.y, v2.z);
                
                normals.push(face.n.x, face.n.y, face.n.z);
                normals.push(face.n.x, face.n.y, face.n.z);
                normals.push(face.n.x, face.n.y, face.n.z);

                colors.push(face.c.r, face.c.g, face.c.b);
                colors.push(face.c.r, face.c.g, face.c.b);
                colors.push(face.c.r, face.c.g, face.c.b);
            }
        }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    geometry.computeBoundingSphere();
    
    return geometry;
};
