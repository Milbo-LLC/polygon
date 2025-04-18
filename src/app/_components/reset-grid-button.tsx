import { type CameraControls } from "@react-three/drei"
import { Button } from "~/components/ui/button"

interface ResetGridButtonProps {
  cameraControlsRef: React.RefObject<CameraControls>
}

export default function ResetGridButton({ cameraControlsRef }: ResetGridButtonProps) {
  
  const resetCamera = async () => {
    if (cameraControlsRef.current) {
      await cameraControlsRef.current.reset(true)
      
      // Set to a less zoomed in position after reset
      await cameraControlsRef.current.setLookAt(
        30, 30, 30,  // further away position
        0, 0, 0,     // still looking at origin
        true         // immediate
      );
    }
  }
  
  return (
    <Button
      className="absolute bottom-4 right-4 z-10"
      onClick={resetCamera}
      variant="secondary"
      size="sm"
    >
      Reset View
    </Button>
  )
}