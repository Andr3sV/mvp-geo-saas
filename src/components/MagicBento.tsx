import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
  icon?: React.FC<{ className?: string }>;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '194, 194, 225'; // #C2C2E1
const MOBILE_BREAKPOINT = 768;

// SVG Icons for each card
const CitationTrackingIcon = ({ className }: { className?: string }) => {
  // Create a more complex network with animated connections
  const nodes = [
    { x: 20, y: 40, r: 5, delay: 0 },
    { x: 60, y: 25, r: 4, delay: 0.2 },
    { x: 100, y: 35, r: 5, delay: 0.4 },
    { x: 140, y: 25, r: 4, delay: 0.6 },
    { x: 180, y: 40, r: 5, delay: 0.8 },
    { x: 30, y: 80, r: 6, delay: 0.1 },
    { x: 70, y: 70, r: 7, delay: 0.3 },
    { x: 110, y: 75, r: 6, delay: 0.5 },
    { x: 150, y: 70, r: 7, delay: 0.7 },
    { x: 190, y: 80, r: 6, delay: 0.9 },
    { x: 40, y: 120, r: 5, delay: 0.2 },
    { x: 80, y: 115, r: 6, delay: 0.4 },
    { x: 120, y: 120, r: 5, delay: 0.6 },
    { x: 160, y: 115, r: 6, delay: 0.8 },
    { x: 20, y: 160, r: 5, delay: 0.3 },
    { x: 60, y: 165, r: 4, delay: 0.5 },
    { x: 100, y: 160, r: 5, delay: 0.7 },
    { x: 140, y: 165, r: 4, delay: 0.9 },
    { x: 180, y: 160, r: 5, delay: 1.1 },
  ];
  
  const connections = [
    { from: 0, to: 5 }, { from: 1, to: 6 }, { from: 2, to: 7 }, { from: 3, to: 8 }, { from: 4, to: 9 },
    { from: 5, to: 6 }, { from: 6, to: 7 }, { from: 7, to: 8 }, { from: 8, to: 9 },
    { from: 5, to: 10 }, { from: 6, to: 11 }, { from: 7, to: 12 }, { from: 8, to: 13 },
    { from: 10, to: 11 }, { from: 11, to: 12 }, { from: 12, to: 13 },
    { from: 10, to: 14 }, { from: 11, to: 15 }, { from: 12, to: 16 }, { from: 13, to: 17 },
    { from: 14, to: 15 }, { from: 15, to: 16 }, { from: 16, to: 17 }, { from: 17, to: 18 },
  ];
  
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <filter id="glow-track">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Animated connection lines */}
      {connections.map((conn, idx) => {
        const fromNode = nodes[conn.from];
        const toNode = nodes[conn.to];
        return (
          <line
            key={`line-${idx}`}
            x1={fromNode.x}
            y1={fromNode.y}
            x2={toNode.x}
            y2={toNode.y}
            stroke="rgba(194, 194, 225, 0.25)"
            strokeWidth="1.5"
            className="icon-line icon-line-animated"
            style={{
              animationDelay: `${idx * 0.15}s`
            }}
          />
        );
      })}
      
      {/* Nodes with pulse animation */}
      {nodes.map((node, idx) => (
        <g key={`node-${idx}`}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r + 3}
            fill="rgba(194, 194, 225, 0.08)"
            className="icon-node-pulse"
            style={{
              animation: 'none'
            }}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill="rgba(194, 194, 225, 0.6)"
            className="icon-node"
            filter="url(#glow-track)"
            style={{
              animation: 'none'
            }}
          />
        </g>
      ))}
    </svg>
  );
};

const SentimentAnalysisIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Bar chart representing sentiment - wider bars */}
    <rect x="25" y="130" width="25" height="50" fill="rgba(194, 194, 225, 0.5)" className="icon-bar" rx="4" />
    <rect x="60" y="90" width="25" height="90" fill="rgba(194, 194, 225, 0.6)" className="icon-bar" rx="4" />
    <rect x="95" y="110" width="25" height="70" fill="rgba(194, 194, 225, 0.7)" className="icon-bar" rx="4" />
    <rect x="130" y="70" width="25" height="110" fill="rgba(194, 194, 225, 0.8)" className="icon-bar" rx="4" />
    {/* Trend line */}
    <path
      d="M 37.5 155 Q 72.5 115, 107.5 125 T 142.5 115"
      stroke="rgba(194, 194, 225, 0.8)"
      strokeWidth="3"
      fill="none"
      className="icon-line"
    />
  </svg>
);

const ShareOfVoiceIcon = ({ className }: { className?: string }) => {
  // Horizontal bar chart representing share of voice for different competitors
  // Thicker bars to fill the space
  const barHeight = 28;
  const barSpacing = 32;
  const startY = 45;
  
  const bars = [
    { width: 120, delay: 0 },
    { width: 180, delay: 0.1 },
    { width: 90, delay: 0.2 },
    { width: 110, delay: 0.3 },
    { width: 130, delay: 0.4 },
  ];
  
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(194, 194, 225, 0.4)" />
          <stop offset="50%" stopColor="rgba(194, 194, 225, 0.7)" />
          <stop offset="100%" stopColor="rgba(194, 194, 225, 0.4)" />
        </linearGradient>
        <filter id="barGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background bars (static) */}
      {bars.map((bar, idx) => {
        const y = startY + idx * barSpacing;
        return (
          <rect
            key={`bg-${idx}`}
            x="10"
            y={y - barHeight / 2}
            width="180"
            height={barHeight}
            rx="8"
            fill="rgba(194, 194, 225, 0.05)"
            className="icon-bar-bg"
          />
        );
      })}
      
      {/* Bars with visible borders (default state) */}
      {bars.map((bar, idx) => {
        const y = startY + idx * barSpacing;
        return (
          <g key={`bar-${idx}`}>
            {/* Border bar (always visible) */}
            <rect
              x="10"
              y={y - barHeight / 2}
              width={bar.width}
              height={barHeight}
              rx="8"
              fill="transparent"
              stroke="rgba(194, 194, 225, 0.5)"
              strokeWidth="2"
              className="icon-bar-voice"
              style={{
                animationDelay: `${bar.delay}s`
              }}
            />
            {/* Filled bar that appears on hover */}
            <rect
              x="10"
              y={y - barHeight / 2}
              width={bar.width}
              height={barHeight}
              rx="8"
              fill="url(#barGradient)"
              className="icon-bar-voice-fill"
              filter="url(#barGlow)"
              style={{
                animationDelay: `${bar.delay}s`
              }}
            />
            {/* Small indicator dot */}
            <circle
              cx={10 + bar.width}
              cy={y}
              r="4"
              fill="rgba(194, 194, 225, 0.8)"
              className="icon-bar-dot"
              style={{
                animationDelay: `${bar.delay + 0.1}s`
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

const PlatformBreakdownIcon = ({ className }: { className?: string }) => {
  // Generate 2 rows x 3 columns = 6 rectangles
  const rows = 2;
  const cols = 3;
  const totalWidth = 200; // Full viewBox width
  const spacing = 5;
  const rectWidth = (totalWidth - (spacing * (cols - 1))) / cols; // Calculate width to fill space
  const rectHeight = 55;
  const startX = 0;
  const startY = 60;
  
  const rectangles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (rectWidth + spacing);
      const y = startY + row * (rectHeight + spacing);
      rectangles.push(
        <rect
          key={`${row}-${col}`}
          x={x}
          y={y}
          width={rectWidth}
          height={rectHeight}
          rx="6"
          fill="rgba(194, 194, 225, 0.3)"
          className="icon-platform-square"
          data-index={row * cols + col}
        />
      );
    }
  }
  
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%' }}
    >
      {rectangles}
    </svg>
  );
};

const QueryPatternsIcon = ({ className }: { className?: string }) => {
  // Multiple intersecting trend lines representing query patterns
  const patterns = [
    { 
      path: "M 10 160 L 40 140 L 70 100 L 100 80 L 130 60 L 160 50 L 190 45",
      delay: 0,
      color: "rgba(194, 194, 225, 0.4)"
    },
    { 
      path: "M 10 50 L 40 70 L 70 90 L 100 110 L 130 120 L 160 130 L 190 135",
      delay: 0.2,
      color: "rgba(194, 194, 225, 0.35)"
    },
    { 
      path: "M 10 100 L 50 85 L 90 75 L 130 90 L 170 105 L 190 110",
      delay: 0.4,
      color: "rgba(194, 194, 225, 0.3)"
    },
    { 
      path: "M 10 120 L 35 100 L 60 80 L 85 100 L 110 120 L 135 100 L 160 80 L 185 70",
      delay: 0.6,
      color: "rgba(194, 194, 225, 0.4)"
    },
  ];
  
  const dataPoints = [
    { x: 40, y: 140 },
    { x: 70, y: 100 },
    { x: 100, y: 80 },
    { x: 130, y: 60 },
    { x: 160, y: 50 },
    { x: 50, y: 70 },
    { x: 90, y: 75 },
    { x: 130, y: 90 },
    { x: 170, y: 105 },
    { x: 35, y: 100 },
    { x: 85, y: 100 },
    { x: 135, y: 100 },
  ];
  
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="patternGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(194, 194, 225, 0.3)" />
          <stop offset="50%" stopColor="rgba(194, 194, 225, 0.6)" />
          <stop offset="100%" stopColor="rgba(194, 194, 225, 0.3)" />
        </linearGradient>
        <filter id="patternGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Pattern lines - static by default */}
      {patterns.map((pattern, idx) => (
        <path
          key={`pattern-${idx}`}
          d={pattern.path}
          stroke={pattern.color}
          strokeWidth="2"
          fill="none"
          className="icon-pattern-line"
          style={{
            animationDelay: `${pattern.delay}s`
          }}
        />
      ))}
      
      {/* Animated pattern lines that appear on hover */}
      {patterns.map((pattern, idx) => (
        <path
          key={`pattern-animated-${idx}`}
          d={pattern.path}
          stroke="url(#patternGradient)"
          strokeWidth="2.5"
          fill="none"
          className="icon-pattern-line-animated"
          filter="url(#patternGlow)"
          style={{
            animationDelay: `${pattern.delay}s`
          }}
        />
      ))}
      
      {/* Data points */}
      {dataPoints.map((point, idx) => (
        <circle
          key={`point-${idx}`}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="rgba(194, 194, 225, 0.5)"
          className="icon-pattern-point"
          style={{
            animationDelay: `${idx * 0.1}s`
          }}
        />
      ))}
    </svg>
  );
};

const TrendingQueriesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Ascending trend line - more pronounced */}
    <path
      d="M 25 155 L 55 125 L 85 105 L 115 75 L 145 55 L 165 45"
      stroke="rgba(194, 194, 225, 0.8)"
      strokeWidth="4"
      fill="none"
      className="icon-trend"
    />
    {/* Arrow pointing up */}
    <path
      d="M 155 55 L 165 45 L 175 55"
      stroke="rgba(194, 194, 225, 0.8)"
      strokeWidth="4"
      fill="none"
      className="icon-arrow"
    />
    {/* Data points - fewer, more spaced */}
    <circle cx="25" cy="155" r="4" fill="rgba(194, 194, 225, 0.8)" className="icon-node" />
    <circle cx="85" cy="105" r="4" fill="rgba(194, 194, 225, 0.8)" className="icon-node" />
    <circle cx="145" cy="55" r="4" fill="rgba(194, 194, 225, 0.8)" className="icon-node" />
    <circle cx="165" cy="45" r="5" fill="rgba(194, 194, 225, 1)" className="icon-node icon-center" />
  </svg>
);

const cardData: BentoCardProps[] = [
  {
    color: 'transparent',
    title: 'Citation Tracking',
    description: 'Monitor brand mentions across AI platforms',
    label: 'Tracking',
    icon: CitationTrackingIcon
  },
  {
    color: 'transparent',
    title: 'Sentiment Analysis',
    description: 'Understand how AI perceives your brand',
    label: 'Insights',
    icon: SentimentAnalysisIcon
  },
  {
    color: 'transparent',
    title: 'Share of Voice',
    description: 'Compare your mentions against competitors',
    label: 'Competition',
    icon: ShareOfVoiceIcon
  },
  {
    color: 'transparent',
    title: 'Platform Breakdown',
    description: 'Track performance across ChatGPT, Gemini, Claude',
    label: 'Analytics',
    icon: PlatformBreakdownIcon
  },
  {
    color: 'transparent',
    title: 'Query Patterns',
    description: 'Discover what prompts mention your brand',
    label: 'Patterns',
    icon: QueryPatternsIcon
  },
  {
    color: 'transparent',
    title: 'Trending Queries',
    description: 'Identify emerging search trends',
    label: 'Trends',
    icon: TrendingQueriesIcon
  }
];

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest('.bento-section');
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll('.card');

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        cards.forEach(card => {
          (card as HTMLElement).style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll('.card').forEach(card => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="bento-section grid gap-2 p-3 max-w-[90rem] w-full select-none relative"
    style={{ fontSize: 'clamp(1rem, 0.9rem + 0.5vw, 1.5rem)' }}
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const MagicBento: React.FC<BentoProps> = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  return (
    <>
      <style>
        {`
          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: rgba(194, 194, 225, 0.3);
            --background-dark: rgba(194, 194, 225, 0.1);
            --white: hsl(var(--foreground));
            --purple-primary: rgba(194, 194, 225, 1);
            --purple-glow: rgba(194, 194, 225, 0.2);
            --purple-border: rgba(194, 194, 225, 0.5);
          }
          
          .card-responsive {
            grid-template-columns: 1fr;
            width: 100%;
            margin: 0 auto;
            padding: 0.5rem;
          }
          
          @media (min-width: 600px) {
            .card-responsive {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          
          @media (min-width: 1024px) {
            .card-responsive {
              grid-template-columns: repeat(4, 1fr);
            }
            
            .card-responsive .card:nth-child(3) {
              grid-column: span 2;
              grid-row: span 2;
            }
            
            .card-responsive .card:nth-child(4) {
              grid-column: 1 / span 2;
              grid-row: 2 / span 2;
            }
            
            .card-responsive .card:nth-child(6) {
              grid-column: 4;
              grid-row: 3;
            }
          }
          
          .card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 6px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
                transparent 60%);
            border-radius: inherit;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: subtract;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1;
          }
          
          .card--border-glow:hover::after {
            opacity: 1;
          }
          
          .card--border-glow:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.4), 0 0 30px rgba(${glowColor}, 0.2);
          }
          
          .card-icon {
            position: absolute;
            opacity: 0.4;
            transition: all 0.3s ease;
            pointer-events: none;
            z-index: 0;
          }
          
          .card-icon-3 {
            pointer-events: auto;
          }
          
          /* Individual card icon positioning and sizing */
          .card-icon-0 {
            width: calc(100% - 3rem);
            max-width: 100%;
            height: calc(100% - 1.5rem - 1.5rem - 1.5rem - 1.5rem - 3rem);
            top: calc(1.5rem + 1.5rem);
            left: 1.5rem;
            transform: none;
          }
          
          .card-icon-1 {
            width: 140px;
            height: 100px;
            top: calc(1.5rem + 1.5rem);
            left: 50%;
            transform: translateX(-50%);
          }
          
          .card-icon-2 {
            width: calc(100% - 3rem);
            max-width: 100%;
            height: calc(100% - 1.5rem - 1.5rem - 1.5rem - 1.5rem - 3rem);
            top: calc(1.5rem + 1.5rem);
            left: 1.5rem;
            transform: none;
          }
          
          .card-icon-2 .icon-segment,
          .card-icon-2 .icon-center {
            display: none;
          }
          
          .icon-bar-voice {
            transform-origin: left center;
            transition: stroke 0.3s ease, stroke-width 0.3s ease;
          }
          
          .icon-bar-voice-fill {
            transform-origin: left center;
            transform: scaleX(0);
            opacity: 0;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          }
          
          .icon-bar-dot {
            opacity: 0;
            transform: scale(0);
            transition: opacity 0.3s ease, transform 0.3s ease;
          }
          
          .card:hover .icon-bar-voice {
            stroke: rgba(194, 194, 225, 0.7);
            stroke-width: 2.5;
          }
          
          .card:hover .icon-bar-voice-fill {
            transform: scaleX(1);
            opacity: 1;
          }
          
          .card:hover .icon-bar-dot {
            opacity: 1;
            transform: scale(1);
            animation: dotPulse 1.5s ease-in-out infinite;
          }
          
          @keyframes barGlow {
            0%, 100% {
              filter: brightness(1);
            }
            50% {
              filter: brightness(1.3);
            }
          }
          
          @keyframes dotPulse {
            0%, 100% {
              r: 4;
              opacity: 0.8;
            }
            50% {
              r: 5;
              opacity: 1;
            }
          }
          
          .card:hover .card-icon-2 {
            transform: none !important;
            scale: 1 !important;
          }
          
          .card-icon-2 svg {
            transform: none !important;
          }
          
          .card:hover .card-icon-2 svg {
            transform: none !important;
          }
          
          .card-icon-3 {
            width: calc(100% - 3rem);
            max-width: 100%;
            height: 250px;
            top: calc(1rem + 1.5rem);
            left: 1.5rem;
            transform: none;
          }
          
          .card-icon-4 {
            width: calc(100% - 3rem);
            max-width: 100%;
            height: calc(100% - 1.5rem - 1.5rem - 1.5rem - 1.5rem - 3rem);
            top: calc(1.5rem + 1.5rem);
            left: 1.5rem;
            transform: none;
          }
          
          .card-icon-5 {
            width: 140px;
            height: 90px;
            top: calc(1.5rem + 1.75rem);
          }
          
          .card:hover .card-icon {
            opacity: 0.7;
          }
          
          .card:hover .card-icon:not(.card-icon-3):not(.card-icon-0):not(.card-icon-1):not(.card-icon-2):not(.card-icon-4) {
            transform: translateX(-50%) scale(1.05);
          }
          
          .card:hover .card-icon-4 {
            transform: none !important;
            scale: 1 !important;
          }
          
          .card-icon-4 {
            transform: none !important;
            scale: 1 !important;
          }
          
          .card:hover .card-icon-1 {
            transform: translateX(-50%) !important;
            scale: 1 !important;
          }
          
          .card:hover .card-icon-0 {
            transform: none !important;
            scale: 1 !important;
            will-change: auto;
          }
          
          .card-icon-0 {
            transform: none !important;
            scale: 1 !important;
            will-change: auto;
          }
          
          .card:nth-child(1):hover {
            transform: none !important;
          }
          
          .card__header {
            position: relative;
            z-index: 10;
          }
          
          .card__content {
            position: relative;
            z-index: 10;
            margin-top: auto;
          }
          
          .card-icon svg {
            width: 100%;
            height: 100%;
            transform: none !important;
            transition: none;
          }
          
          .card-icon-0 svg {
            transform: none !important;
            scale: 1 !important;
          }
          
          .card:hover .card-icon-0 svg {
            transform: none !important;
            scale: 1 !important;
          }
          
          .icon-node,
          .icon-line,
          .icon-bar,
          .icon-segment,
          .icon-platform,
          .icon-wave,
          .icon-trend,
          .icon-arrow {
            transition: all 0.3s ease;
          }
          
          /* Disable all hover effects for Tracking card (card-icon-0) except lines */
          .card-icon-0 .icon-node,
          .card-icon-0 .icon-node-pulse {
            transition: none !important;
            transform: none !important;
            animation: none !important;
          }
          
          .card:hover .card-icon-0 .icon-node,
          .card:hover .card-icon-0 .icon-node-pulse {
            fill: rgba(194, 194, 225, 0.6) !important;
            transform: none !important;
            animation: none !important;
          }
          
          /* Disable hover effects for Patterns card nodes */
          .card:hover .icon-node:not(.card-icon-0 .icon-node):not(.card-icon-4 .icon-node) {
            fill: rgba(194, 194, 225, 0.9);
            transform: scale(1.1);
          }
          
          .card-icon-4 .icon-node {
            fill: rgba(194, 194, 225, 0.8) !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          
          .card:hover .card-icon-4 .icon-node {
            fill: rgba(194, 194, 225, 0.8) !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          
          .card:hover .icon-center {
            fill: rgba(194, 194, 225, 0.6);
            transform: scale(1.15);
          }
          
          .card:hover .icon-line:not(.icon-line-animated) {
            stroke: rgba(194, 194, 225, 0.8);
            stroke-width: 3;
          }
          
          @keyframes dashFlow {
            0% {
              stroke-dashoffset: 0;
              opacity: 0.25;
            }
            50% {
              opacity: 0.7;
            }
            100% {
              stroke-dashoffset: 16;
              opacity: 0.25;
            }
          }
          
          @keyframes nodePulse {
            0%, 100% {
              r: 8;
              opacity: 0.08;
            }
            50% {
              r: 14;
              opacity: 0.2;
            }
          }
          
          @keyframes nodeGlow {
            0%, 100% {
              fill: rgba(194, 194, 225, 0.6);
            }
            50% {
              fill: rgba(165, 165, 214, 0.95);
            }
          }
          
          .icon-line-animated {
            stroke-dasharray: 4 4;
            stroke-dashoffset: 0;
            animation: none !important;
            transition: stroke 0.3s ease, stroke-width 0.3s ease;
          }
          
          .icon-node-pulse {
            animation: none !important;
          }
          
          .icon-node {
            animation: none !important;
            transition: fill 0.3s ease;
          }
          
          .card:hover .icon-line-animated {
            stroke: rgba(165, 165, 214, 0.9) !important;
            stroke-width: 2;
            animation: dashFlow 2s linear infinite !important;
          }
          
          .card:hover .icon-node-pulse {
            animation: none !important;
          }
          
          .card:hover .icon-node {
            animation: none !important;
          }
          
          /* Ensure Tracking card nodes have no animations or hover effects */
          .card-icon-0 .icon-node,
          .card-icon-0 .icon-node-pulse {
            fill: rgba(194, 194, 225, 0.6) !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          
          .card:hover .card-icon-0 .icon-node,
          .card:hover .card-icon-0 .icon-node-pulse {
            fill: rgba(194, 194, 225, 0.6) !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          
          .card:hover .icon-bar {
            fill: rgba(194, 194, 225, 0.8);
          }
          
          .card-icon-1 .icon-bar,
          .card-icon-1 .icon-line {
            transition: none !important;
            transform: none !important;
            animation: none !important;
          }
          
          .card:hover .card-icon-1 .icon-bar,
          .card:hover .card-icon-1 .icon-line {
            transform: none !important;
            animation: none !important;
          }
          
          .card:hover .icon-segment {
            fill: rgba(194, 194, 225, 0.7);
          }
          
          .card-icon-2 .icon-segment {
            transition: none !important;
          }
          
          .card:hover .card-icon-2 .icon-segment {
            fill: rgba(194, 194, 225, 0.6) !important;
          }
          
          .card:hover .icon-platform {
            fill: rgba(194, 194, 225, 0.6);
            transform: translateY(-3px);
          }
          
          .icon-platform-square {
            transition: fill 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            fill: rgba(194, 194, 225, 0.3);
          }
          
          .icon-platform-square.active {
            fill: rgba(165, 165, 214, 0.9);
            transition: fill 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Pattern lines - static by default */
          .icon-pattern-line {
            transition: stroke 0.3s ease;
          }
          
          .icon-pattern-line-animated {
            stroke-dasharray: 6 4;
            stroke-dashoffset: 0;
            opacity: 0;
            transition: opacity 0.3s ease;
            animation: none !important;
          }
          
          .icon-pattern-point {
            opacity: 0.5;
            transition: opacity 0.3s ease, transform 0.3s ease;
          }
          
          /* Animated on hover */
          .card:hover .icon-pattern-line {
            stroke: rgba(194, 194, 225, 0.2);
          }
          
          .card:hover .icon-pattern-line-animated {
            opacity: 1;
            animation: patternFlow 2.5s linear infinite !important;
          }
          
          .card:hover .icon-pattern-point {
            opacity: 1;
            transform: scale(1.2);
            animation: pointPulse 2s ease-in-out infinite;
          }
          
          @keyframes patternFlow {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: 20;
            }
          }
          
          @keyframes pointPulse {
            0%, 100% {
              r: 3;
              opacity: 1;
            }
            50% {
              r: 4;
              opacity: 0.8;
            }
          }
          
          .card:hover .icon-wave:not(.card-icon-4 .icon-wave) {
            stroke: rgba(194, 194, 225, 0.8);
            stroke-width: 4;
          }
          
          .card:hover .icon-trend {
            stroke: rgba(194, 194, 225, 1);
            stroke-width: 5;
          }
          
          .card:hover .icon-arrow {
            stroke: rgba(194, 194, 225, 1);
            stroke-width: 5;
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 0.4;
            }
            50% {
              opacity: 0.7;
            }
          }
          
          @keyframes dashFlow {
            0% {
              stroke-dashoffset: 0;
              opacity: 0.3;
            }
            50% {
              opacity: 0.8;
            }
            100% {
              stroke-dashoffset: 16;
              opacity: 0.3;
            }
          }
          
          @keyframes nodePulse {
            0%, 100% {
              r: 8;
              opacity: 0.1;
            }
            50% {
              r: 12;
              opacity: 0.3;
            }
          }
          
          @keyframes nodeGlow {
            0%, 100% {
              fill: rgba(194, 194, 225, 0.6);
            }
            50% {
              fill: rgba(165, 165, 214, 0.9);
            }
          }
          
          .icon-line-animated {
            stroke-dasharray: 4 4;
            stroke-dashoffset: 0;
            animation: none !important;
            transition: stroke 0.3s ease, stroke-width 0.3s ease;
          }
          
          .icon-node-pulse {
            animation: none !important;
          }
          
          .icon-node {
            animation: none !important;
            transition: fill 0.3s ease;
          }
          
          .particle::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }
          
          .particle-container:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.2), 0 0 30px rgba(${glowColor}, 0.2);
          }
          
          .text-clamp-1 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .text-clamp-2 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          @media (max-width: 599px) {
            .card-responsive {
              grid-template-columns: 1fr;
              width: 100%;
              margin: 0 auto;
              padding: 0.5rem;
            }
            
            .card-responsive .card {
              width: 100%;
              min-height: 220px;
            }
          }
        `}
      </style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        <div className="card-responsive grid gap-2">
          {cardData.map((card, index) => {
            const baseClassName = `card flex flex-col justify-between relative aspect-[4/3] min-h-[250px] w-full max-w-full p-6 rounded-[20px] border border-solid font-light overflow-hidden transition-all duration-300 ease-in-out ${
              index === 0 ? '' : 'hover:-translate-y-0.5'
            } hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] ${
              enableBorderGlow ? 'card--border-glow' : ''
            }`;
            
            // Calculate icon position: between header and content
            const iconTop = 'calc(50% - 0.5rem)'; // Slightly above center to account for text spacing

            const cardStyle = {
              backgroundColor: card.color || 'var(--background-dark)',
              borderColor: 'var(--border-color)',
              color: 'hsl(var(--foreground))',
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': '200px'
            } as React.CSSProperties;

            if (enableStars) {
              return (
                <ParticleCard
                  key={index}
                  className={baseClassName}
                  style={cardStyle}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  <div className="card__header flex justify-between gap-3 relative z-10" style={{ color: 'hsl(var(--foreground))' }}>
                    <span className="card__label text-base font-medium">{card.label}</span>
                  </div>
                  <div className="card__content flex flex-col relative z-10" style={{ color: 'hsl(var(--foreground))' }}>
                    <h3 className={`card__title font-semibold text-lg m-0 mb-2 ${textAutoHide ? 'text-clamp-1' : ''}`}>
                      {card.title}
                    </h3>
                    <p
                      className={`card__description text-sm leading-5 opacity-80 ${textAutoHide ? 'text-clamp-2' : ''}`}
                    >
                      {card.description}
                    </p>
                  </div>
                  {card.icon && (
                    <div 
                      className={`card-icon card-icon-${index}`}
                      ref={(el) => {
                        if (el && index === 3) {
                          // Add sequential random glow animation for Platform Breakdown card
                          let glowInterval: NodeJS.Timeout | null = null;
                          let currentIndex = -1;
                          let isActive = false;
                          
                          const handleMouseEnter = () => {
                            if (isActive) return;
                            isActive = true;
                            
                            const squares = Array.from(el.querySelectorAll('.icon-platform-square')) as HTMLElement[];
                            
                            const glowNext = () => {
                              if (!isActive) return;
                              
                              // Remove active class from previous square
                              if (currentIndex >= 0 && squares[currentIndex]) {
                                squares[currentIndex].classList.remove('active');
                              }
                              
                              // Pick a random square (different from current)
                              let nextIndex;
                              if (squares.length === 1) {
                                nextIndex = 0;
                              } else {
                                do {
                                  nextIndex = Math.floor(Math.random() * squares.length);
                                } while (nextIndex === currentIndex);
                              }
                              
                              currentIndex = nextIndex;
                              squares[currentIndex].classList.add('active');
                              
                              // Schedule next glow
                              const delay = 400 + Math.random() * 300; // 400-700ms between glows
                              glowInterval = setTimeout(glowNext, delay);
                            };
                            
                            // Start the sequence immediately
                            glowNext();
                          };
                          
                          const handleMouseLeave = () => {
                            isActive = false;
                            if (glowInterval) {
                              clearTimeout(glowInterval);
                              glowInterval = null;
                            }
                            const squares = el.querySelectorAll('.icon-platform-square');
                            squares.forEach((square) => {
                              square.classList.remove('active');
                            });
                            currentIndex = -1;
                          };
                          
                          // Also listen on the card itself
                          const card = el.closest('.card');
                          if (card) {
                            card.addEventListener('mouseenter', handleMouseEnter);
                            card.addEventListener('mouseleave', handleMouseLeave);
                          }
                          
                          el.addEventListener('mouseenter', handleMouseEnter);
                          el.addEventListener('mouseleave', handleMouseLeave);
                          
                          return () => {
                            if (card) {
                              card.removeEventListener('mouseenter', handleMouseEnter);
                              card.removeEventListener('mouseleave', handleMouseLeave);
                            }
                            el.removeEventListener('mouseenter', handleMouseEnter);
                            el.removeEventListener('mouseleave', handleMouseLeave);
                            if (glowInterval) {
                              clearTimeout(glowInterval);
                            }
                          };
                        }
                      }}
                    >
                      <card.icon className="card-icon-svg" />
                    </div>
                  )}
                </ParticleCard>
              );
            }

            return (
              <div
                key={index}
                className={baseClassName}
                style={cardStyle}
                ref={el => {
                  if (!el) return;

                  const handleMouseMove = (e: MouseEvent) => {
                    if (shouldDisableAnimations) return;

                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    if (enableTilt) {
                      const rotateX = ((y - centerY) / centerY) * -10;
                      const rotateY = ((x - centerX) / centerX) * 10;

                      gsap.to(el, {
                        rotateX,
                        rotateY,
                        duration: 0.1,
                        ease: 'power2.out',
                        transformPerspective: 1000
                      });
                    }

                    if (enableMagnetism) {
                      const magnetX = (x - centerX) * 0.05;
                      const magnetY = (y - centerY) * 0.05;

                      gsap.to(el, {
                        x: magnetX,
                        y: magnetY,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }
                  };

                  const handleMouseLeave = () => {
                    if (shouldDisableAnimations) return;

                    if (enableTilt) {
                      gsap.to(el, {
                        rotateX: 0,
                        rotateY: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }

                    if (enableMagnetism) {
                      gsap.to(el, {
                        x: 0,
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }
                  };

                  const handleClick = (e: MouseEvent) => {
                    if (!clickEffect || shouldDisableAnimations) return;

                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const maxDistance = Math.max(
                      Math.hypot(x, y),
                      Math.hypot(x - rect.width, y),
                      Math.hypot(x, y - rect.height),
                      Math.hypot(x - rect.width, y - rect.height)
                    );

                    const ripple = document.createElement('div');
                    ripple.style.cssText = `
                      position: absolute;
                      width: ${maxDistance * 2}px;
                      height: ${maxDistance * 2}px;
                      border-radius: 50%;
                      background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
                      left: ${x - maxDistance}px;
                      top: ${y - maxDistance}px;
                      pointer-events: none;
                      z-index: 1000;
                    `;

                    el.appendChild(ripple);

                    gsap.fromTo(
                      ripple,
                      {
                        scale: 0,
                        opacity: 1
                      },
                      {
                        scale: 1,
                        opacity: 0,
                        duration: 0.8,
                        ease: 'power2.out',
                        onComplete: () => ripple.remove()
                      }
                    );
                  };

                  el.addEventListener('mousemove', handleMouseMove);
                  el.addEventListener('mouseleave', handleMouseLeave);
                  el.addEventListener('click', handleClick);
                }}
              >
                <div className="card__header flex justify-between gap-3 relative z-10" style={{ color: 'hsl(var(--foreground))' }}>
                  <span className="card__label text-base font-medium">{card.label}</span>
                </div>
                <div className="card__content flex flex-col relative z-10" style={{ color: 'hsl(var(--foreground))' }}>
                  <h3 className={`card__title font-semibold text-lg m-0 mb-2 ${textAutoHide ? 'text-clamp-1' : ''}`}>
                    {card.title}
                  </h3>
                  <p className={`card__description text-sm leading-5 opacity-80 ${textAutoHide ? 'text-clamp-2' : ''}`}>
                    {card.description}
                  </p>
                </div>
                {card.icon && (
                  <div 
                    className={`card-icon card-icon-${index}`}
                    ref={(el) => {
                      if (el && index === 3) {
                        // Add random glow animation for Platform Breakdown card
                        const handleMouseEnter = () => {
                          const squares = el.querySelectorAll('.icon-platform-square');
                          squares.forEach((square) => {
                            const delay = Math.random() * 1.5;
                            const duration = 0.3 + Math.random() * 0.4;
                            (square as HTMLElement).style.animationDelay = `${delay}s`;
                            (square as HTMLElement).style.animationDuration = `${duration}s`;
                          });
                        };
                        el.addEventListener('mouseenter', handleMouseEnter);
                        return () => {
                          el.removeEventListener('mouseenter', handleMouseEnter);
                        };
                      }
                    }}
                  >
                    <card.icon className="card-icon-svg" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;
