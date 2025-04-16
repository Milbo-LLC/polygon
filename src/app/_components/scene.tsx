'use client'
import { Canvas } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import Grid from './grid'
import Gizmo from './gizmo'
import ResetGridButton from './reset-grid-button'
import { type Dimension } from './sketch-controls'
import SketchPlane from './sketch-plane'
import ControlPanel from './control-panel'
import PlaneSelector from './plane-selector'
import { useAtom, useAtomValue } from 'jotai'
import { canvasStateAtom, sketchStateAtom } from '../(protected)/atoms'
import { globalDrawings, type Point3D } from './sketch-shared-types'

// Helper function to create a Box3 that contains all sketches in all dimensions
function createBoundingBoxForAllSketches() {
  // Initialize with infinity values that will be replaced
  const box = new THREE.Box3(
    new THREE.Vector3(Infinity, Infinity, Infinity),
    new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  );
  
  // Get all drawings from all dimensions
  const allDrawingsExist = 
    globalDrawings.x.length > 0 || 
    globalDrawings.y.length > 0 || 
    globalDrawings.z.length > 0;
  
  if (!allDrawingsExist) {
    // If no drawings exist, return a default box around the origin
    return new THREE.Box3(
      new THREE.Vector3(-50, -50, -50),
      new THREE.Vector3(50, 50, 50)
    );
  }
  
  // Function to expand box to include a point
  const expandBoxWithPoint = (point: Point3D) => {
    box.expandByPoint(new THREE.Vector3(Number(point.x), Number(point.y), Number(point.z)));
  };
  
  // Process all drawings from all dimensions
  for (const dimension of ['x', 'y', 'z'] as const) {
    for (const drawing of globalDrawings[dimension]) {
      // Each drawing has points
      for (const point of drawing.points) {
        expandBoxWithPoint(point);
      }
    }
  }
  
  // Add some padding to the box
  box.expandByScalar(10);
  
  return box;
}

// Camera position controller component
function CameraPositioner({ 
  dimension,
  isActive,
  cameraControlsRef,
}: { 
  dimension: Dimension | null;
  isActive: boolean;
  cameraControlsRef: React.RefObject<CameraControls>;
}) {
  const prevActiveRef = useRef(isActive);
  
  // Update camera controls and reset when entering or exiting sketch mode
  useEffect(() => {
    // Make this an async function to properly use await
    void (async () => {
      if (!cameraControlsRef.current) return;
      
      // Check if we're entering or exiting sketch mode
      const wasActive = prevActiveRef.current;
      prevActiveRef.current = isActive;
      
      if (isActive) {
        // In sketch mode, allow only zooming but disable other controls
        cameraControlsRef.current.enabled = true;
        cameraControlsRef.current.azimuthRotateSpeed = 0; 
        cameraControlsRef.current.polarRotateSpeed = 0;   
        cameraControlsRef.current.truckSpeed = 0;         
        cameraControlsRef.current.dollySpeed = 1;
        
        // Reset camera when entering sketch mode (only if dimension isn't selected yet)
        if (!wasActive && !dimension) {
          await cameraControlsRef.current.reset(true);
          
          // Set to a standard viewing position
          await cameraControlsRef.current.setLookAt(
            20, 20, 20,  // position: isometric view
            0, 0, 0,     // target: origin
            true         // immediate
          );
        }
      } else {
        // Re-enable all controls when not in sketch mode
        cameraControlsRef.current.enabled = true;
        cameraControlsRef.current.azimuthRotateSpeed = 1;
        cameraControlsRef.current.polarRotateSpeed = 1;
        cameraControlsRef.current.truckSpeed = 1;
        cameraControlsRef.current.dollySpeed = 1;
        
        // If we just exited sketch mode, zoom out to show all sketches
        if (wasActive) {
          // First get a bounding box that contains all sketches
          const sketchesBox = createBoundingBoxForAllSketches();
          
          // Fit camera to see all sketches
          await cameraControlsRef.current.fitToBox(sketchesBox, true);
          
          // Set to a nice viewing angle after the fitToBox completes
          await cameraControlsRef.current.setLookAt(
            30, 30, 30,  // position: isometric view
            0, 0, 0,     // target: origin
            true         // immediate
          );
        }
      }
    })(); // Immediately invoke the async function
    
  }, [isActive, cameraControlsRef, dimension]);
  
  // Position camera when dimension changes
  useEffect(() => {
    // Create an async function and immediately invoke it
    void (async () => {
      if (!dimension || !isActive || !cameraControlsRef.current) return;
      
      // Store reference locally to avoid null checks throughout
      const controls = cameraControlsRef.current;
      
      // Create box representing the plane to look at
      let min, max;
      const halfSize = 50;
      
      switch(dimension) {
        case 'x':
          // YZ plane at x=0
          min = new THREE.Vector3(0, -halfSize, -halfSize);
          max = new THREE.Vector3(0, halfSize, halfSize);
          await controls.setLookAt(
            halfSize, 0, 0,   // position
            0, 0, 0,          // target
            true              // immediate
          );
          break;
        case 'y':
          // XZ plane at y=0
          min = new THREE.Vector3(-halfSize, 0, -halfSize);
          max = new THREE.Vector3(halfSize, 0, halfSize);
          await controls.setLookAt(
            0, halfSize, 0,   // position
            0, 0, 0,          // target
            true              // immediate
          );
          break;
        case 'z':
          // XY plane at z=0
          min = new THREE.Vector3(-halfSize, -halfSize, 0);
          max = new THREE.Vector3(halfSize, halfSize, 0);
          await controls.setLookAt(
            0, 0, halfSize,   // position
            0, 0, 0,          // target
            true              // immediate
          );
          break;
      }
      
      // Use fitToBox as backup to ensure view is appropriate
      await controls.fitToBox(
        new THREE.Box3(min, max), 
        true  // immediate
      );
      
      // Add an instant update to apply changes immediately
      controls.update(0);
    })();
    
  }, [dimension, isActive, cameraControlsRef]);
  
  return null;
}

export default function Scene() {
  const cameraControlsRef = useRef<CameraControls | null>(null)
  const canvasState = useAtomValue(canvasStateAtom)
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  
  // Use a ref to track previous sketch mode state
  const prevSketchModeActiveRef = useRef<boolean>(false);
  
  const gridSize = 100
  const gridDivisions = 100

  const isSketchModeActive = canvasState.selectedTool === 'sketch'

  // Reset dimension when entering sketch mode
  useEffect(() => {
    // Get previous sketch mode state
    const prevSketchModeActive = prevSketchModeActiveRef.current;
    
    // Update ref with current state for next comparison
    prevSketchModeActiveRef.current = isSketchModeActive;
    
    // Always reset dimension when entering sketch mode to allow selecting a new plane
    if (isSketchModeActive && !prevSketchModeActive) {
      setSketchState({...sketchState, dimension: null});
    }
    
  }, [isSketchModeActive, sketchState, setSketchState]);


  return (
    <div className="flex h-full w-full relative">
      <ResetGridButton cameraControlsRef={cameraControlsRef} />
      <ControlPanel />
      <Canvas 
        className="flex h-full w-full" 
        camera={{ 
          position: [5, 5, 5],
          fov: 15, // Narrow field of view for less perspective distortion
          near: 0.1,
          far: 1000
        }}
        tabIndex={0}
      >
        {/* Camera positioner - directly manipulates the camera */}
        <CameraPositioner 
          dimension={sketchState.dimension} 
          isActive={isSketchModeActive}
          cameraControlsRef={cameraControlsRef}
        />
        
        <Gizmo />
        <Grid 
          size={gridSize} 
          divisions={gridDivisions} 
        />
        
        {/* Plane selector - only show when in sketch mode and no dimension selected */}
        <PlaneSelector
          isActive={isSketchModeActive && sketchState.dimension === null}
          gridSize={gridSize}
        />
        
        {/* X-plane drawings - always visible */}
        <SketchPlane
          key="sketch-x" 
          dimension="x"
          tool={sketchState.selectedTool}
          isActive={isSketchModeActive && sketchState.dimension === "x"}
          gridSize={gridSize}
          gridDivisions={gridDivisions}
          persistDrawings={true}
        />
        
        {/* Y-plane drawings - always visible */}
        <SketchPlane
          key="sketch-y" 
          dimension="y"
          tool={sketchState.selectedTool}
          isActive={isSketchModeActive && sketchState.dimension === "y"}
          gridSize={gridSize}
          gridDivisions={gridDivisions}
          persistDrawings={true}
        />
        
        {/* Z-plane drawings - always visible */}
        <SketchPlane
          key="sketch-z" 
          dimension="z"
          tool={sketchState.selectedTool}
          isActive={isSketchModeActive && sketchState.dimension === "z"}
          gridSize={gridSize}
          gridDivisions={gridDivisions}
          persistDrawings={true}
        />
        
        <CameraControls 
          ref={cameraControlsRef}
          minDistance={1}
          maxDistance={500}
          makeDefault
        />
        <directionalLight position={[2, 2, 2]} />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  )
}