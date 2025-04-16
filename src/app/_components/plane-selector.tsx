'use client'

import { useState } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useAtom } from 'jotai'
import { sketchStateAtom } from '../(protected)/atoms'
import { type Dimension } from './sketch-controls'

interface PlaneSelectorProps {
  isActive: boolean
  gridSize: number
}

export default function PlaneSelector({ isActive, gridSize }: PlaneSelectorProps) {
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  const [hovered, setHovered] = useState<Dimension | null>(null)

  // Don't render if not in selection mode
  if (!isActive) {
    return null
  }

  const handleDimensionSelect = (dimension: Dimension) => {
    setSketchState({
      ...sketchState,
      dimension
    })
  }

  // Make planes extremely small - 2% of grid size
  const planeSize = gridSize * 0.02;
  // Small offset to ensure planes don't intersect but just touch at the corner
  const offset = 0.01;

  return (
    <group>
      {/* XY Plane (Z) - moves slightly forward in Z direction */}
      <mesh 
        position={[planeSize/2, planeSize/2, offset]}
        onPointerOver={() => setHovered('z')}
        onPointerOut={() => setHovered(null)}
        onClick={() => handleDimensionSelect('z')}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial 
          color={hovered === 'z' ? "#fff0d1" : "#ffe9c4"} 
          transparent
          opacity={hovered === 'z' ? 0.8 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* XZ Plane (Y) - moves slightly up in Y direction */}
      <mesh 
        position={[planeSize/2, offset, planeSize/2]}
        rotation={[Math.PI/2, 0, 0]}
        onPointerOver={() => setHovered('y')}
        onPointerOut={() => setHovered(null)}
        onClick={() => handleDimensionSelect('y')}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial 
          color={hovered === 'y' ? "#fff0d1" : "#ffe9c4"} 
          transparent
          opacity={hovered === 'y' ? 0.8 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* YZ Plane (X) - moves slightly right in X direction */}
      <mesh 
        position={[offset, planeSize/2, planeSize/2]}
        rotation={[0, Math.PI/2, 0]}
        onPointerOver={() => setHovered('x')}
        onPointerOut={() => setHovered(null)}
        onClick={() => handleDimensionSelect('x')}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial 
          color={hovered === 'x' ? "#fff0d1" : "#ffe9c4"} 
          transparent
          opacity={hovered === 'x' ? 0.8 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* X Axis */}
      <Line 
        points={[[0, 0, 0], [planeSize, 0, 0]]} 
        color="red" 
        lineWidth={2}
      />

      {/* Y Axis */}
      <Line 
        points={[[0, 0, 0], [0, planeSize, 0]]} 
        color="green" 
        lineWidth={2}
      />

      {/* Z Axis */}
      <Line 
        points={[[0, 0, 0], [0, 0, planeSize]]} 
        color="blue" 
        lineWidth={2}
      />
    </group>
  )
} 