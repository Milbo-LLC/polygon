import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface GridProps {
  size?: number;
  divisions?: number;
  fadeDistance?: number;
}

export default function Grid({ 
  size = 100, 
  divisions = 100,
  fadeDistance = 50
}: GridProps) {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  // Create grid helper with custom material for fadeout effect
  useEffect(() => {
    if (gridRef.current) {
      // Add fade effect to the grid material
      const grid = gridRef.current;
      
      // Use custom shader material to create a fade-out effect
      if (grid.material instanceof THREE.Material) {
        // Add fadeDistance uniform to the existing shader
        if (Array.isArray(grid.material)) {
          grid.material.forEach((mat: THREE.Material) => {
            if (mat.userData) {
              mat.userData.fadeDistance = fadeDistance;
            }
            mat.transparent = true;
            mat.opacity = 0.6;
          });
        } else {
          if (grid.material.userData) {
            grid.material.userData.fadeDistance = fadeDistance;
          }
          grid.material.transparent = true;
          grid.material.opacity = 0.6;
        }
      }
    }
  }, [fadeDistance]);

  return (
    <>
      <gridHelper 
        ref={gridRef}
        args={[size, divisions, '#6f6f6f', '#3471eb']} 
        position={[0, 0, 0]}
      />
      <axesHelper args={[size]} />
    </>
  );
}
