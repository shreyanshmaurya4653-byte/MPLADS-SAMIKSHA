import React from 'react';

export function InsightAiLogo({ className = "w-12 h-16 sm:w-14 sm:h-18" }) {
  return (
    <div className={`flex-shrink-0 flex items-center justify-center select-none ${className}`}>
      <img
        src="/assets/emblem.png?v=crop"
        alt="State Emblem of India - Government of India"
        className="max-h-full max-w-full object-contain filter drop-shadow-sm mix-blend-multiply"
      />
    </div>
  );
}

export default InsightAiLogo;
