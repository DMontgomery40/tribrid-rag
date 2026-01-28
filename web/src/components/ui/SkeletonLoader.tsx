interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className = '' }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}
