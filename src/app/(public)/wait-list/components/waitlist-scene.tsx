"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BouncingCube } from "./bouncing-cube";

export default function WaitListScene() {
  return (
    <div className="h-80 w-full">
      <Canvas
        className="flex h-full w-full"
        camera={{ position: [5, 5, 5] }}
      >
        <OrbitControls 
          minDistance={6}
          maxDistance={12}
          enablePan={false}
        />
        <directionalLight position={[2, 2, 2]} />
        <ambientLight intensity={0.5} />
        <BouncingCube />
      </Canvas>
    </div>
  );
}