import { useState } from 'react';
import { useTooltips } from '../../hooks/useTooltips';

interface TooltipIconProps {
  tooltipId: string;
  size?: 'sm' | 'md';
}

export function TooltipIcon({ tooltipId, size = 'sm' }: TooltipIconProps) {
  const [visible, setVisible] = useState(false);
  const { getTooltip } = useTooltips();
  const tooltip = getTooltip(tooltipId);

  if (!tooltip) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div className="relative inline-block">
      <button
        className={`${sizeClasses[size]} text-gray-400 hover:text-gray-600 rounded-full`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-label={`Info about ${tooltip.term}`}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {visible && (
        <div className="tribrid-tooltip absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded shadow-lg -top-2 left-6">
          <div className="font-medium mb-1">{tooltip.term}</div>
          <div className="text-gray-300">{tooltip.definition}</div>
          {tooltip.links.length > 0 && (
            <div className="mt-2 space-x-2">
              {tooltip.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
