import { useMemo } from 'react';
import { TooltipIcon } from '@/components/ui/TooltipIcon';
import type { RerankerTrainRun } from '@/types/generated';

type Props = {
  run: RerankerTrainRun | null;
  latestMetrics: Record<string, number> | null;
};

function metricLabel(metric: RerankerTrainRun['primary_metric'], k: number): string {
  if (metric === 'mrr') return `MRR@${k}`;
  if (metric === 'ndcg') return `nDCG@${k}`;
  return 'MAP';
}

function formatMetricValue(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0.0000';
  if (Math.abs(v) < 1) return v.toFixed(4);
  return v.toFixed(3);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem.toFixed(0)}s`;
}

function safeDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function RunOverview({ run, latestMetrics }: Props) {
  if (!run) {
    return (
      <section className="studio-panel studio-compact-panel">
        <header className="studio-panel-header">
          <h3 className="studio-panel-title">Run Overview</h3>
        </header>
        <p className="studio-empty">Select a run to see details.</p>
      </section>
    );
  }

  const k = Number(run.primary_k ?? 10);
  const label = metricLabel(run.primary_metric, k);
  const summary = run.summary;
  const best = summary?.primary_metric_best ?? null;
  const final_ = summary?.primary_metric_final ?? null;
  const headline = best ?? final_;

  const snap: Record<string, unknown> = run.config_snapshot || {};
  const trainingSnap = (snap.training ?? {}) as Record<string, unknown>;
  const rerankingSnap = (snap.reranking ?? {}) as Record<string, unknown>;

  const duration = useMemo(() => {
    const started = new Date(run.started_at);
    const ended = run.completed_at ? new Date(run.completed_at) : null;
    if (!Number.isFinite(started.getTime())) return null;
    const endTime = ended && Number.isFinite(ended.getTime()) ? ended.getTime() : Date.now();
    return endTime - started.getTime();
  }, [run.started_at, run.completed_at]);

  const statusColor =
    run.status === 'completed' ? 'var(--studio-good)' :
    run.status === 'failed' ? 'var(--studio-bad)' :
    run.status === 'running' ? 'var(--studio-accent)' :
    run.status === 'cancelled' ? 'var(--studio-warn)' :
    'var(--studio-text-muted)';

  return (
    <section className="studio-panel studio-compact-panel" data-testid="studio-run-overview">
      <header className="studio-panel-header">
        <div>
          <h3 className="studio-panel-title">Run Overview</h3>
          <p className="studio-panel-subtitle studio-mono">{run.run_id}</p>
        </div>
        <div className="studio-overview-headline">
          <span className="studio-overview-label">{label}</span>
          <span className="studio-overview-value studio-mono">
            {headline == null ? '—' : formatMetricValue(headline)}
          </span>
        </div>
      </header>

      {/* Status + timing row */}
      <div className="studio-keyvals" style={{ marginBottom: '12px' }}>
        <div>
          <span>Status</span>
          <span className="studio-mono" style={{ color: statusColor }}>{run.status}</span>
        </div>
        <div>
          <span>Started</span>
          <span className="studio-mono">{safeDateLabel(run.started_at)}</span>
        </div>
        <div>
          <span>Completed</span>
          <span className="studio-mono">{safeDateLabel(run.completed_at)}</span>
        </div>
        <div>
          <span>Duration</span>
          <span className="studio-mono">{duration != null ? formatDuration(duration) : '—'}</span>
        </div>
        <div>
          <span>Corpus</span>
          <span className="studio-mono">{run.corpus_id || '—'}</span>
        </div>
      </div>

      {/* Summary metrics row */}
      {summary ? (
        <div className="studio-metric-grid" style={{ marginBottom: '12px' }}>
          <article className="studio-metric-card">
            <span className="studio-metric-name">{label} best</span>
            <span className="studio-metric-value studio-mono">
              {best != null ? formatMetricValue(best) : '—'}
            </span>
            {summary.best_step != null ? (
              <span className="studio-mini-note">step {summary.best_step}</span>
            ) : null}
          </article>
          <article className="studio-metric-card">
            <span className="studio-metric-name">{label} final</span>
            <span className="studio-metric-value studio-mono">
              {final_ != null ? formatMetricValue(final_) : '—'}
            </span>
          </article>
          <article className="studio-metric-card">
            <span className="studio-metric-name">Time to best</span>
            <span className="studio-metric-value studio-mono">
              {summary.time_to_best_secs != null ? `${summary.time_to_best_secs.toFixed(1)}s` : '—'}
            </span>
          </article>
          <article className="studio-metric-card">
            <span className="studio-metric-name">Stability (stddev)</span>
            <span className="studio-metric-value studio-mono">
              {summary.stability_stddev != null ? summary.stability_stddev.toFixed(5) : '—'}
            </span>
          </article>
        </div>
      ) : null}

      {/* All available metrics */}
      {(run.metrics_available || []).length > 0 ? (
        <>
          <h4 className="studio-section-heading">All metrics</h4>
          <div className="studio-metric-grid">
            {(run.metrics_available || []).map((key) => {
              const val = latestMetrics && latestMetrics[key] != null ? Number(latestMetrics[key]) : null;
              return (
                <article key={key} className="studio-metric-card">
                  <span className="studio-metric-name">{key}</span>
                  <span className="studio-metric-value studio-mono">
                    {val != null ? formatMetricValue(val) : '—'}
                  </span>
                </article>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Metric rationale */}
      {run.metric_profile?.rationale ? (
        <div className="studio-inline-help" style={{ marginTop: '8px' }}>
          <span className="studio-help-anchor" title={run.metric_profile.rationale}>
            Metric rationale
          </span>
          <TooltipIcon name="RERANKER_TRAIN_RECOMMENDED_METRIC" />
        </div>
      ) : null}

      {/* Hyperparameter snapshot */}
      <details className="studio-details" style={{ marginTop: '12px' }}>
        <summary>Training hyperparameters</summary>
        <div className="studio-keyvals">
          <div><span>Epochs</span><span className="studio-mono">{run.epochs}</span></div>
          <div><span>Batch size</span><span className="studio-mono">{run.batch_size}</span></div>
          <div><span>Learning rate</span><span className="studio-mono">{run.lr}</span></div>
          <div><span>Warmup ratio</span><span className="studio-mono">{run.warmup_ratio}</span></div>
          <div><span>Max length</span><span className="studio-mono">{run.max_length}</span></div>
          <div>
            <span>Backend</span>
            <span className="studio-mono">{String(trainingSnap.learning_reranker_backend ?? '—')}</span>
          </div>
          <div>
            <span>Base model</span>
            <span className="studio-mono studio-truncate" title={String(trainingSnap.learning_reranker_base_model ?? '')}>
              {String(trainingSnap.learning_reranker_base_model ?? '—')}
            </span>
          </div>
          <div>
            <span>LoRA rank</span>
            <span className="studio-mono">{String(trainingSnap.learning_reranker_lora_rank ?? '—')}</span>
          </div>
          <div>
            <span>LoRA alpha</span>
            <span className="studio-mono">{String(trainingSnap.learning_reranker_lora_alpha ?? '—')}</span>
          </div>
          <div>
            <span>Grad accum steps</span>
            <span className="studio-mono">{String(trainingSnap.learning_reranker_grad_accum_steps ?? '—')}</span>
          </div>
          <div>
            <span>Negative ratio</span>
            <span className="studio-mono">{String(trainingSnap.learning_reranker_negative_ratio ?? '—')}</span>
          </div>
          <div>
            <span>Model path</span>
            <span className="studio-mono studio-truncate" title={String(trainingSnap.tribrid_reranker_model_path ?? '')}>
              {String(trainingSnap.tribrid_reranker_model_path ?? '—')}
            </span>
          </div>
          <div>
            <span>Reranker topN</span>
            <span className="studio-mono">{String(rerankingSnap.tribrid_reranker_topn ?? '—')}</span>
          </div>
        </div>
      </details>
    </section>
  );
}
