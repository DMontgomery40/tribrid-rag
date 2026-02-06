import { useEffect, useMemo, useState } from 'react';
import { rerankerTrainingService } from '@/services/RerankerTrainingService';
import type { RerankerTrainDiffResponse, RerankerTrainRun, RerankerTrainRunMeta } from '@/types/generated';

type Props = {
  runs: RerankerTrainRunMeta[];
};

function formatDelta(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(4)}`;
}

function formatSeconds(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v < 10) return `${v.toFixed(2)}s`;
  if (v < 60) return `${v.toFixed(1)}s`;
  return `${v.toFixed(0)}s`;
}

function formatMetricValue(v: number | null | undefined): string {
  if (v == null) return '—';
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0.0000';
  if (Math.abs(v) < 1) return v.toFixed(4);
  return v.toFixed(3);
}

function deltaColor(v: number | null | undefined): string {
  if (v == null) return 'var(--studio-text-muted)';
  if (v > 0.0001) return 'var(--studio-good)';
  if (v < -0.0001) return 'var(--studio-bad)';
  return 'var(--studio-text-muted)';
}

function deltaArrow(v: number | null | undefined): string {
  if (v == null) return '';
  if (v > 0.0001) return ' \u2191';
  if (v < -0.0001) return ' \u2193';
  return ' =';
}

function safeDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RunDiff({ runs }: Props) {
  const sorted = useMemo(() => {
    return [...runs].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
  }, [runs]);

  const [baselineRunId, setBaselineRunId] = useState('');
  const [currentRunId, setCurrentRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<RerankerTrainDiffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load full run data for config comparison
  const [baselineRun, setBaselineRun] = useState<RerankerTrainRun | null>(null);
  const [currentRun, setCurrentRun] = useState<RerankerTrainRun | null>(null);

  useEffect(() => {
    if (!sorted.length) return;
    if (!currentRunId) setCurrentRunId(sorted[0].run_id);
    if (!baselineRunId && sorted.length > 1) setBaselineRunId(sorted[1].run_id);
  }, [sorted, currentRunId, baselineRunId]);

  useEffect(() => {
    if (!baselineRunId || !currentRunId || baselineRunId === currentRunId) {
      setDiff(null);
      setBaselineRun(null);
      setCurrentRun(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      rerankerTrainingService.diffRuns(baselineRunId, currentRunId),
      rerankerTrainingService.getRun(baselineRunId).catch(() => null),
      rerankerTrainingService.getRun(currentRunId).catch(() => null),
    ])
      .then(([diffRes, baseRun, curRun]) => {
        if (cancelled) return;
        setDiff(diffRes);
        setBaselineRun(baseRun);
        setCurrentRun(curRun);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to diff runs');
        setDiff(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baselineRunId, currentRunId]);

  // Compute config differences between runs
  const configDiffs = useMemo(() => {
    if (!baselineRun || !currentRun) return [];
    const bSnap = (baselineRun.config_snapshot?.training ?? {}) as Record<string, unknown>;
    const cSnap = (currentRun.config_snapshot?.training ?? {}) as Record<string, unknown>;
    const keys = new Set([...Object.keys(bSnap), ...Object.keys(cSnap)]);
    const diffs: Array<{ key: string; baseline: string; current: string }> = [];
    for (const key of keys) {
      const bVal = JSON.stringify(bSnap[key] ?? null);
      const cVal = JSON.stringify(cSnap[key] ?? null);
      if (bVal !== cVal) {
        diffs.push({ key, baseline: String(bSnap[key] ?? '—'), current: String(cSnap[key] ?? '—') });
      }
    }
    return diffs.sort((a, b) => a.key.localeCompare(b.key));
  }, [baselineRun, currentRun]);

  const baselineMeta = sorted.find((r) => r.run_id === baselineRunId);
  const currentMeta = sorted.find((r) => r.run_id === currentRunId);

  return (
    <section className="studio-panel studio-compact-panel" data-testid="studio-run-diff">
      <header className="studio-panel-header">
        <h3 className="studio-panel-title">Run Diff</h3>
      </header>

      {sorted.length < 2 ? (
        <p className="studio-empty">Need at least two runs to compare.</p>
      ) : (
        <>
          {/* Run selectors */}
          <div className="studio-form-grid two">
            <div className="input-group">
              <label>Baseline (older)</label>
              <select value={baselineRunId} onChange={(e) => setBaselineRunId(e.target.value)}>
                <option value="">Select...</option>
                {sorted.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.run_id} ({r.status})
                  </option>
                ))}
              </select>
              {baselineMeta ? (
                <span className="studio-mini-note">{safeDateLabel(baselineMeta.started_at)}</span>
              ) : null}
            </div>
            <div className="input-group">
              <label>Current (newer)</label>
              <select value={currentRunId} onChange={(e) => setCurrentRunId(e.target.value)}>
                <option value="">Select...</option>
                {sorted.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.run_id} ({r.status})
                  </option>
                ))}
              </select>
              {currentMeta ? (
                <span className="studio-mini-note">{safeDateLabel(currentMeta.started_at)}</span>
              ) : null}
            </div>
          </div>

          {loading ? <p className="studio-empty">Computing diff...</p> : null}
          {error ? <div className="studio-callout studio-callout-err">{error}</div> : null}

          {diff && diff.compatible === false ? (
            <div className="studio-callout studio-callout-warn">
              {diff.reason || 'Primary metric/k differ between runs. Comparison may not be meaningful.'}
            </div>
          ) : null}

          {/* Delta metrics */}
          {diff && diff.compatible !== false ? (
            <>
              <h4 className="studio-section-heading" style={{ marginTop: '12px' }}>
                {diff.primary_metric ? `${diff.primary_metric.toUpperCase()}@${diff.primary_k}` : 'Primary metric'} comparison
              </h4>

              <div className="studio-diff-grid">
                {/* Primary best: baseline vs current with delta */}
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Baseline best</span>
                  <span className="studio-metric-value studio-mono">
                    {formatMetricValue(diff.baseline_primary_best)}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Current best</span>
                  <span className="studio-metric-value studio-mono">
                    {formatMetricValue(diff.current_primary_best)}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">
                    Delta primary{deltaArrow(diff.delta_primary_best)}
                  </span>
                  <span
                    className="studio-metric-value studio-mono"
                    style={{ color: deltaColor(diff.delta_primary_best) }}
                  >
                    {formatDelta(diff.delta_primary_best)}
                  </span>
                </article>
              </div>

              <div className="studio-diff-grid" style={{ marginTop: '8px' }}>
                {/* Time to best */}
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Baseline time-to-best</span>
                  <span className="studio-metric-value studio-mono">
                    {formatSeconds(diff.baseline_time_to_best_secs)}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Current time-to-best</span>
                  <span className="studio-metric-value studio-mono">
                    {formatSeconds(diff.current_time_to_best_secs)}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Delta time</span>
                  <span className="studio-metric-value studio-mono">
                    {diff.delta_time_to_best_secs == null
                      ? '—'
                      : `${diff.delta_time_to_best_secs > 0 ? '+' : ''}${formatSeconds(diff.delta_time_to_best_secs)}`}
                  </span>
                </article>
              </div>

              <div className="studio-diff-grid" style={{ marginTop: '8px' }}>
                {/* Stability */}
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Baseline stability</span>
                  <span className="studio-metric-value studio-mono">
                    {diff.baseline_stability_stddev != null ? diff.baseline_stability_stddev.toFixed(5) : '—'}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Current stability</span>
                  <span className="studio-metric-value studio-mono">
                    {diff.current_stability_stddev != null ? diff.current_stability_stddev.toFixed(5) : '—'}
                  </span>
                </article>
                <article className="studio-metric-card">
                  <span className="studio-metric-name">Delta stddev</span>
                  <span className="studio-metric-value studio-mono">
                    {formatDelta(diff.delta_stability_stddev)}
                  </span>
                </article>
              </div>
            </>
          ) : null}

          {/* Config differences */}
          {configDiffs.length > 0 ? (
            <details className="studio-details" style={{ marginTop: '12px' }}>
              <summary>Config differences ({configDiffs.length} changed)</summary>
              <div className="studio-config-diff-table">
                <div className="studio-config-diff-header">
                  <span>Parameter</span>
                  <span>Baseline</span>
                  <span>Current</span>
                </div>
                {configDiffs.map((d) => (
                  <div key={d.key} className="studio-config-diff-row">
                    <span className="studio-mono">{d.key}</span>
                    <span className="studio-mono" style={{ color: 'var(--studio-bad)', opacity: 0.8 }}>{d.baseline}</span>
                    <span className="studio-mono" style={{ color: 'var(--studio-good)' }}>{d.current}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : configDiffs.length === 0 && baselineRun && currentRun ? (
            <p className="studio-mini-note" style={{ marginTop: '8px' }}>No config differences between runs.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
