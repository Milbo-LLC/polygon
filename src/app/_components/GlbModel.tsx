"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Box3, Group, Object3D, Vector3 } from "three";

interface GlbModelProps {
  modelPath: string | null;
}

export default function GlbModel({ modelPath }: GlbModelProps) {
  const modelRef = useRef<Group>(null);
  const { scene } = useThree();
  
  // Use useGLTF only if we have a modelPath
  const gltf = modelPath ? useGLTF(modelPath) : null;
  
  useEffect(() => {
    // Skip if no model path or loaded model
    if (!modelPath || !gltf || !modelRef.current) return;
    
    // Clone the model scene to avoid modifying the cached original
    const clonedScene = gltf.scene.clone();
    
    // Center the model in the scene
    const group = modelRef.current;
    
    // First clear any existing children
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child) {
        group.remove(child);
      }
    }
    
    // Add cloned model to the ref
    group.add(clonedScene);
    
    // Center and scale the model
    const box = new Box3().setFromObject(group);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    
    // Calculate scale to make the model a reasonable size
    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = maxSize > 0 ? 10 / maxSize : 1; // Scale to roughly 10 units
    
    // Apply transformations
    group.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    clonedScene.scale.set(scale, scale, scale);
    
    // Cleanup function
    return () => {
      if (group) {
        while (group.children.length > 0) {
          const child = group.children[0];
          if (child) {
            group.remove(child);
          }
        }
      }
    };
  }, [modelPath, gltf]);
  
  return <group ref={modelRef} />;
}

// Pre-load the default model to avoid flickering
useGLTF.preload("/model.glb"); 