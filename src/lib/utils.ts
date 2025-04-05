import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getGradientFromId = (id: string): string => {
  const baseHue = parseInt(id ?? '0', 36) % 360;
  const secondHue = (baseHue + 60) % 360;

  return `linear-gradient(135deg, 
    hsl(${baseHue}, 80%, 85%),
    hsl(${secondHue}, 80%, 65%)
  )`;
};
