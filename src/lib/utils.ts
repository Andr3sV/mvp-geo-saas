import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a random color from a curated palette
 * Ensures visual distinction between items
 * @param usedColors Set of colors already used to avoid duplicates
 * @returns A hex color code
 */
export function generateRandomColor(usedColors: Set<string> = new Set()): string {
  // Curated palette of distinct, visually appealing colors
  const palette = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#A855F7", // Violet
    "#84CC16", // Lime
    "#F43F5E", // Rose
    "#6366F1", // Indigo
    "#0EA5E9", // Sky
    "#22C55E", // Emerald
    "#EAB308", // Yellow
  ];

  // Filter out used colors
  const availableColors = palette.filter(color => !usedColors.has(color));
  
  // If all colors are used, generate a random one
  if (availableColors.length === 0) {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Return a random color from available ones
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}
