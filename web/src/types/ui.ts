export interface TooltipEntry {
  id: string;
  term: string;
  definition: string;
  category: string;
  links: Array<{ label: string; url: string }>;
}

export interface ActivityItem {
  id: string;
  type: 'index' | 'search' | 'eval' | 'config';
  message: string;
  timestamp: string;
}

export interface SystemStatus {
  postgres: ServiceStatus;
  neo4j: ServiceStatus;
  api: ServiceStatus;
}

export interface ServiceStatus {
  name: string;
  healthy: boolean;
  latency_ms: number;
  error: string | null;
}

export interface ContainerStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string | null;
  memory_mb: number | null;
}

export interface RerankerStatus {
  mode: string;
  model_loaded: boolean;
  model_path: string | null;
  last_trained: string | null;
}

export interface EvalComparison {
  runs: string[];
  metrics: Record<string, number[]>;
  improvements: Record<string, number>;
}
