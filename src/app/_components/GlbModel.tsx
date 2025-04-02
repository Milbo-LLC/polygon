"use client";

import { useEffect, useRef, useState, Suspense, useTransition } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Box3, Group, Object3D, Vector3 } from "three";
import * as THREE from 'three';
import { ReactNode } from "react";

// Simplified error boundary implementation since we can't install packages
function ErrorBoundary({ children, fallback }: { children: ReactNode, fallback: (error: Error) => ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  
  if (error) {
    return <>{fallback(error)}</>;
  }
  
  return (
    <>{children}</>
  );
}

interface GlbModelProps {
  modelPath: string | null;
}

// Create a separate component for loading the model to work with Suspense
function ModelLoader({ modelPath, onLoaded }: { modelPath: string, onLoaded: (gltf: any) => void }) {
  console.log("ModelLoader: Loading model from:", modelPath);
  const gltf = useGLTF(modelPath);
  
  useEffect(() => {
    if (gltf) {
      console.log("ModelLoader: Model loaded successfully");
      onLoaded(gltf);
    }
  }, [gltf, onLoaded]);
  
  return null;
}

export default function GlbModel({ modelPath }: GlbModelProps) {
  const modelRef = useRef<Group>(null);
  const { scene } = useThree();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedGltf, setLoadedGltf] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  
  // Log when modelPath changes
  useEffect(() => {
    if (modelPath) {
      console.log("GlbModel: Model path changed to:", modelPath);
      // Reset error state when path changes
      setLoadError(null);
      setLoadedGltf(null);
      
      // Verify if the file exists before attempting to load it
      fetch(modelPath, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`File not found: ${modelPath} (${response.status})`);
          }
          console.log(`GlbModel: File exists at ${modelPath}`);
        })
        .catch(error => {
          console.error(`GlbModel: File check failed:`, error);
          setLoadError(`Failed to access model file: ${error.message}`);
        });
    }
  }, [modelPath]);
  
  // Handle successful model loading
  const handleModelLoaded = (gltf: any) => {
    startTransition(() => {
      setLoadedGltf(gltf);
    });
  };
  
  // Setup the model when it's loaded
  useEffect(() => {
    if (!loadedGltf || !modelRef.current) return;
    
    console.log("GlbModel: Setting up loaded model in scene");
    
    try {
      // Clone the model scene to avoid modifying the cached original
      const clonedScene = loadedGltf.scene.clone();
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
      
      console.log("GlbModel: Model positioned and scaled successfully");
    } catch (error) {
      console.error("Error setting up GLB model:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to setup model");
    }
  }, [loadedGltf]);
  
  // Error handler function
  const handleError = (error: Error) => {
    console.error("GlbModel ErrorBoundary caught error:", error);
    setLoadError(error.message);
    return null;
  };
  
  // Render a fallback cube if loading fails
  const renderFallbackCube = () => {
    console.log("Rendering fallback cube due to loading error");
    return (
      <>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
        <gridHelper args={[10, 10]} />
      </>
    );
  };
  
  return (
    <group ref={modelRef}>
      {modelPath && !loadError && !loadedGltf && (
        <ErrorBoundary fallback={handleError}>
          <Suspense fallback={null}>
            <ModelLoader modelPath={modelPath} onLoaded={handleModelLoaded} />
          </Suspense>
        </ErrorBoundary>
      )}
      
      {loadError && renderFallbackCube()}
    </group>
  );
}

// Clear cache to avoid issues with previously failed models
useGLTF.preload("/model.glb"); 