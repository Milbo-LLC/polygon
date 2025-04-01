import { useRef } from 'react';
import * as THREE from 'three';

const COLORS = [
  "#3471eb", // blue
  "#34eb64", // green
  "#eb3434", // red
  "#ebeb34", // yellow
  "#9834eb", // purple
  "#34ebe5"  // cyan
] as const;

export function useColorTransition(initialColor = COLORS[0]) {
  const currentColor = useRef(new THREE.Color(initialColor));
  const targetColor = useRef(new THREE.Color(initialColor));

  const updateColor = () => {
    if (Math.random() < 0.005) {
      const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      targetColor.current = new THREE.Color(nextColor);
    }

    currentColor.current.lerp(targetColor.current, 0.015);
    return currentColor.current;
  };

  return updateColor;
} 