import { useMemo } from 'react'
import { type Dimension } from '../../sketch-controls'

export function usePlaneConfig() {
  return useMemo(() => ({
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
  }), [])
}