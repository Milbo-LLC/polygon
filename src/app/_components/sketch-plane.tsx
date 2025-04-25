import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { type Dimension, type Tool } from './sketch/_components/sketch-controls'
import { useKeyboardShortcut } from '~/hooks/use-keyboard-shortcuts'

// Types
interface SketchPlaneProps {
  dimension: Dimension
  tool: Tool
  isActive: boolean
  gridSize: number
  gridDivisions: number
  persistDrawings?: boolean
}

interface Point3D {
  x: number
  y: number
  z: number
}

interface SketchItem {
  id: string
  tool: Tool
  color: string
  points: Point3D[]
  dimension: Dimension
}

// Constants
const OFFSET_FROM_PLANE = 0.01;
const DEFAULT_SKETCH_COLOR = '#000000';
const ACTIVE_SKETCH_COLOR = '#ff0000';
const DEFAULT_LINE_WIDTH = 3;

// Global store to keep sketches across component rerenders
const globalSketchStore: Record<Dimension, SketchItem[]> = {
  x: [],
  y: [],
  z: []
};

// Custom hook for sketch persistence
function useSketchPersistence(dimension: Dimension, persistSketches: boolean) {
  const [sketches, setSketches] = useState<SketchItem[]>([]);
  
  // Load initial sketches from global store
  useEffect(() => {
    if (persistSketches) {
      setSketches(globalSketchStore[dimension]);
    }
  }, [dimension, persistSketches]);
  
  // Update global store when sketches change
  useEffect(() => {
    if (persistSketches) {
      globalSketchStore[dimension] = sketches;
    }
  }, [sketches, dimension, persistSketches]);
  
  return { sketches, setSketches };
}

// Custom hook for grid snapping
function useGridSnapping(gridSize: number, gridDivisions: number) {
  return useCallback((value: number): number => {
    const cellSize = gridSize / gridDivisions;
    return Math.round(value / cellSize) * cellSize;
  }, [gridSize, gridDivisions]);
}

// Custom hook for raycasting and point calculation
function useRaycast(meshRef: React.RefObject<THREE.Mesh>, snapToGrid: (value: number) => number) {
  const { raycaster, mouse, camera } = useThree();
  
  const getIntersectionPoint = useCallback((): THREE.Intersection | null => {
    if (!meshRef.current) return null;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshRef.current);
    
    return intersects.length > 0 ? intersects[0] as THREE.Intersection : null;
  }, [raycaster, mouse, camera, meshRef]);
  
  const getSnappedPoint = useCallback((intersection: THREE.Intersection): Point3D | null => {
    if (!intersection?.point) return null;
    
    const point = intersection.point;
    
    return {
      x: snapToGrid(point.x),
      y: snapToGrid(point.y),
      z: snapToGrid(point.z)
    };
  }, [snapToGrid]);
  
  return { getIntersectionPoint, getSnappedPoint };
}

// Tool handlers for different sketch tools
interface ToolHandlers {
  [key: string]: {
    handleMove: (currentSketch: SketchItem, newPoint: Point3D) => SketchItem;
    getPoints: (sketch: SketchItem) => [number, number, number][];
  }
}

export default function SketchPlane({
  dimension,
  tool,
  isActive,
  gridSize = 100,
  gridDivisions = 100,
  persistDrawings = false
}: SketchPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { sketches, setSketches } = useSketchPersistence(dimension, persistDrawings);
  const [isSketching, setIsSketching] = useState(false);
  const [currentSketch, setCurrentSketch] = useState<SketchItem | null>(null);
  
  const snapToGrid = useGridSnapping(gridSize, gridDivisions);
  const { getIntersectionPoint, getSnappedPoint } = useRaycast(meshRef, snapToGrid);
  
  // Plane config based on dimension
  const planeConfig = useMemo(() => ({
    x: {
      position: [0, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      color: '#ff7b7b'
    },
    y: {
      position: [0, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
      color: '#7bff7b'
    },
    z: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      color: '#7b7bff'
    }
  }), []);
  
  // Tool handlers
  const toolHandlers = useMemo<ToolHandlers>(() => ({
    pencil: {
      handleMove: (currentSketch, newPoint) => ({
        ...currentSketch,
        points: [...currentSketch.points, newPoint]
      }),
      getPoints: (sketch) => convertPointsToLine(sketch.points)
    },
    rectangle: {
      handleMove: (currentSketch, newPoint) => {
        const firstPoint = currentSketch.points[0];
        if (!firstPoint) return currentSketch;
        
        return {
          ...currentSketch,
          points: [firstPoint, newPoint]
        };
      },
      getPoints: (sketch) => {
        if (sketch.points.length < 2) return [];
        
        const [start, end] = sketch.points;
        if (!start || !end) return [];
        
        return getRectanglePoints(start, end);
      }
    }
  }), []);
  
  // Points transformation helper functions
  const convertPointsToLine = useCallback((points: Point3D[]): [number, number, number][] => {
    if (!points || points.length === 0) return [];
    
    return points.map((p): [number, number, number] => {
      if (dimension === 'x') {
        return [OFFSET_FROM_PLANE, p.y, p.z]; 
      } else if (dimension === 'y') {
        return [p.x, OFFSET_FROM_PLANE, p.z];
      } else {
        return [p.x, p.y, OFFSET_FROM_PLANE];
      }
    });
  }, [dimension]);
  
  const getRectanglePoints = useCallback((start: Point3D, end: Point3D): [number, number, number][] => {
    if (dimension === 'x') {
      return [
        [OFFSET_FROM_PLANE, start.y, start.z],
        [OFFSET_FROM_PLANE, start.y, end.z],
        [OFFSET_FROM_PLANE, end.y, end.z],
        [OFFSET_FROM_PLANE, end.y, start.z],
        [OFFSET_FROM_PLANE, start.y, start.z]
      ];
    } else if (dimension === 'y') {
      return [
        [start.x, OFFSET_FROM_PLANE, start.z],
        [end.x, OFFSET_FROM_PLANE, start.z],
        [end.x, OFFSET_FROM_PLANE, end.z],
        [start.x, OFFSET_FROM_PLANE, end.z],
        [start.x, OFFSET_FROM_PLANE, start.z]
      ];
    } else {
      return [
        [start.x, start.y, OFFSET_FROM_PLANE],
        [end.x, start.y, OFFSET_FROM_PLANE],
        [end.x, end.y, OFFSET_FROM_PLANE],
        [start.x, end.y, OFFSET_FROM_PLANE],
        [start.x, start.y, OFFSET_FROM_PLANE]
      ];
    }
  }, [dimension]);
  
  // Handlers
  const handleCancelSketching = useCallback(() => {
    if (isSketching) {
      setIsSketching(false);
      setCurrentSketch(null);
    }
  }, [isSketching]);
  
  const handleUndoSketching = useCallback(() => {
    setSketches(prev => {
      const newSketches = prev.slice(0, -1);
      return newSketches;
    });
  }, [setSketches]);
  
  const handleCompleteSketching = useCallback(() => {
    if (!currentSketch || currentSketch.points.length < 2) {
      setIsSketching(false);
      setCurrentSketch(null);
      return;
    }
    
    setSketches(prev => [...prev, currentSketch]);
    setIsSketching(false);
    setCurrentSketch(null);
  }, [currentSketch, setSketches]);
  
  const handleStartSketching = useCallback((point: Point3D) => {
    setIsSketching(true);
    setCurrentSketch({
      id: Date.now().toString(),
      tool,
      color: DEFAULT_SKETCH_COLOR,
      points: [point],
      dimension
    });
  }, [tool, dimension]);
  
  // Use keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'Escape',
      disabled: !isActive,
      callback: handleCancelSketching
    },
    {
      key: 'z',
      ctrlKey: true,
      disabled: !isActive,
      preventDefault: true,
      callback: handleUndoSketching
    },
    {
      key: 'z',
      metaKey: true,
      disabled: !isActive,
      preventDefault: true,
      callback: handleUndoSketching
    }
  ]);
  
  // Handle mouse move for sketching
  useEffect(() => {
    if (!isActive || !isSketching || !currentSketch) return;
    
    const handlePointerMove = () => {
      const intersection = getIntersectionPoint();
      if (!intersection) return;
      
      const snappedPoint = getSnappedPoint(intersection);
      if (!snappedPoint) return;
      
      const handler = toolHandlers[currentSketch.tool];
      if (handler) {
        setCurrentSketch(handler.handleMove(currentSketch, snappedPoint));
      }
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [
    isActive, isSketching, currentSketch, 
    getIntersectionPoint, getSnappedPoint, toolHandlers
  ]);
  
  // Handle click to start/end sketching
  const handleClick = useCallback(() => {
    if (!isActive) return;
    
    const intersection = getIntersectionPoint();
    if (!intersection) return;
    
    if (isSketching) {
      handleCompleteSketching();
      return;
    }
    
    const snappedPoint = getSnappedPoint(intersection);
    if (!snappedPoint) return;
    
    handleStartSketching(snappedPoint);
  }, [
    isActive, isSketching, 
    getIntersectionPoint, getSnappedPoint, 
    handleCompleteSketching, handleStartSketching
  ]);
  
  // Render sketch
  const renderSketch = useCallback((sketch: SketchItem, isActive = false) => {
    const handler = toolHandlers[sketch.tool];
    if (!handler || sketch.points.length < 2) return null;
    
    const points = handler.getPoints(sketch);
    if (points.length === 0) return null;
    
    return (
      <Line
        key={sketch.id}
        points={points}
        color={isActive ? ACTIVE_SKETCH_COLOR : sketch.color}
        lineWidth={DEFAULT_LINE_WIDTH}
      />
    );
  }, [toolHandlers]);

  return (
    <>
      {/* Drawing plane */}
      <mesh
        ref={meshRef}
        position={planeConfig[dimension].position as unknown as THREE.Vector3}
        rotation={planeConfig[dimension].rotation as unknown as THREE.Euler}
        visible={isActive}
        onClick={handleClick}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial 
          color={planeConfig[dimension].color}
          transparent={true}
          opacity={isSketching ? 0.2 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Render existing sketches */}
      {sketches.map(sketch => renderSketch(sketch))}

      {/* Render current sketch */}
      {isActive && currentSketch && currentSketch.points.length >= 1 && renderSketch(currentSketch, true)}
    </>
  );
} 