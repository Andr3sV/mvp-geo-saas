"use client";

import { format } from "date-fns";
import { MessageSquare, Sparkles, Bot, Search, Calendar, Globe, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ResponsePropertiesProps {
  platform: string;
  createdAt: string;
  region?: string | null;
  topicName?: string | null;
  modelVersion?: string;
}

// Platform configuration
const PLATFORM_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: typeof MessageSquare }> = {
  openai: {
    name: "ChatGPT",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: MessageSquare,
  },
  gemini: {
    name: "Gemini",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Sparkles,
  },
  claude: {
    name: "Claude",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    icon: Bot,
  },
  perplexity: {
    name: "Perplexity",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: Search,
  },
};

// Region flags mapping
const REGION_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  ES: "🇪🇸",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IT: "🇮🇹",
  MX: "🇲🇽",
  BR: "🇧🇷",
  CA: "🇨🇦",
  AU: "🇦🇺",
  GLOBAL: "🌍",
};

export function ResponseProperties({
  platform,
  createdAt,
  region,
  topicName,
  modelVersion,
}: ResponsePropertiesProps) {
  const platformConfig = PLATFORM_CONFIG[platform] || {
    name: platform,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: MessageSquare,
  };
  const PlatformIcon = platformConfig.icon;
  const regionFlag = region ? (REGION_FLAGS[region] || "🌍") : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground font-medium">Properties</span>
      
      {/* Platform */}
      <Badge variant="secondary" className={`${platformConfig.bgColor} ${platformConfig.color} gap-1.5`}>
        <PlatformIcon className="h-3.5 w-3.5" />
        {platformConfig.name}
      </Badge>

      {/* Date */}
      <Badge variant="outline" className="gap-1.5">
        <Calendar className="h-3 w-3" />
        {format(new Date(createdAt), "MMM dd, yyyy")}
      </Badge>

      {/* Region */}
      {region && (
        <Badge variant="outline" className="gap-1.5">
          <span>{regionFlag}</span>
          {region}
        </Badge>
      )}

      {/* Topic */}
      {topicName && (
        <Badge variant="outline" className="gap-1.5">
          <Tag className="h-3 w-3" />
          {topicName}
        </Badge>
      )}

      {/* Model version (subtle) */}
      {modelVersion && (
        <span className="text-xs text-muted-foreground">
          {modelVersion}
        </span>
      )}
    </div>
  );
}

