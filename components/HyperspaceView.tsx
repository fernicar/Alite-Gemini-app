
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HyperspaceViewProps {
  onComplete: () => void;
  duration?: number;
}

export const HyperspaceView: React.FC<HyperspaceViewProps> = ({ onComplete, duration = 4000 }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Star Tunnel Effect
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      // Spiral distribution
      const r = 5 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      
      positions[i] = r * Math.cos(theta); // x
      positions[i + 1] = r * Math.sin(theta); // y
      positions[i + 2] = Math.random() * 2000 - 1000; // z

      // Color variation (Cyan/Blue/White)
      const colorType = Math.random();
      if (colorType > 0.8) {
          colors[i] = 1; colors[i+1] = 1; colors[i+2] = 1; // White
      } else if (colorType > 0.5) {
          colors[i] = 0; colors[i+1] = 1; colors[i+2] = 1; // Cyan
      } else {
          colors[i] = 0.2; colors[i+1] = 0.5; colors[i+2] = 1; // Blue
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(geometry, material);
    scene.add(starField);

    // Tunnel Wireframe (subtle anchor)
    const tunnelGeo = new THREE.CylinderGeometry(10, 2, 1000, 16, 20, true);
    const tunnelMat = new THREE.MeshBasicMaterial({ 
        color: 0x002244, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.05,
        blending: THREE.AdditiveBlending
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.rotation.x = -Math.PI / 2;
    scene.add(tunnel);

    let frameId: number;
    const speed = 40;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const positions = starField.geometry.attributes.position.array as Float32Array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += speed;
        if (positions[i] > 50) {
          positions[i] = -2000;
        }
      }
      starField.geometry.attributes.position.needsUpdate = true;

      // Rotate tunnel for dynamic effect
      tunnel.rotation.y += 0.005;
      // Pulse tunnel opacity
      tunnel.material.opacity = 0.05 + Math.sin(Date.now() * 0.005) * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const timer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [onComplete, duration]);

  return (
    <div ref={mountRef} className="absolute inset-0 w-full h-full bg-black z-50">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <h2 className="text-4xl font-orbitron text-cyan-400 animate-pulse tracking-[0.5em]">HYPERSPACE</h2>
        </div>
    </div>
  );
};
