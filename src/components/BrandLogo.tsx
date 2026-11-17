import { motion } from 'motion/react';

interface BrandLogoProps {
  size?: 'md' | 'sm';
  shimmerKey?: number;
  onClick?: () => void;
}

export function BrandLogo({ size = 'md', shimmerKey = 0, onClick }: BrandLogoProps) {
  const dimClass = size === 'sm' ? 'w-7 h-7 rounded-[9px]' : 'w-9 h-9 rounded-[11px]';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-label="Sovereign Supply — Cuộn lên đầu trang"
      className={`relative ${dimClass} overflow-hidden shrink-0 cursor-pointer border border-[#E5C98B]/60 shadow-[0_4px_12px_rgba(61,4,14,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#640D22]`}
    >
      {/* Wine Enamel & Brushed Champagne Gold Monogram Emblem */}
      <svg
        viewBox="0 0 64 64"
        className="w-full h-full block"
        role="img"
        aria-label="Logo Sovereign Supply"
      >
        <defs>
          <linearGradient id="wine-enamel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6D1227" />
            <stop offset="55%" stopColor="#4D0516" />
            <stop offset="100%" stopColor="#35020E" />
          </linearGradient>
          <linearGradient id="champagne-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F7E5B4" />
            <stop offset="45%" stopColor="#DFBA70" />
            <stop offset="100%" stopColor="#A67E33" />
          </linearGradient>
        </defs>

        {/* Background Enamel */}
        <rect x="0" y="0" width="64" height="64" fill="url(#wine-enamel)" />

        {/* Subtle Inner Gold Hairline Frame */}
        <rect
          x="3.5"
          y="3.5"
          width="57"
          height="57"
          rx="10"
          fill="none"
          stroke="url(#champagne-gold)"
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />

        {/* Geometric Isometric Cargo Hexagon */}
        <polygon
          points="32,12 50,22.5 50,41.5 32,52 14,41.5 14,22.5"
          fill="none"
          stroke="url(#champagne-gold)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Interlocking Architectural S Monogram */}
        <path
          d="M40.5 22.5C38.5 19.8 35.2 18.5 31.6 18.8C26.8 19.2 23.6 22.2 23.8 25.8C24 29.3 27.2 31.1 32.1 32.3C37.2 33.6 40.4 35.4 40.4 39.2C40.4 43 36.8 45.8 31.8 45.8C27.9 45.8 24.6 44.2 22.6 41.4"
          fill="none"
          stroke="url(#champagne-gold)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />

        {/* Precision Cargo Prism Facet Lines */}
        <path
          d="M14.8 23L24 28.2M49.2 41L40 35.8"
          stroke="url(#champagne-gold)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </svg>

      {/* Glass Specular Top Gloss */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
      />

      {/* Shimmer Sweep Effect (re-triggered on shimmerKey change + gentle loop) */}
      <span
        key={shimmerKey}
        aria-hidden="true"
        className="logo-shimmer pointer-events-none absolute inset-y-0 -left-full w-3/4 bg-gradient-to-r from-transparent via-[#FFF6DC]/55 to-transparent"
      />
    </motion.button>
  );
}
