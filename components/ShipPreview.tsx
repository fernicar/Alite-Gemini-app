
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createShipMesh } from '../utils/ship3d';

interface ShipPreviewProps {
  shipType: string;
  className?: string;
}

export const ShipPreview: React.FC<ShipPreviewProps> = ({ shipType, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    // Orthographic camera for a technical schematic look
    const frustumSize = 15;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );
    
    camera.position.set(20, 10, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x445566, 0.8);
    backLight.position.set(-10, -5, -10);
    scene.add(backLight);

    // Ship
    const { group: shipMesh } = createShipMesh(shipType, 0x00ffff); 
    scene.add(shipMesh);

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      shipMesh.rotation.y += 0.01;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      const newAspect = newWidth / newHeight;
      
      camera.left = -frustumSize * newAspect / 2;
      camera.right = frustumSize * newAspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [shipType]);

  return <div ref={mountRef} className={className} />;
};
