import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getGradientFromId = (id: string): string => {
  // Extract a more consistent numeric value from CUID by using string hash
  const hash = Array.from(id || '0')
    .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  
  // Use absolute value and modulo to get positive hue values
  const baseHue = Math.abs(hash) % 360;
  // Create complementary or analogous color by offsetting
  const secondHue = (baseHue + 180) % 360; // Complementary
  
  return `linear-gradient(135deg, 
    hsl(${baseHue}, 80%, 85%),
    hsl(${secondHue}, 80%, 65%)
  )`;
};
