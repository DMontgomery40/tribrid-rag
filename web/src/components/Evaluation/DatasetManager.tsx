import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import type { DatasetEntry } from '../../types/generated';

interface DatasetManagerProps {
  repoId: string;
}

export function DatasetManager({ repoId }: DatasetManagerProps) {
  const [entries, setEntries] = useState<DatasetEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dataset?repo_id=${repoId}`);
        setEntries(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [repoId]);

  const handleDelete = async (entryId: string) => {
    await fetch(`/api/dataset/${entryId}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((e) => e.entry_id !== entryId));
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">Evaluation Dataset ({entries.length})</h4>
        <Button variant="secondary" size="sm">
          Add Entry
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">No dataset entries yet</p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.entry_id}
              className="p-2 border rounded dark:border-gray-700 flex justify-between"
            >
              <div>
                <div className="font-medium text-sm">{entry.question}</div>
                <div className="text-xs text-gray-500">
                  {entry.expected_chunks.length} expected chunks | {entry.tags.join(', ')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(entry.entry_id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
