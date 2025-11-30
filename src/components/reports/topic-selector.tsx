"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tag, Hash, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type TopicSelection = string | null; // null = "All", string = topic_id

interface TopicOption {
  id: string | null; // null for "All"
  name: string;
  color?: string;
}

interface TopicSelectorProps {
  topics: TopicOption[];
  selectedTopic: TopicSelection;
  onTopicSelect: (topicId: TopicSelection) => void;
  isLoading?: boolean;
}

export function TopicSelector({
  topics,
  selectedTopic,
  onTopicSelect,
  isLoading = false,
}: TopicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // "All" option should be first
  const allOption: TopicOption = {
    id: null,
    name: "All",
  };

  // Filter topics based on search query
  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Include "All" option only if search is empty or matches "all"
  const shouldShowAll = !searchQuery || "all".includes(searchQuery.toLowerCase());
  const displayTopics = shouldShowAll
    ? [allOption, ...filteredTopics]
    : filteredTopics;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-4xl">
        {/* Search input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Topics grid */}
        {displayTopics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No topics found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {displayTopics.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            const isAllOption = topic.id === null;

            return (
              <Card
                key={topic.id || "all"}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border relative overflow-hidden group",
                  isSelected
                    ? "border-primary shadow-md bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-accent/50",
                  isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                onClick={() => !isLoading && onTopicSelect(topic.id)}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[18px] border-l-transparent border-t-[18px] border-t-primary" />
                )}
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center space-y-4 min-h-[120px] justify-center">
                    <div
                      className={cn(
                        "p-4 rounded-lg transition-all duration-200",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isAllOption
                          ? "bg-muted group-hover:bg-muted/80"
                          : "bg-muted group-hover:bg-muted/80",
                        !isAllOption && topic.color && !isSelected && "border-2"
                      )}
                      style={
                        !isAllOption && topic.color && !isSelected
                          ? { borderColor: topic.color }
                          : undefined
                      }
                    >
                      {isAllOption ? (
                        <Hash className="h-6 w-6" />
                      ) : (
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full",
                            topic.color && !isSelected && "border-2"
                          )}
                          style={
                            topic.color && !isSelected
                              ? { backgroundColor: topic.color, borderColor: topic.color }
                              : topic.color && isSelected
                              ? { backgroundColor: "transparent" }
                              : undefined
                          }
                        >
                          {!topic.color && <Tag className="h-6 w-6" />}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 w-full">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {topic.name}
                      </CardTitle>
                      <CardDescription className="text-xs leading-tight text-muted-foreground">
                        {isAllOption
                          ? "All topics"
                          : `Topic analysis`}
                      </CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Choose a topic to filter your detailed report, or select All for a general report
        </p>
      </div>
    </div>
  );
}

