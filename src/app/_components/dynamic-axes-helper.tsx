import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const AXES_CONSTANTS = {
  MIN_SIZE: 10,
  MAX_SIZE: 10000,
  SCALE_MULTIPLIER: 10,
  DISPLAY_SCALE: 0.5,
  DEFAULT_SIZE: 1
};

export default function DynamicAxesHelper() {
  const { camera } = useThree();
  const axesRef = useRef<THREE.AxesHelper | null>(null);

  useFrame(() => {
    const distance = camera.position.length();
    const rawScale = Math.pow(10, Math.floor(Math.log10(distance)));
    const size = THREE.MathUtils.clamp(
      rawScale * AXES_CONSTANTS.SCALE_MULTIPLIER, 
      AXES_CONSTANTS.MIN_SIZE, 
      AXES_CONSTANTS.MAX_SIZE
    );

    if (axesRef.current) {
      axesRef.current.scale.setScalar(size * AXES_CONSTANTS.DISPLAY_SCALE);
    }
  });

  return <axesHelper ref={axesRef} args={[AXES_CONSTANTS.DEFAULT_SIZE]} />;
}
