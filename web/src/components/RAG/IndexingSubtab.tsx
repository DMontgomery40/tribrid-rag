import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfigField } from '@/hooks';
import type { IndexRequest, IndexStats, IndexStatus } from '@/types/generated';

export function IndexingSubtab() {
  // Config (LAW) - minimal set for now
  const [embeddingType, setEmbeddingType] = useConfigField<string>('embedding.embedding_type', 'openai');
  const [embeddingModel, setEmbeddingModel] = useConfigField<string>('embedding.embedding_model', 'text-embedding-3-large');
  const [embeddingModelLocal, setEmbeddingModelLocal] = useConfigField<string>(
    'embedding.embedding_model_local',
    'all-MiniLM-L6-v2'
  );
  const [chunkingStrategy, setChunkingStrategy] = useConfigField<string>('chunking.chunking_strategy', 'ast');
  const [chunkSize, setChunkSize] = useConfigField<number>('chunking.chunk_size', 1000);
  const [chunkOverlap, setChunkOverlap] = useConfigField<number>('chunking.chunk_overlap', 200);

  // Index job input (request-driven)
  const [repoId, setRepoId] = useState('tribrid');
  const [repoPath, setRepoPath] = useState('');
  const [forceReindex, setForceReindex] = useState(false);

  // Status + stats
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canIndex = useMemo(() => Boolean(repoId.trim() && repoPath.trim()), [repoId, repoPath]);

  const fetchStatus = useCallback(async () => {
    if (!repoId.trim()) return;
    try {
      const res = await fetch(`/api/index/${encodeURIComponent(repoId)}/status`);
      if (!res.ok) return;
      setStatus(await res.json());
    } catch {
      // ignore
    }
  }, [repoId]);

  const fetchStats = useCallback(async () => {
    if (!repoId.trim()) return;
    try {
      const res = await fetch(`/api/index/${encodeURIComponent(repoId)}/stats`);
      if (!res.ok) return;
      setStats(await res.json());
    } catch {
      // ignore
    }
  }, [repoId]);

  useEffect(() => {
    void fetchStatus();
    void fetchStats();
  }, [fetchStatus, fetchStats]);

  const handleStartIndex = async () => {
    if (!canIndex) return;
    setLoading(true);
    setError(null);
    try {
      const body: IndexRequest = {
        repo_id: repoId,
        repo_path: repoPath,
        force_reindex: forceReindex,
      };
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `Index request failed (${res.status})`);
      }
      setStatus(await res.json());
      await fetchStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Indexing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndex = async () => {
    if (!repoId.trim()) return;
    if (!confirm(`Delete index for repo "${repoId}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/index/${encodeURIComponent(repoId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `Delete failed (${res.status})`);
      }
      setStats(null);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subtab-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
          🧱 Indexing
        </h3>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          Build the local tri-brid index (vector + sparse). Graph indexing is configured separately.
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--err)',
            background: 'rgba(var(--err-rgb), 0.08)',
            color: 'var(--fg)',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Index job</div>

        <div className="input-row">
          <div className="input-group">
            <label>Repo ID</label>
            <input value={repoId} onChange={(e) => setRepoId(e.target.value)} placeholder="tribrid" />
          </div>
          <div className="input-group">
            <label>Repo path (on disk)</label>
            <input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/absolute/path/to/repo"
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              <input
                type="checkbox"
                checked={forceReindex}
                onChange={(e) => setForceReindex(e.target.checked)}
              />{' '}
              Force reindex
            </label>
          </div>
          <div className="input-group" />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="small-button" onClick={handleStartIndex} disabled={!canIndex || loading}>
            {loading ? 'Indexing…' : 'Index now'}
          </button>
          <button className="small-button" onClick={handleDeleteIndex} disabled={!repoId.trim() || loading}>
            Delete index
          </button>
          <button className="small-button" onClick={() => void fetchStats()} disabled={!repoId.trim() || loading}>
            Refresh stats
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Configuration (applied to indexing)</div>

        <div className="input-row">
          <div className="input-group">
            <label>Embedding type</label>
            <input value={embeddingType} onChange={(e) => setEmbeddingType(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Embedding model</label>
            <input value={embeddingModel} onChange={(e) => setEmbeddingModel(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Local embedding model</label>
            <input value={embeddingModelLocal} onChange={(e) => setEmbeddingModelLocal(e.target.value)} />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Chunking strategy</label>
            <input value={chunkingStrategy} onChange={(e) => setChunkingStrategy(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Chunk size</label>
            <input
              type="number"
              min={100}
              max={5000}
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value || '1000', 10))}
            />
          </div>
          <div className="input-group">
            <label>Chunk overlap</label>
            <input
              type="number"
              min={0}
              max={2000}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value || '200', 10))}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Status & stats</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
          status={status?.status || '—'} progress={(status?.progress ?? 0).toFixed(2)}
          {status?.current_file ? ` file=${status.current_file}` : ''}
        </div>

        {stats ? (
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Files:</strong> {stats.total_files}
            </div>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Chunks:</strong> {stats.total_chunks}
            </div>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Tokens:</strong> {stats.total_tokens}
            </div>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Embedding model:</strong> {stats.embedding_model} ({stats.embedding_dimensions}
              d)
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No index stats yet.</div>
        )}
      </div>
    </div>
  );
}

