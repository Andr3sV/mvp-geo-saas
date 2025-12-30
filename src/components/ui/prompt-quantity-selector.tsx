"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PromptQuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presetValues?: number[];
  disabled?: boolean;
  variant?: "wizard" | "onboarding";
}

export function PromptQuantitySelector({
  value,
  onChange,
  min = 10,
  max = 200,
  step = 5,
  presetValues = [10, 25, 50, 100, 200],
  disabled = false,
  variant = "wizard",
}: PromptQuantitySelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate percentage for slider position
  const percentage = ((value - min) / (max - min)) * 100;

  // Handle slider click
  const handleSliderClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.round((percentage / 100) * (max - min) + min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      onChange(clampedValue);
    },
    [min, max, step, onChange, disabled]
  );

  // Handle mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [disabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.round((percentage / 100) * (max - min) + min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      onChange(clampedValue);
    },
    [isDragging, min, max, step, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Check if current value matches a preset
  const isPresetValue = presetValues.includes(value);

  // Get color based on variant
  const primaryColor = variant === "onboarding" ? "#C2C2E1" : undefined;

  return (
    <div className="space-y-6">
      {/* Value Display */}
      <div className="flex items-center justify-center">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={value}
            className="text-5xl font-bold tracking-tight"
            style={{ color: primaryColor || undefined }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.span>
          <span className="text-lg text-muted-foreground font-medium">prompts</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {presetValues.map((presetValue) => {
          const isActive = value === presetValue;
          return (
            <motion.button
              key={presetValue}
              type="button"
              onClick={() => !disabled && onChange(presetValue)}
              disabled={disabled}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
                isActive
                  ? variant === "onboarding"
                    ? "bg-[#C2C2E1] text-white border-[#C2C2E1] shadow-md"
                    : "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background hover:bg-muted border-border text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              whileHover={!disabled && !isActive ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
            >
              {presetValue}
            </motion.button>
          );
        })}
        {!isPresetValue && (
          <motion.button
            type="button"
            onClick={() => !disabled && onChange(value)}
            disabled={disabled}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "border-2 bg-background hover:bg-muted border-border text-foreground",
              variant === "onboarding" && "border-[#C2C2E1] text-[#C2C2E1]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            Custom
          </motion.button>
        )}
      </div>

      {/* Custom Slider */}
      <div className="space-y-3">
        <div
          ref={sliderRef}
          className="relative h-12 flex items-center cursor-pointer group"
          onClick={(e) => {
            // Only handle click if not clicking on thumb
            if ((e.target as HTMLElement).closest('[data-thumb]')) return;
            handleSliderClick(e);
          }}
          onTouchStart={(e) => {
            if (disabled) return;
            const touch = e.touches[0];
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const newValue = Math.round((percentage / 100) * (max - min) + min);
            const steppedValue = Math.round(newValue / step) * step;
            const clampedValue = Math.max(min, Math.min(max, steppedValue));
            onChange(clampedValue);
          }}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Prompt quantity"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            let newValue = value;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              newValue = Math.max(min, value - step);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              newValue = Math.min(max, value + step);
            } else if (e.key === "Home") {
              newValue = min;
            } else if (e.key === "End") {
              newValue = max;
            } else {
              return;
            }
            e.preventDefault();
            onChange(newValue);
          }}
        >
          {/* Track */}
          <div
            className={cn(
              "absolute w-full h-2 rounded-full transition-colors",
              variant === "onboarding"
                ? "bg-[#C2C2E1]/20"
                : "bg-muted"
            )}
          />

          {/* Progress Fill */}
          <motion.div
            className={cn(
              "absolute h-2 rounded-full",
              variant === "onboarding"
                ? "bg-[#C2C2E1]"
                : "bg-primary"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />

          {/* Thumb */}
          <motion.div
            data-thumb
            className={cn(
              "absolute w-8 h-8 rounded-full border-4 border-background shadow-lg",
              "flex items-center justify-center transition-transform",
              variant === "onboarding"
                ? "bg-[#C2C2E1]"
                : "bg-primary",
              disabled 
                ? "opacity-50 cursor-not-allowed" 
                : isDragging 
                  ? "cursor-grabbing scale-110" 
                  : "cursor-grab hover:scale-110"
            )}
            style={{
              left: `calc(${percentage}% - 16px)`,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={(e) => {
              if (disabled) return;
              e.preventDefault();
              setIsDragging(true);
            }}
            animate={{
              scale: isDragging ? 1.15 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                variant === "onboarding" ? "bg-white" : "bg-primary-foreground"
              )}
            />
          </motion.div>
        </div>

        {/* Min/Max Labels */}
        <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

