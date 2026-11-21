import React from 'react';

export const ZellaHostelSeal: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} select-none shrink-0`}
      style={{ color: '#0A68A7' }}
      aria-label="Official Zella Ladies Hostel Seal"
    >
      {/* Outer Border */}
      <circle cx="60" cy="60" r="56" fill="none" stroke="#0A68A7" strokeWidth="2.2" />
      {/* Inner Concentric Border */}
      <circle cx="60" cy="60" r="39" fill="none" stroke="#0A68A7" strokeWidth="1.2" />

      {/* Ring Curved Characters - ZELLA LADIES HOSTEL */}
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-65.0, 60, 60)">Z</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-57.8, 60, 60)">E</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-50.6, 60, 60)">L</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-43.3, 60, 60)">L</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-36.1, 60, 60)">A</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-21.7, 60, 60)">L</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-14.4, 60, 60)">A</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(-7.2, 60, 60)">D</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(0.0, 60, 60)">I</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(7.2, 60, 60)">E</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(14.4, 60, 60)">S</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(28.9, 60, 60)">H</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(36.1, 60, 60)">O</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(43.3, 60, 60)">S</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(50.6, 60, 60)">T</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(57.8, 60, 60)">E</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="8" fontWeight="800" transform="rotate(65.0, 60, 60)">L</text>

      {/* Star Separators on the sides */}
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="9" fontWeight="bold" transform="rotate(-82, 60, 60)">★</text>
      <text x="60" y="14" textAnchor="middle" dominantBaseline="central" fill="#0A68A7" fontSize="9" fontWeight="bold" transform="rotate(82, 60, 60)">★</text>

      {/* Center Texts */}
      <text
        x="60"
        y="55"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0A68A7"
        fontSize="9.5"
        fontWeight="800"
        letterSpacing="1.2"
        fontFamily="sans-serif"
      >
        KOTTAKKAL
      </text>
      <text
        x="60"
        y="68"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0A68A7"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="1.5"
        fontFamily="sans-serif"
      >
        676503
      </text>
    </svg>
  );
};
