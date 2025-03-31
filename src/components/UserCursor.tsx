import { Badge } from "./ui/badge";
import { MousePointer2 } from "lucide-react";

interface CursorProps {
  position: { x: number; y: number };
  name: string;
  color: string;
}

export function generateColorForUser(userId: string): string {
  // Use the userId to generate a consistent hue value between 0-360
  const hueBase = Math.abs(
    userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  );
  
  // Generate HSL color with:
  // - Random hue variation (+/- 20 degrees) for more uniqueness
  // - High saturation (70-90%) for vibrant colors
  // - High lightness (45-65%) for visibility
  const hue = (hueBase + Math.random() * 40 - 20) % 360;
  const saturation = 80 + Math.random() * 10; // 80-90%
  const lightness = 55 + Math.random() * 10;  // 55-65%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function Cursor({ position, name, color }: CursorProps) {
  console.log("Rendering cursor for:", name);
  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Cursor */}
      <MousePointer2
        size={24}
        fill={color}
        stroke={color}
        className="drop-shadow-md"
      />

      {/* Username label */}
      <div 
        className="absolute left-6 top-0"
        style={{ backgroundColor: 'transparent' }}
      >
        <Badge
          variant="outline"
          className="whitespace-nowrap"
          style={{ 
            borderColor: color,
            color: color,
            backgroundColor: "hsl(var(--background))",
          }}
        >
          {name}
        </Badge>
      </div>
    </div>
  );
} 