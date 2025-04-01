'use client'
import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import Grid from './grid'
import Gizmo from './gizmo'
import ResetGridButton from './reset-grid-button'

export default function Scene() {
  const cameraControlsRef = useRef<CameraControls | null>(null)

  return (
    <div className="flex h-full w-full relative">
      <ResetGridButton cameraControlsRef={cameraControlsRef} />

      <Canvas 
        className="flex h-full w-full" 
        camera={{ position: [5, 5, 5] }}
        onKeyDown={(e) => {
          console.log('Canvas key pressed:', e.key, 'Command:', e.metaKey, 'Shift:', e.shiftKey)
        }}
        tabIndex={0}
      >
        <Gizmo />
        <Grid />
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