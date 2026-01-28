interface ProgressBarWithShimmerProps {
  progress: number;
  label?: string;
}

export function ProgressBarWithShimmer({ progress, label }: ProgressBarWithShimmerProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isIndeterminate = progress < 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm">
          <span>{label}</span>
          {!isIndeterminate && <span>{clampedProgress.toFixed(0)}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
        {isIndeterminate ? (
          <div className="h-2 bg-blue-600 rounded-full animate-pulse w-full" />
        ) : (
          <div
            className="h-2 bg-blue-600 rounded-full transition-all relative overflow-hidden"
            style={{ width: `${clampedProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  );
}
