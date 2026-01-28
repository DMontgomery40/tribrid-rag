export const ROUTES = {
  START: 'start',
  RAG: 'rag',
  CHAT: 'chat',
  EVALUATION: 'evaluation',
  EVAL_ANALYSIS: 'eval-analysis',
  GRAFANA: 'grafana',
  GRAPH: 'graph',
  INFRASTRUCTURE: 'infrastructure',
  ADMIN: 'admin',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
