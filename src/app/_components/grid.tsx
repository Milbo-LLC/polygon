import { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
            ref.current.material.forEach((m) => m.dispose());
          } else {
            ref.current.material.dispose();
          }
        }
      });

      const major = new THREE.GridHelper(scale * 10, 10, '#3471eb', '#3471eb');
      major.material.opacity = 0.6;
      major.material.transparent = true;
      scene.add(major);
      majorGridRef.current = major;

      const minor = new THREE.GridHelper(scale * 10, 100, '#3471eb', '#3471eb');
      minor.material.opacity = 0.2;
      minor.material.transparent = true;
      scene.add(minor);
      minorGridRef.current = minor;

      setCurrentScale(scale);
    }
  });

  return null;
}
