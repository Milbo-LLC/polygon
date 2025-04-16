'use client'
import { Canvas, useThree } from '@react-three/fiber'
import { useRef, useCallback, useEffect } from 'react'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import Grid from './grid'
import Gizmo from './gizmo'
import ResetGridButton from './reset-grid-button'
import { type Dimension, type Tool } from './sketch-controls'
import SketchPlane from './sketch-plane'
import ControlPanel from './control-panel'
import PlaneSelector from './plane-selector'
import { useAtom, useAtomValue } from 'jotai'
import { canvasStateAtom, sketchStateAtom, type SketchTool } from '../(protected)/atoms'

// Camera position controller component
function CameraPositioner({ 
  dimension,
  isActive,
  cameraControlsRef,
}: { 
  dimension: Dimension;
  isActive: boolean;
  cameraControlsRef: React.RefObject<CameraControls>;
}) {
  const { camera } = useThree();
  
  // Update camera controls when sketch mode changes
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    // Disable camera controls in sketch mode
    cameraControlsRef.current.enabled = !isActive;
    
  }, [isActive, cameraControlsRef]);
  
  // Position camera when dimension changes
  useEffect(() => {
    if (!dimension || !isActive) return;
    
    // Simple positioning based on dimension - look directly at the plane
    switch(dimension) {
      case 'x':
        // Look at YZ plane from positive X
        camera.position.set(10, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'y':
        // Look at XZ plane from positive Y
        camera.position.set(0, 10, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'z':
        // Look at XY plane from positive Z
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        break;
    }
    
    // Force camera to update immediately
    camera.updateProjectionMatrix();
    
  }, [dimension, isActive, camera]);
  
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

  const setSelectedTool = useCallback((tool: SketchTool) => {
    setSketchState({
      ...sketchState,
      selectedTool: tool
    })
  }, [sketchState, setSketchState])

  // Reset dimension when entering sketch mode
  useEffect(() => {
    // Get previous sketch mode state
    const prevSketchModeActive = prevSketchModeActiveRef.current;
    
    // Update ref with current state for next comparison
    prevSketchModeActiveRef.current = isSketchModeActive;
    
    // Reset dimension when entering sketch mode to allow selecting a new plane each time
    if (isSketchModeActive && !prevSketchModeActive) {
      // @ts-ignore - We know dimension should be reset to null
      setSketchState({...sketchState, dimension: null});
    }
    
  }, [isSketchModeActive, sketchState, setSketchState]);

  // Handle tool change
  const handleToolChange = useCallback((tool: Tool) => {
    setSelectedTool(tool);
  }, []);

  return (
    <div className="flex h-full w-full relative">
      <ResetGridButton cameraControlsRef={cameraControlsRef} />
      
      {/* <SketchControls
        onDimensionChange={handleDimensionChange}
        onToolChange={handleToolChange}
        onToggleSketchMode={handleToggleSketchMode}
        isSketchModeActive={isSketchModeActive}
        selectedDimension={selectedDimension}
      /> */}

      <ControlPanel />
      <Canvas 
        className="flex h-full w-full" 
        camera={{ position: [5, 5, 5] }}
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
        
        {/* Plane selector - shows 3D buttons on each coordinate plane */}
        <PlaneSelector
          isActive={isSketchModeActive && sketchState.dimension === null}
          gridSize={gridSize}
        />
        
        {/* Add sketch plane with persistent drawings */}
        <SketchPlane
          key={`sketch-${sketchState.dimension}`} 
          dimension={sketchState.dimension}
          tool={sketchState.selectedTool}
          isActive={isSketchModeActive}
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