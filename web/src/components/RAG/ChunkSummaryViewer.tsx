import type { Chunk } from '../../types/generated';

interface ChunkSummaryViewerProps {
  chunk: Chunk;
}

export function ChunkSummaryViewer({ chunk }: ChunkSummaryViewerProps) {
  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="mb-2">
        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {chunk.file_path}:{chunk.start_line}-{chunk.end_line}
        </code>
      </div>
      {chunk.summary && (
        <div className="mb-2">
          <h5 className="text-sm font-medium mb-1">Summary</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">{chunk.summary}</p>
        </div>
      )}
      <div>
        <h5 className="text-sm font-medium mb-1">Content</h5>
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-48">
          {chunk.content}
        </pre>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {chunk.token_count} tokens | {chunk.language || 'unknown'}
      </div>
    </div>
  );
}
