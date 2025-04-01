import { type CameraControls } from "@react-three/drei"
import { Button } from "~/components/ui/button"

interface ResetGridButtonProps {
  cameraControlsRef: React.RefObject<CameraControls>
}

export default function ResetGridButton({ cameraControlsRef }: ResetGridButtonProps) {
  
  const resetCamera = async () => {
    if (cameraControlsRef.current) {
      await cameraControlsRef.current.reset(true)
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