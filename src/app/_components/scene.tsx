'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import { type Mesh, Vector3, type Matrix4, Material, type LineBasicMaterial } from 'three'
import { CameraControls, PivotControls } from '@react-three/drei'
import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

type Coordinates = [number, number, number]

interface CubeProps {
  size?: Coordinates,
  color?: string,
  position?: Coordinates
}

// Define the atoms with safe default values (will use localStorage in the browser)
const positionHistoryAtom = atomWithStorage<Coordinates[]>('cube-positions', [[0, 0, 0]])
const currentPositionAtom = atomWithStorage<Coordinates>('current-position', [0, 0, 0])
const historyIndexAtom = atomWithStorage<number>('history-index', 0)

// Fusion 360-style adaptive grid
const Fusion360Grid = ({ units = 'mm' }) => {
  const { camera } = useThree()
  const gridColor = "#3471eb" // Consistent Fusion 360-like blue color
  
  // Scale factors for different units
  const unitScales = {
    mm: 1,
    inch: 25.4 // 1 inch = 25.4mm
  }
  
  const scale = unitScales[units as keyof typeof unitScales]

  const gridRefs = {
    major: useRef<LineBasicMaterial>(null),
    level0: useRef<LineBasicMaterial>(null),
    level1: useRef<LineBasicMaterial>(null),
    level2: useRef<LineBasicMaterial>(null),
    level3: useRef<LineBasicMaterial>(null)
  }

  useFrame(() => {
    // Calculate distance from camera to origin
    const distance = new Vector3(0, 0, 0).distanceTo(camera.position)

    // Define thresholds for different grid densities
    const thresholds = {
      level0: 100,
      level1: 40,
      level2: 15,
      level3: 5
    }

    // Major grid is always visible with varying opacity
    if (gridRefs.major.current) {
      // Major grid is always visible but fades a bit when very close
      gridRefs.major.current.opacity = distance < 10 ? 0.4 : 0.7
    }

    // Level 0 grid (100x100 in 1000 unit area)
    if (gridRefs.level0.current) {
      if (distance > thresholds.level0) {
        gridRefs.level0.current.opacity = 0.6
      } else if (distance > thresholds.level1) {
        const t = (distance - thresholds.level1) / (thresholds.level0 - thresholds.level1)
        gridRefs.level0.current.opacity = 0.6 * t
      } else {
        gridRefs.level0.current.opacity = 0
      }
    }

    // Level 1 grid (50x50 in 100 unit area)
    if (gridRefs.level1.current) {
      if (distance < thresholds.level0 && distance > thresholds.level1) {
        const fadeIn = Math.min((thresholds.level0 - distance) / 20, 1)
        const fadeOut = Math.max((distance - thresholds.level1) / 5, 0)
        gridRefs.level1.current.opacity = 0.5 * Math.min(fadeIn, 1 - fadeOut)
      } else if (distance <= thresholds.level1 && distance > thresholds.level2) {
        gridRefs.level1.current.opacity = 0.5
      } else {
        gridRefs.level1.current.opacity = 0
      }
    }

    // Level 2 grid (250x250 in 100 unit area)
    if (gridRefs.level2.current) {
      if (distance < thresholds.level1 && distance > thresholds.level2) {
        const t = (thresholds.level1 - distance) / (thresholds.level1 - thresholds.level2)
        gridRefs.level2.current.opacity = 0.4 * t
      } else if (distance <= thresholds.level2 && distance > thresholds.level3) {
        gridRefs.level2.current.opacity = 0.4
      } else {
        gridRefs.level2.current.opacity = 0
      }
    }

    // Level 3 grid (1250x1250 in 100 unit area)
    if (gridRefs.level3.current) {
      if (distance < thresholds.level2 && distance > thresholds.level3) {
        const t = (thresholds.level2 - distance) / (thresholds.level2 - thresholds.level3)
        gridRefs.level3.current.opacity = 0.3 * t
      } else if (distance <= thresholds.level3) {
        gridRefs.level3.current.opacity = 0.3
      } else {
        gridRefs.level3.current.opacity = 0
      }
    }
  })

  // Grid sizes scaled based on units
  const baseSize = 1000 * scale
  const detailSize = 100 * scale

  return (
    <>
      {/* Major grid lines that are always visible (10x10) */}
      <gridHelper
        args={[baseSize, 10, gridColor, gridColor]}
        position={[0, 0, 0]}
      >
        <lineBasicMaterial
          ref={gridRefs.major}
          transparent={true}
          opacity={0.7}
          color={gridColor}
          linewidth={1}
        />
      </gridHelper>

      {/* Level 0 - base grid (100x100) */}
      <gridHelper
        args={[baseSize, 100]}
        position={[0, 0, 0]}
      >
        <lineBasicMaterial
          ref={gridRefs.level0}
          transparent={true}
          opacity={0.0}
          color={gridColor}
        />
      </gridHelper>

      {/* Level 1 - medium zoom (50x50) */}
      <gridHelper
        args={[detailSize, 50]}
        position={[0, 0, 0]}
      >
        <lineBasicMaterial
          ref={gridRefs.level1}
          transparent={true}
          opacity={0.0}
          color={gridColor}
        />
      </gridHelper>

      {/* Level 2 - closer zoom (250x250) */}
      <gridHelper
        args={[detailSize, 250]}
        position={[0, 0, 0]}
      >
        <lineBasicMaterial
          ref={gridRefs.level2}
          transparent={true}
          opacity={0.0}
          color={gridColor}
        />
      </gridHelper>

      {/* Level 3 - closest zoom (1250x1250) */}
      <gridHelper
        args={[detailSize, 1250]}
        position={[0, 0, 0]}
      >
        <lineBasicMaterial
          ref={gridRefs.level3}
          transparent={true}
          opacity={0.0}
          color={gridColor}
        />
      </gridHelper>

      {/* Axes */}
      <axesHelper args={[500 * scale]} />
    </>
  )
}

const Cube = ({
  size = [1, 1, 1],
  color = "red",
  position = [0, 0, 0]
}: CubeProps) => {
  const ref = useRef<Mesh>(null)
  const [positionHistory, setPositionHistory] = useAtom(positionHistoryAtom)
  const [currentPosition, setCurrentPosition] = useAtom(currentPositionAtom)
  const [historyIndex, setHistoryIndex] = useAtom(historyIndexAtom)
  
  // For PivotControls
  const pivotRef = useRef(null)
  
  // Add a state flag to track client-side rendering
  const [isClient, setIsClient] = useState(false)
  
  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Debug logs whenever these values change - client side only
  useEffect(() => {
    if (isClient) {
      console.log('History updated:', { positionHistory, historyIndex, currentPosition })
    }
  }, [positionHistory, historyIndex, currentPosition, isClient])
  
  useEffect(() => {
    // Only add event listeners on client side
    if (!isClient) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Key event:', {
        key: e.key,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        target: e.target,
        currentTarget: e.currentTarget
      })
      
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.stopPropagation()
        console.log('Attempting redo. Current index:', historyIndex, 'History length:', positionHistory.length)
        if (historyIndex < positionHistory.length - 1) {
          const newIndex = historyIndex + 1
          const newPosition = positionHistory[newIndex]
          if (newPosition) {
            console.log('Redoing to position:', newPosition)
            setHistoryIndex(newIndex)
            setCurrentPosition(newPosition)
          }
        }
      } else if (e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.stopPropagation()
        console.log('Attempting undo. Current index:', historyIndex, 'History:', positionHistory)
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          const newPosition = positionHistory[newIndex]
          if (newPosition) {
            console.log('Undoing to position:', newPosition)
            setHistoryIndex(newIndex)
            setCurrentPosition(newPosition)
          }
        }
      }
    }

    // Add event listener to window instead of canvas
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, positionHistory, setCurrentPosition, setHistoryIndex, isClient])

  // Store starting position for drag operation
  const startPosition = useRef<Coordinates>([0, 0, 0])
  // Track if we're currently in a drag operation
  const isDragging = useRef(false)

  const onDragStart = () => {
    if (ref.current) {
      // Store the current history position as our starting point
      // This ensures we compare against the last recorded position
      startPosition.current = [...currentPosition]
      if (isClient) {
        console.log('Starting drag from history position:', startPosition.current)
      }
      isDragging.current = true
    }
  }

  const onDrag = (localMatrix: Matrix4) => {
    // We need to prevent position updates from state during dragging
    isDragging.current = true
  }

  const onDragEnd = () => {
    if (ref.current) {
      // Get the final position after drag
      const position = ref.current.position.clone()
      const newPosition: Coordinates = [
        parseFloat(position.x.toFixed(5)),
        parseFloat(position.y.toFixed(5)),
        parseFloat(position.z.toFixed(5))
      ]
      
      if (isClient) {
        console.log('Drag ended at:', newPosition)
        console.log('Start position was:', startPosition.current)
      }
      
      // Update the current position state
      setCurrentPosition(newPosition)
      
      // Only add to history if the position has changed from the starting position
      // We use a more precise comparison to avoid floating point issues
      const positionChanged = 
        Math.abs(newPosition[0] - startPosition.current[0]) > 0.0001 || 
        Math.abs(newPosition[1] - startPosition.current[1]) > 0.0001 || 
        Math.abs(newPosition[2] - startPosition.current[2]) > 0.0001;
      
      if (positionChanged) {
        if (isClient) {
          console.log('Position changed, updating history')
        }
        
        // Create new history by removing any entries after the current index
        // and adding the new position at the end
        const newHistory = [...positionHistory.slice(0, historyIndex + 1), newPosition]
        const newIndex = newHistory.length - 1
        
        if (isClient) {
          console.log('New history:', {
            oldHistory: positionHistory,
            newHistory,
            oldIndex: historyIndex,
            newIndex
          })
        }
        
        // Update history state
        setPositionHistory(newHistory)
        setHistoryIndex(newIndex)
      } else if (isClient) {
        console.log('Position unchanged, not updating history')
      }
      
      // Reset dragging state
      isDragging.current = false
    }
  }

  // Update the mesh position whenever currentPosition changes
  useEffect(() => {
    if (ref.current && !isDragging.current) {
      if (isClient) {
        console.log('Updating position from state:', currentPosition)
      }
      // Apply the position directly to the mesh
      ref.current.position.set(...currentPosition)
    }
  }, [currentPosition, isClient])

  // Set initial position on mount
  useEffect(() => {
    if (ref.current && isClient) {
      console.log('Setting initial position on mount:', currentPosition)
      ref.current.position.set(...currentPosition)
    }
  }, [isClient, currentPosition])

  return (
    <PivotControls 
      ref={pivotRef}
      scale={1}
      lineWidth={2}
      fixed={false}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      autoTransform={true}
    >
      <mesh ref={ref}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </PivotControls>
  )
}

export default function Scene() {
  const [positionHistory] = useAtom(positionHistoryAtom)
  const [historyIndex] = useAtom(historyIndexAtom)

  return (
    <div className="flex h-full w-full">
      <Canvas 
        className="flex h-full w-full" 
        camera={{ position: [5, 5, 5] }}
        onKeyDown={(e) => {
          console.log('Canvas key pressed:', e.key, 'Command:', e.metaKey, 'Shift:', e.shiftKey)
        }}
        tabIndex={0}  // Make canvas focusable
      >
        <Fusion360Grid />
        <CameraControls 
          minDistance={1}
          maxDistance={500}
          makeDefault
        />
        <directionalLight position={[2, 2, 2]} />
        <ambientLight intensity={0.5} />
        {/* <Cube size={[1, 1, 1]} /> */}
        

      </Canvas>
    </div>
  )
}