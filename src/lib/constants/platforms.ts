// Platform display configuration
export const PLATFORMS = {
  openai: {
    id: "openai",
    name: "OpenAI",
    color: "#10b981", // emerald
    bgColor: "bg-emerald-500",
    textColor: "text-emerald-600",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    color: "#3b82f6", // blue
    bgColor: "bg-blue-500",
    textColor: "text-blue-600",
  },
} as const;

export type PlatformId = keyof typeof PLATFORMS;
