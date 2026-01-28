interface ProgressBarProps {
  progress: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function ProgressBar({ progress, label, variant = 'default' }: ProgressBarProps) {
  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm">
          <span>{label}</span>
          <span>{clampedProgress.toFixed(0)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all ${variantClasses[variant]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
