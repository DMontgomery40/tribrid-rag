import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function GlobalSearch() {
  const { query, results, loading, setQuery, search, clear } = useGlobalSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
          placeholder="Search the codebase..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          Search
        </Button>
        {results && (
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
        )}
      </form>

      {loading && (
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">
            {results.matches.length} results in {results.latency_ms.toFixed(0)}ms
            ({results.fusion_method} + {results.reranker_mode})
          </div>
          {results.matches.map((match) => (
            <div
              key={match.chunk_id}
              className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {match.file_path}:{match.start_line}
                </code>
                <span className="text-xs text-gray-500">
                  {match.source} | {match.score.toFixed(3)}
                </span>
              </div>
              <pre className="text-sm overflow-auto max-h-32 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {match.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
