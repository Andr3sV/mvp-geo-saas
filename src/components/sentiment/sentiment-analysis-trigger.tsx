"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Brain, Play, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
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

    try {
      // Simulate progress updates (in real implementation, you might use WebSocket or polling)
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const result = await triggerSentimentAnalysis(projectId, undefined, forceReanalysis);

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (result.success) {
        toast.success(
          `Sentiment analysis completed! Processed ${result.processedCount || 0} responses.`
        );
        onAnalysisComplete?.();
      } else {
        toast.error(`Analysis failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Analysis Progress (only when analyzing) */}
      {isAnalyzing && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Analyzing responses...</span>
          </div>
          <Progress value={analysisProgress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {analysisProgress.toFixed(0)}% complete
          </div>
        </div>
      )}

      {/* Action Button */}
      {unanalyzedResponses > 0 && (
        <Button
          onClick={() => handleStartAnalysis(false)}
          disabled={isAnalyzing}
          size="lg"
        >
          Analyze New Responses
          {unanalyzedResponses > 0 && (
            <Badge variant="secondary" className="ml-2 bg-white/20">
              {unanalyzedResponses}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}
