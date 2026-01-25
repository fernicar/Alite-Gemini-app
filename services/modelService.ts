
import * as THREE from 'three';
import { getShipFilename } from '../data/shipMapping';
import { STATIC_MODELS, ModelDefinition } from '../data/staticModelData';
import { getShipGeometry } from '../data/shipGeometries'; // Fallback

class ModelService {
    private geometryCache = new Map<string, THREE.BufferGeometry>();

    public loadModel(shipType: string): Promise<THREE.BufferGeometry> {
        // This method is now effectively synchronous but kept as Promise for API compatibility
        const geometry = this.getCachedGeometry(shipType);
        return Promise.resolve(geometry || getShipGeometry(shipType));
    }

    public getCachedGeometry(shipType: string): THREE.BufferGeometry | undefined {
        const filename = getShipFilename(shipType);
        // Clean filename to key (remove .dat or .dat.txt)
        const key = filename.replace(/\.dat(\.txt)?$/, '');
        
        if (this.geometryCache.has(key)) {
            return this.geometryCache.get(key);
        }

        const modelData = STATIC_MODELS[key];
        
        if (modelData) {
            try {
                const geo = this.createGeometryFromData(modelData);
                
                // Center geometry
                geo.computeBoundingBox();
                const center = new THREE.Vector3();
                if (geo.boundingBox) {
                    geo.boundingBox.getCenter(center);
                    geo.translate(-center.x, -center.y, -center.z);
                    
                    // Alite/Oolite models face +Z
                    // Rotate 180 deg around Y to face -Z (standard forward)
                    geo.rotateY(Math.PI);
                }
                
                this.geometryCache.set(key, geo);
                return geo;
            } catch (e) {
                const errorReport = {
                    error: "Model geometry construction failed",
                    shipType: shipType,
                    modelKey: key,
                    message: e instanceof Error ? e.message : String(e),
                    dataPreview: {
                        numVertices: modelData.vertices.length,
                        numFaces: modelData.faces.length
                    }
                };
                console.error(JSON.stringify(errorReport, null, 2));
            }
        }
        
        // Fallback to procedural
        const fallback = getShipGeometry(shipType);
        this.geometryCache.set(key, fallback);
        return fallback;
    }

    private createGeometryFromData(data: ModelDefinition): THREE.BufferGeometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const colors: number[] = [];

        for (const face of data.faces) {
            const v0Idx = face.indices[0];
            const v0 = data.vertices[v0Idx];
            
            // Triangulate fan
            for (let i = 1; i < face.indices.length - 1; i++) {
                const v1Idx = face.indices[i];
                const v2Idx = face.indices[i+1];
                
                const v1 = data.vertices[v1Idx];
                const v2 = data.vertices[v2Idx];

                if (v0 && v1 && v2) {
                    positions.push(...v0, ...v1, ...v2);
                    
                    // Use face normal for flat shading look
                    normals.push(...face.normal, ...face.normal, ...face.normal);

                    // Normalize color to 0-1
                    const r = face.color[0] / 255;
                    const g = face.color[1] / 255;
                    const b = face.color[2] / 255;
                    
                    colors.push(r, g, b, r, g, b, r, g, b);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        geometry.computeBoundingSphere();
        
        return geometry;
    }
}

export const modelService = new ModelService();
