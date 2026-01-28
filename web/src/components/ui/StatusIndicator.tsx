interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  label?: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const statusClasses = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${statusClasses[status]}`} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
