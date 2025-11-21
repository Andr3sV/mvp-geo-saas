"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";
import { triggerSentimentAnalysis } from "@/lib/queries/sentiment-analysis";
import { toast } from "sonner";

interface SentimentAnalysisTriggerProps {
  projectId: string;
  onAnalysisComplete?: () => void;
  totalResponses?: number;
  analyzedResponses?: number;
}

export function SentimentAnalysisTrigger({ 
  projectId, 
  onAnalysisComplete,
  totalResponses = 0,
  analyzedResponses = 0
}: SentimentAnalysisTriggerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Ensure we don't show negative numbers
  const unanalyzedResponses = Math.max(0, totalResponses - analyzedResponses);
  const analysisPercentage = totalResponses > 0 ? Math.min(100, (analyzedResponses / totalResponses) * 100) : 0;

  const handleStartAnalysis = async (forceReanalysis: boolean = false) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Show loading toast with progress
    const toastId = toast.loading(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="font-medium">Analyzing responses...</span>
        </div>
        <Progress value={0} className="h-1.5" />
        <div className="text-xs text-muted-foreground">0% complete</div>
      </div>,
      {
        duration: Infinity,
      }
    );

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          const newProgress = prev >= 90 ? prev : prev + Math.random() * 10;
          
          // Update toast with progress
          toast.loading(
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="font-medium">Analyzing responses...</span>
              </div>
              <Progress value={newProgress} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                {newProgress.toFixed(0)}% complete
              </div>
            </div>,
            { id: toastId, duration: Infinity }
          );
          
          return newProgress;
        });
      }, 500);

      const result = await triggerSentimentAnalysis(projectId, undefined, forceReanalysis);

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      // Dismiss loading toast
      toast.dismiss(toastId);

      if (result.success) {
        toast.success(
          `✨ Analysis complete! Processed ${result.processedCount || 0} responses.`,
          { duration: 5000 }
        );
        onAnalysisComplete?.();
      } else {
        toast.error(`Analysis failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 2000);
    }
  };

  return (
    <>
      {/* Action Button */}
      {unanalyzedResponses > 0 && (
        <Button
          onClick={() => handleStartAnalysis(false)}
          disabled={isAnalyzing}
          size="lg"
        >
          Update Analysis
        </Button>
      )}
    </>
  );
}
