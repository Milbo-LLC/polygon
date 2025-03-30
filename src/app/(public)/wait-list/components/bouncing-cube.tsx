import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useColorTransition } from "~/hooks/use-color-transition";

export function BouncingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const updateColor = useColorTransition();
  let time = 0;

  useFrame((state, delta) => {
    time += delta;
    
    if (meshRef.current) {
      // Rotation
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.2;
      
      // Bouncing motion
      meshRef.current.position.y = Math.sin(time * 2) * 0.5;

      // Color transition
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.color = updateColor(delta);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[4, 4, 4]} />
      <meshStandardMaterial />
    </mesh>
  );
} 