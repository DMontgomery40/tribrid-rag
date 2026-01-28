import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          <h3 className="font-medium">Something went wrong</h3>
          <p className="text-sm mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
