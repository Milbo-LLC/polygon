'use client'
import { Canvas } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { CameraControls } from '@react-three/drei'
import Grid from './grid'
import Gizmo from './gizmo'
import ResetGridButton from './reset-grid-button'
import { type Dimension } from './sketch/_components/sketch-controls'
import SketchPlane from './sketch/_components/sketch-plane'
import ControlPanel from './control-panel'
import PlaneSelector from './sketch/_components/plane-selector'
import { useAtom, useAtomValue } from 'jotai'
import { canvasStateAtom, sketchStateAtom } from '../(protected)/atoms'
import DynamicAxesHelper from './dynamic-axes-helper'
import ExtrudeHandler from './extrude/_components/extrude-handler'
import ExtrudedShapes from './extrude/_components/extruded-shapes'
import ExtrudeControls from './extrude/_components/extrude-controls'
import Timeline from './history/timeline'

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
        
        // Only reset camera when entering sketch mode if no dimension is selected yet
        // The dimension change effect will handle camera positioning if a dimension is selected
        if (!wasActive && !dimension) {
          // Set to standard isometric view position
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
        
        // If we just exited sketch mode, go to default view
        if (wasActive) {
          // Set directly to a nice viewing angle
          await cameraControlsRef.current.setLookAt(
            50, 50, 50,  // position: further away isometric view
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
      
      // Position camera directly based on the selected plane
      switch(dimension) {
        case 'x':
          // Position camera to look at YZ plane at x=0
          await controls.setLookAt(
            50, 0, 0,   // position
            0, 0, 0,    // target
            true        // immediate
          );
          break;
        case 'y':
          // Position camera to look at XZ plane at y=0
          await controls.setLookAt(
            0, 50, 0,   // position
            0, 0, 0,    // target
            true        // immediate
          );
          break;
        case 'z':
          // Position camera to look at XY plane at z=0
          await controls.setLookAt(
            0, 0, 50,   // position
            0, 0, 0,    // target
            true        // immediate
          );
          break;
      }
      
      // Apply changes immediately
      controls.update(0);
    })();
    
  }, [dimension, isActive, cameraControlsRef]);
  
  return null;
}

export default function Scene() {
  console.log('[Scene] Scene component function called')
  const cameraControlsRef = useRef<CameraControls | null>(null)
  const canvasState = useAtomValue(canvasStateAtom)
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  
  console.log('[Scene] Scene component initialized, canvasState:', canvasState)
  
  // Use a ref to track previous sketch mode state
  const prevSketchModeActiveRef = useRef<boolean>(false);
  
  const gridSize = 100
  const gridDivisions = 100

  const isSketchModeActive = canvasState.selectedTool === 'sketch'
  const isExtrudeModeActive = canvasState.selectedTool === 'extrude'

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

  console.log('[Scene] Rendering Scene component with Timeline')

  return (
    <div className="flex h-full w-full relative">
      <ResetGridButton cameraControlsRef={cameraControlsRef} />
      <ControlPanel />
      <ExtrudeControls />
      <Timeline />
      <Canvas 
        className="flex h-full w-full" 
        camera={{
          position: [100, 100, 100],
          fov: 30,
          near: 0.0001,
          far: 100000
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
        <Grid />
        <DynamicAxesHelper />

        {/* Plane selector - only show when in sketch mode and no dimension selected */}
        <PlaneSelector
          isActive={isSketchModeActive && sketchState.dimension === null}
          gridSize={gridSize}
        />

        {/* Extrude mode handler */}
        <ExtrudeHandler isActive={isExtrudeModeActive} />

        {/* Render extruded 3D shapes */}
        <ExtrudedShapes />
        
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
          minDistance={0.01}
          maxDistance={10000}
          makeDefault
        />
        <directionalLight position={[2, 2, 2]} />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  )
}