'use client'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useRef, useState, useCallback, useEffect } from 'react'
import { CameraControls } from '@react-three/drei'
import Grid from './grid'
import Gizmo from './gizmo'
import ResetGridButton from './reset-grid-button'
import SketchControls, { Dimension, Tool } from './sketch-controls'
import SketchPlane from './sketch-plane'

// Camera position controller component
function CameraPositioner({ 
  dimension,
  isActive,
}: { 
  dimension: Dimension;
  isActive: boolean;
}) {
  const { camera } = useThree();
  
  // Hard-coded camera positions for each dimension
  useEffect(() => {
    if (!isActive) return;
    
    // Set camera position immediately based on dimension
    if (dimension === 'x') {
      // X dimension view (looking at YZ plane)
      camera.position.set(100, 0, 0);
      camera.lookAt(0, 0, 0);
    } else if (dimension === 'y') {
      // Y dimension view (looking at XZ plane)
      camera.position.set(0, 100, 0);
      camera.lookAt(0, 0, 0);
    } else {
      // Z dimension view (looking at XY plane)
      camera.position.set(0, 0, 100);
      camera.lookAt(0, 0, 0);
    }
    
    camera.updateProjectionMatrix();
  }, [dimension, camera, isActive]);
  
  return null;
}

export default function Scene() {
  const cameraControlsRef = useRef<CameraControls | null>(null)
  const [isSketchModeActive, setIsSketchModeActive] = useState(false)
  const [selectedDimension, setSelectedDimension] = useState<Dimension>('z')
  const [selectedTool, setSelectedTool] = useState<Tool>('pencil')
  
  const gridSize = 100
  const gridDivisions = 100

  // Handle dimension change
  const handleDimensionChange = useCallback((dimension: Dimension) => {
    console.log(`Dimension changed to: ${dimension}`);
    setSelectedDimension(dimension);
  }, []);

  // Toggle sketch mode
  const handleToggleSketchMode = useCallback(() => {
    setIsSketchModeActive(prev => !prev);
  }, []);

  // Disable camera controls in sketch mode
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    if (isSketchModeActive) {
      // Disable controls completely when in sketch mode
      cameraControlsRef.current.enabled = false;
    } else {
      // Re-enable controls when not in sketch mode
      cameraControlsRef.current.enabled = true;
    }
  }, [isSketchModeActive]);

  // Handle tool change
  const handleToolChange = useCallback((tool: Tool) => {
    setSelectedTool(tool);
  }, []);

  return (
    <div className="flex h-full w-full relative">
      <ResetGridButton cameraControlsRef={cameraControlsRef} />
      
      <SketchControls
        onDimensionChange={handleDimensionChange}
        onToolChange={handleToolChange}
        onToggleSketchMode={handleToggleSketchMode}
        isSketchModeActive={isSketchModeActive}
        selectedDimension={selectedDimension}
      />

      <Canvas 
        className="flex h-full w-full" 
        camera={{ position: [5, 5, 5] }}
        tabIndex={0}
      >
        {/* Camera positioner - directly manipulates the camera */}
        <CameraPositioner 
          dimension={selectedDimension} 
          isActive={isSketchModeActive} 
        />
        
        <Gizmo />
        <Grid 
          size={gridSize} 
          divisions={gridDivisions} 
        />
        
        {/* Add sketch plane with persistent drawings */}
        <SketchPlane
          key={`sketch-${selectedDimension}`} 
          dimension={selectedDimension}
          tool={selectedTool}
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