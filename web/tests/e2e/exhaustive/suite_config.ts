import type { UISurface } from './types';

export const UI_SURFACES: UISurface[] = [
  { route: '/start', label: 'Get Started' },
  { route: '/dashboard', subtab: 'system', label: 'Dashboard / System Status' },
  { route: '/dashboard', subtab: 'monitoring', label: 'Dashboard / Monitoring' },
  { route: '/dashboard', subtab: 'storage', label: 'Dashboard / Storage' },
  { route: '/dashboard', subtab: 'help', label: 'Dashboard / Help' },
  { route: '/dashboard', subtab: 'glossary', label: 'Dashboard / Glossary' },
  { route: '/chat', subtab: 'ui', label: 'Chat / UI' },
  { route: '/chat', subtab: 'settings', label: 'Chat / Settings' },
  { route: '/grafana', subtab: 'dashboard', label: 'Grafana / Dashboard' },
  { route: '/grafana', subtab: 'config', label: 'Grafana / Config' },
  { route: '/benchmark', label: 'Benchmark' },
  { route: '/rag', subtab: 'data-quality', label: 'RAG / Data Quality' },
  { route: '/rag', subtab: 'retrieval', label: 'RAG / Retrieval' },
  { route: '/rag', subtab: 'graph', label: 'RAG / Graph' },
  { route: '/rag', subtab: 'reranker-config', label: 'RAG / Reranker' },
  { route: '/rag', subtab: 'learning-ranker', label: 'RAG / Learning Ranker' },
  { route: '/rag', subtab: 'learning-agent', label: 'RAG / Learning Agent Studio' },
  { route: '/rag', subtab: 'indexing', label: 'RAG / Indexing' },
  { route: '/eval', subtab: 'analysis', label: 'Eval / Analysis' },
  { route: '/eval', subtab: 'dataset', label: 'Eval / Dataset' },
  { route: '/eval', subtab: 'prompts', label: 'Eval / Prompts' },
  { route: '/eval', subtab: 'trace', label: 'Eval / Trace' },
  { route: '/infrastructure', subtab: 'services', label: 'Infrastructure / Services' },
  { route: '/infrastructure', subtab: 'docker', label: 'Infrastructure / Docker' },
  { route: '/infrastructure', subtab: 'mcp', label: 'Infrastructure / MCP' },
  { route: '/infrastructure', subtab: 'paths', label: 'Infrastructure / Paths' },
  { route: '/infrastructure', subtab: 'monitoring', label: 'Infrastructure / Monitoring' },
  { route: '/admin', subtab: 'general', label: 'Admin / General' },
  { route: '/admin', subtab: 'secrets', label: 'Admin / Secrets' },
  { route: '/admin', subtab: 'integrations', label: 'Admin / Integrations' },
];

export const REAL_WORLD_CHAT_QUESTIONS: string[] = [
  'How does this system decide whether to use vector, sparse, or graph retrieval for a coding question?',
  'What are the concrete tradeoffs between RRF fusion and weighted fusion in this project configuration?',
  'If I need to reduce retrieval latency without losing too much recall, which three settings should I tune first and why?',
  'Explain how reranking affects final answer quality here, including what happens when reranking fails.',
  'How is corpus isolation implemented across storage and graph retrieval boundaries in this application?',
  'What is the safest procedure to change embedding dimensions in production for this stack?',
  'How can I detect that graph traversal is over-expanding and hurting relevance in real workloads?',
  'Which observability signals in this system best indicate retrieval regressions after a config change?',
  'What configuration would you choose for a medium codebase where developers ask architecture and bug triage questions?',
  'How should we validate that eval analysis results align with what users see in chat quality?',
];

export const RETRIEVAL_PROBES_PER_MUTATION = 3;

export const REQUIRED_CLOUD_PROVIDERS = ['openai', 'openrouter', 'cohere'] as const;

export const METRICS_BUDGET_DEFAULT = 'medium' as const;

export const METRICS_MEDIUM_CORE_SET: string[] = [
  'tribrid_search_requests_total',
  'tribrid_search_latency_seconds_count',
  'tribrid_search_stage_latency_seconds_bucket',
  'tribrid_search_stage_errors_total',
  'tribrid_search_leg_results_count_bucket',
  'tribrid_index_runs_total',
  'tribrid_index_duration_seconds_count',
  'tribrid_index_stage_latency_seconds_bucket',
  'tribrid_chunks_indexed_current',
  'tribrid_graph_entities_current',
  'tribrid_graph_relationships_current',
];

export const RETRIEVAL_IMPACT_HINTS = [
  'retrieval',
  'fusion',
  'vector',
  'sparse',
  'graph',
  'rerank',
  'eval',
  'index',
  'embedding',
  'chunk',
  'bm25',
  'top_k',
  'final_k',
];

export const NEVER_TOUCH_HINTS = [
  'api key',
  'apikey',
  'secret',
  'token',
  'webhook',
  'password',
];

export const ACTION_BLACKLIST_HINTS = [
  // Keep destructive infra actions out of default mode.
  'delete corpus',
  'remove corpus',
  'factory reset',
  'drop database',
];
