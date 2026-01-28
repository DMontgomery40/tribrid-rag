interface ChunkSummaryPanelProps {
  repoId: string;
}

export function ChunkSummaryPanel({ repoId }: ChunkSummaryPanelProps) {
  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Chunk Summaries</h4>
      <p className="text-gray-500 text-sm">
        Chunk summary generation and viewing coming soon...
      </p>
    </div>
  );
}
