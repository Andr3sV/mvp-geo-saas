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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Sentiment Analysis
        </CardTitle>
        <CardDescription>
          Analyze AI responses to extract sentiment insights for your brand and competitors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Analysis Coverage</span>
            <Badge variant={analysisPercentage === 100 ? "default" : "secondary"}>
              {analysisPercentage.toFixed(0)}% Complete
            </Badge>
          </div>
          
          <Progress value={analysisPercentage} className="h-2" />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{analyzedResponses} analyzed</span>
            <span>{totalResponses} total responses</span>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Analyzed</span>
            </div>
            <div className="text-2xl font-bold">{analyzedResponses}</div>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">{unanalyzedResponses}</div>
          </div>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Analyzing responses...</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Processing with Gemini 2.0 Flash • {analysisProgress.toFixed(0)}% complete
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {unanalyzedResponses > 0 && (
            <Button
              onClick={() => handleStartAnalysis(false)}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Analyze New Responses
              {unanalyzedResponses > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unanalyzedResponses}
                </Badge>
              )}
            </Button>
          )}

          {analyzedResponses > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isAnalyzing}
                  className={unanalyzedResponses === 0 ? "flex-1" : ""}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-analyze All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Re-analyze All Responses?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will re-process all {totalResponses} AI responses, including those already analyzed. 
                    This may take several minutes and will overwrite existing sentiment data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStartAnalysis(true)}>
                    Re-analyze All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <div className="font-medium mb-1">How it works:</div>
          <ul className="space-y-1">
            <li>• AI analyzes each response for brand and competitor mentions</li>
            <li>• Extracts positive, neutral, and negative attributes</li>
            <li>• Provides confidence scores and detailed reasoning</li>
            <li>• Uses Gemini 2.0 Flash for fast, cost-effective analysis</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
