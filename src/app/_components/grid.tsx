import { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GRID_CONSTANTS = {
  SIZE_MULTIPLIER: 10,
  MAJOR_DIVISIONS: 10,
  MAJOR_OPACITY: 0.6,
  
  MINOR_DIVISIONS: 100,
  MINOR_OPACITY: 0.35,
  
  GRID_COLOR: '#3471eb'
};

export default function Grid() {
  const { camera, scene } = useThree();
  const majorGridRef = useRef<THREE.GridHelper | null>(null);
  const minorGridRef = useRef<THREE.GridHelper | null>(null);
  const [currentScale, setCurrentScale] = useState<number | null>(null);

  useFrame(() => {
    const distance = camera.position.length();
    const scale = Math.pow(10, Math.floor(Math.log10(distance)));

    if (scale !== currentScale) {
      [majorGridRef, minorGridRef].forEach(ref => {
        if (ref.current) {
          scene.remove(ref.current);
          ref.current.geometry.dispose();
          if (Array.isArray(ref.current.material)) {
            ref.current.material.forEach((material: THREE.Material) => material.dispose());
          } else if (ref.current.material instanceof THREE.Material) {
            ref.current.material.dispose();
          }
        }
      });

      const major = new THREE.GridHelper(
        scale * GRID_CONSTANTS.SIZE_MULTIPLIER, 
        GRID_CONSTANTS.MAJOR_DIVISIONS, 
        GRID_CONSTANTS.GRID_COLOR, 
        GRID_CONSTANTS.GRID_COLOR
      );
      major.material.opacity = GRID_CONSTANTS.MAJOR_OPACITY;
      major.material.transparent = true;
      scene.add(major);
      majorGridRef.current = major;

      const minor = new THREE.GridHelper(
        scale * GRID_CONSTANTS.SIZE_MULTIPLIER, 
        GRID_CONSTANTS.MINOR_DIVISIONS, 
        GRID_CONSTANTS.GRID_COLOR, 
        GRID_CONSTANTS.GRID_COLOR
      );
      minor.material.opacity = GRID_CONSTANTS.MINOR_OPACITY;
      minor.material.transparent = true;
      scene.add(minor);
      minorGridRef.current = minor;

      setCurrentScale(scale);
    }
  });

  return null;
}
