"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { checkPromptsProcessed, getBrandRankingFromDirectQueries } from "@/lib/actions/results";
import { containerVariants, itemVariants } from "../variants";
import { cn } from "@/lib/utils";

interface ResultsStepProps {
  projectId: string;
  projectName: string;
  onContinue: () => void;
}

export function ResultsStep({
  projectId,
  projectName,
  onContinue,
}: ResultsStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing analysis...");
  const [rankingData, setRankingData] = useState<{
    brand: {
      name: string;
      percentage: number;
      mentions: number;
      rank: number;
    };
    competitors: Array<{
      id: string;
      name: string;
      percentage: number;
      mentions: number;
      rank: number;
    }>;
    totalMentions: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 240; // 20 minutes max (5 second intervals)
    const allPromptsProcessedRef = { current: false };

    const poll = async () => {
      attempts++;
      
      try {
        const result = await checkPromptsProcessed(projectId);
        
        // Update progress based on processed prompts
        if (result.totalPrompts > 0) {
          const progressPercent = Math.min(90, (result.processedPrompts / result.totalPrompts) * 90);
          setLoadingProgress(progressPercent);
        }

        if (result.allProcessed && !allPromptsProcessedRef.current) {
          allPromptsProcessedRef.current = true;
          
          // Clear progress interval
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          
          // Set progress to 95%
          setLoadingProgress(95);
          setStatusMessage("All prompts processed. Finalizing results...");
          
          // Wait 15 seconds
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // Set progress to 98%
          setLoadingProgress(98);
          setStatusMessage("Calculating ranking...");
          
          // Fetch ranking data
          const rankingResult = await getBrandRankingFromDirectQueries(projectId);
          
          if (rankingResult.error || !rankingResult.data) {
            setError(rankingResult.error || "Failed to load ranking data");
            setIsLoading(false);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            return;
          }

          // Set progress to 100%
          setLoadingProgress(100);
          setRankingData(rankingResult.data);
          setIsLoading(false);
          
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          return;
        } else if (!result.allProcessed) {
          // Update status message with progress
          if (result.totalPrompts === 0) {
            setStatusMessage("Waiting for prompts to be processed...");
          } else {
            setStatusMessage(
              `Processing prompts... (${result.processedPrompts}/${result.totalPrompts} completed)`
            );
          }
        }
      } catch (err: any) {
        console.error("Error polling for results:", err);
        if (attempts >= maxAttempts) {
          setError("Timeout waiting for results. Please check back later.");
          setIsLoading(false);
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          return;
        }
      }

      if (attempts < maxAttempts && !allPromptsProcessedRef.current) {
        pollInterval = setTimeout(poll, 5000); // Poll every 5 seconds
      } else if (attempts >= maxAttempts) {
        setError("Timeout waiting for results. The analysis may still be in progress.");
        setIsLoading(false);
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      }
    };

    // Simulate progress animation (0-90% based on actual progress)
    progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        // Only animate if we're below 90% and don't have all prompts processed
        if (prev < 90 && !allPromptsProcessedRef.current) {
          return Math.min(90, prev + 0.5); // Slowly increment
        }
        return prev;
      });
    }, 1000);

    // Start polling after a short delay
    const initialDelay = setTimeout(() => {
      poll();
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(initialDelay);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [projectId]);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex items-center gap-3"
        variants={itemVariants}
      >
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Trophy className="h-5 w-5 text-[#C2C2E1]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Brand Ranking</h2>
          <p className="text-sm text-muted-foreground mt-1">
            See how your brand performs against competitors
          </p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Creative Loading Animation */}
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {/* Pulsing Gradient Circles */}
              <div className="relative w-32 h-32">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C2C2E1]/20 via-[#C2C2E1]/10 to-transparent"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full bg-gradient-to-br from-[#C2C2E1]/30 via-[#C2C2E1]/20 to-transparent"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 0.9, 0.6],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3,
                  }}
                />
                <motion.div
                  className="absolute inset-8 rounded-full bg-[#C2C2E1]/40 flex items-center justify-center"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Loader2 className="h-8 w-8 text-[#C2C2E1]" />
                </motion.div>
              </div>

              {/* Animated Percentage Counter */}
              <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="text-5xl font-bold text-[#C2C2E1]"
                  key={Math.floor(loadingProgress)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {Math.floor(loadingProgress)}%
                </motion.div>
                <p className="text-sm text-muted-foreground font-medium">
                  {statusMessage}
                </p>
              </motion.div>

              {/* Animated Progress Bar */}
              <div className="w-full max-w-md space-y-2">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#C2C2E1] to-[#C2C2E1]/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing...</span>
                  <span>{Math.floor(loadingProgress)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </motion.div>
        ) : rankingData ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Stats */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-bold tracking-tight">
                  {projectName || rankingData.brand.name} has{" "}
                  <span className="text-[#C2C2E1]">{rankingData.brand.percentage.toFixed(1)}%</span> visibility
                </h3>
                <motion.div
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C2C2E1] text-white text-sm font-semibold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  #{rankingData.brand.rank}
                </motion.div>
              </div>
              <p className="text-sm text-muted-foreground">
                across AI platforms and ranks <span className="font-medium text-foreground">#{rankingData.brand.rank}</span> among competitors
              </p>
            </motion.div>

            {/* Competitor Ranking */}
            {rankingData.competitors.length > 0 && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Industry Ranking
                </h3>
                <div className="space-y-1.5">
                  {/* Your Brand - Rank 1 */}
                  <motion.div
                    className="group relative overflow-hidden rounded-lg border border-[#C2C2E1]/30 bg-[#C2C2E1]/5 px-4 py-3 transition-all hover:border-[#C2C2E1]/50 hover:bg-[#C2C2E1]/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {rankingData.brand.rank}
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C2C2E1]/20 border border-[#C2C2E1]/30">
                          <span className="text-xs font-semibold text-[#C2C2E1]">
                            {(projectName || rankingData.brand.name).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{projectName || rankingData.brand.name}</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-[#C2C2E1]/20 text-[#C2C2E1] border-[#C2C2E1]/30">
                            Your brand
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-[#C2C2E1]">
                          {rankingData.brand.percentage.toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-20 rounded-full bg-[#C2C2E1]/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-[#C2C2E1] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${rankingData.brand.percentage}%` }}
                            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Competitors */}
                  {rankingData.competitors.map((competitor, index) => (
                    <motion.div
                      key={competitor.id}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card/30 px-4 py-3 transition-all hover:border-[#C2C2E1]/30 hover:bg-card/50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {competitor.rank}
                          </span>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 border border-border">
                            <span className="text-xs font-medium text-muted-foreground">
                              {competitor.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-sm">{competitor.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-muted-foreground">
                            {competitor.percentage.toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full bg-muted-foreground/30 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${competitor.percentage}%` }}
                              transition={{ delay: 0.6 + index * 0.05, duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

