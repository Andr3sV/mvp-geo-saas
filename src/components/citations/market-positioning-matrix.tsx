"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useState } from "react";

interface MarketPositioningData {
  brandId: string;
  brandName: string;
  brandDomain?: string;
  brandColor?: string;
  isBrand: boolean;
  shareOfMentions: number; // X-axis: Share of Voice (Market Share)
  growthVelocity: number; // Y-axis: Growth Velocity (percentage change)
  sentimentScore: number; // For sentiment pulse indicator
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface MarketPositioningMatrixProps {
  data: MarketPositioningData[];
  isLoading?: boolean;
}

export function MarketPositioningMatrix({ data, isLoading }: MarketPositioningMatrixProps) {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  if (isLoading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Positioning Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-96 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic ranges with margins
  const shares = data.map(d => d.shareOfMentions);
  const velocities = data.map(d => d.growthVelocity);
  
  const shareMin = Math.min(...shares);
  const shareMax = Math.max(...shares);
  const velocityMin = Math.min(...velocities);
  const velocityMax = Math.max(...velocities);
  
  // Add margins: 25% left, 40% right for share; 25% below, 25% above for velocity
  const shareRange = shareMax - shareMin;
  const shareMinWithMargin = Math.max(0, shareMin - shareRange * 0.25);
  const shareMaxWithMargin = shareMax + shareRange * 0.4;
  
  const velocityRange = velocityMax - velocityMin;
  const velocityMinWithMargin = velocityMin - Math.abs(velocityRange * 0.25);
  const velocityMaxWithMargin = velocityMax + Math.abs(velocityRange * 0.30);
  
  const shareRangeWithMargin = shareMaxWithMargin - shareMinWithMargin;
  const velocityRangeWithMargin = velocityMaxWithMargin - velocityMinWithMargin;

  // Helper to convert data to percentage position for left (X-axis)
  // X-axis: with margins (25% left, 40% right)
  const getLeft = (share: number) => {
    const clampedShare = Math.max(shareMinWithMargin, Math.min(shareMaxWithMargin, share));
    return ((clampedShare - shareMinWithMargin) / shareRangeWithMargin) * 100;
  };

  // Helper to convert data to percentage position for bottom (Y-axis)
  // Y-axis: with margins (25% below, 25% above)
  // High velocity = top (high bottom %), low velocity = bottom (low bottom %)
  const getBottom = (velocity: number) => {
    const clampedVelocity = Math.max(velocityMinWithMargin, Math.min(velocityMaxWithMargin, velocity));
    // Map velocity to bottom position: velocity min = 0% (bottom), velocity max = 100% (top)
    const normalizedVelocity = (clampedVelocity - velocityMinWithMargin) / velocityRangeWithMargin;
    return normalizedVelocity * 100;
  };

  // Find brand data (always show brand even if < 2%)
  const brandData = data.find(d => d.isBrand);
  // Filter competitors: only show those with share > 2%
  const competitors = data.filter(d => !d.isBrand && d.shareOfMentions > 2);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'rgb(34, 197, 94)'; // green-500
      case 'negative':
        return 'rgb(239, 68, 68)'; // red-500
      default:
        return 'rgb(226, 232, 240)'; // slate-200 (gray for neutral)
    }
  };

  const getSentimentTextColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '#15803D'; // green-700
      case 'negative':
        return '#B91C1C'; // red-700
      default:
        return '#475569'; // slate-600
    }
  };

  // Determine competitor size based on share of mentions
  const getCompetitorSize = (share: number) => {
    if (share > 10) return 'w-12 h-12';
    if (share > 5) return 'w-10 h-10';
    if (share > 2) return 'w-8 h-8';
    return 'w-6 h-6';
  };

  const getCompetitorTextSize = (share: number) => {
    if (share > 10) return 'text-xs';
    if (share > 5) return 'text-[10px]';
    return 'text-[9px]';
  };

  return (
    <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden py-1">
      <div className="flex bg-slate-50/30 border-slate-100 border-b py-3 pr-4 pl-4 items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Market Positioning Matrix</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-200"></span>
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>Negative</span>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <div 
          className="relative w-full h-[400px] bg-white p-0"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)'
          }}
        >
          {/* Y-axis label (Growth Velocity) - Left side, rotated */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-slate-400 uppercase tracking-widest origin-left">
            Growth Velocity
          </div>

          {/* X-axis label (Share of Voice) - Bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Share of Voice (Market Share)
          </div>

          {/* Quadrant Lines */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-slate-300"></div>
          <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-slate-300"></div>

          {/* Quadrant Labels */}
          <div className="absolute top-2 right-2 text-right">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide opacity-30">Leaders</div>
          </div>
          <div className="absolute top-2 left-2 text-left">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide opacity-30">Challengers</div>
          </div>
          <div className="absolute bottom-2 left-2 text-left">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide opacity-30">Niche</div>
          </div>
          <div className="absolute bottom-2 right-2 text-right">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide opacity-30">Established</div>
          </div>

          {/* Competitors - All competitors with logos */}
          {competitors.map((competitor) => {
            const left = getLeft(competitor.shareOfMentions);
            const bottom = getBottom(competitor.growthVelocity);
            const letter = competitor.brandName.charAt(0).toUpperCase();
            const size = getCompetitorSize(competitor.shareOfMentions);
            const textSize = getCompetitorTextSize(competitor.shareOfMentions);
            const sentimentColor = getSentimentColor(competitor.sentiment);
            const textColor = getSentimentTextColor(competitor.sentiment);
            const isHovered = hoveredEntity === competitor.brandId;

            // Determine if it's a small dot (neutral and small share) or circle with logo
            const isSmallDot = (!competitor.sentiment || competitor.sentiment === 'neutral') && competitor.shareOfMentions < 2;

            return (
              <div
                key={competitor.brandId}
                className="absolute cursor-pointer transition-all hover:scale-110 hover:z-50"
                style={{ left: `${left}%`, bottom: `${bottom}%` }}
                onMouseEnter={() => setHoveredEntity(competitor.brandId)}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <div className="relative">
                  {isSmallDot ? (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 shadow-sm flex items-center justify-center">
                      <span className="block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    </div>
                  ) : (
                    <>
                      {/* Sentiment Pulse Indicator - small circle in top-right corner */}
                      <div 
                        className="absolute top-0 right-0 w-3 h-3 border-2 border-white rounded-full shadow-sm z-20"
                        style={{ backgroundColor: getSentimentColor(competitor.sentiment || 'neutral') }}
                      ></div>
                      <div 
                        className={`${size} rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center ${textSize} font-bold overflow-hidden p-1.5`}
                        style={{ color: textColor }}
                      >
                        {competitor.brandDomain ? (
                          <BrandLogo 
                            domain={competitor.brandDomain}
                            name={competitor.brandName}
                            size={parseInt(size.replace('w-', '').replace('h-', '')) * 2.5}
                            className=""
                          />
                        ) : (
                          letter
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Tooltip - Always visible on hover */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg py-2 px-3 pointer-events-none z-50 shadow-lg">
                      <div className="font-semibold text-slate-900 mb-1">{competitor.brandName}</div>
                      <div className="flex justify-between mb-0.5">
                        <span>Share:</span>
                        <span className="font-medium">{competitor.shareOfMentions.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between mb-0.5">
                        <span>Growth:</span>
                        <span className={`font-medium ${competitor.growthVelocity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {competitor.growthVelocity >= 0 ? '+' : ''}{competitor.growthVelocity.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Sentiment:</span>
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getSentimentColor(competitor.sentiment || 'neutral') }}
                          ></span>
                          <span className="font-medium capitalize">{competitor.sentiment || 'neutral'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Brand (Star) - larger with thick black circle, pulse effect, and sentiment pulse indicator */}
          {brandData && (
            <div
              className="absolute cursor-pointer transition-all hover:scale-110 hover:z-50"
              style={{ left: `${getLeft(brandData.shareOfMentions)}%`, bottom: `${getBottom(brandData.growthVelocity)}%` }}
              onMouseEnter={() => setHoveredEntity(brandData.brandId)}
              onMouseLeave={() => setHoveredEntity(null)}
            >
              <div className="relative">
                {/* Sentiment Pulse Indicator - small circle in top-right corner */}
                <div 
                  className="absolute top-0 right-0 w-4 h-4 border-2 border-white rounded-full shadow-sm z-20"
                  style={{ backgroundColor: getSentimentColor(brandData.sentiment || 'neutral') }}
                ></div>
                
                <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-900 shadow-xl flex items-center justify-center overflow-hidden z-10 relative p-2.5">
                  {brandData.brandDomain ? (
                    <BrandLogo 
                      domain={brandData.brandDomain}
                      name={brandData.brandName}
                      size={44}
                      className=""
                    />
                  ) : (
                    <Star 
                      className="w-6 h-6"
                      style={{ color: getSentimentColor(brandData.sentiment) }}
                      fill="currentColor"
                      strokeWidth={2}
                    />
                  )}
                </div>
                {/* Pulse Effect */}
                <div 
                  className="absolute -inset-1 rounded-full animate-pulse z-0"
                  style={{ backgroundColor: `${getSentimentColor(brandData.sentiment)}33` }}
                ></div>
                
                {/* Tooltip - Always visible on hover */}
                {hoveredEntity === brandData.brandId && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-900 text-white text-xs rounded-lg py-2 px-3 pointer-events-none z-50 shadow-xl">
                    <div className="font-semibold mb-1">{brandData.brandName}</div>
                    <div className="flex justify-between text-slate-300 mb-0.5">
                      <span>Share:</span>
                      <span className="text-white">{brandData.shareOfMentions.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-300 mb-0.5">
                      <span>Growth:</span>
                      <span className="text-emerald-400">
                        {brandData.growthVelocity >= 0 ? '+' : ''}{brandData.growthVelocity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 items-center">
                      <span>Sentiment:</span>
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getSentimentColor(brandData.sentiment || 'neutral') }}
                        ></span>
                        <span className="text-white capitalize">{brandData.sentiment || 'neutral'}</span>
                      </div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-b-slate-900"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
