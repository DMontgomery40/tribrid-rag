import { useState } from 'react';
import { useRepoStore } from '../../stores';
import { Button } from './Button';

interface RepoSwitcherModalProps {
  open: boolean;
  onClose: () => void;
}

export function RepoSwitcherModal({ open, onClose }: RepoSwitcherModalProps) {
  const repos = useRepoStore((s) => s.repos);
  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const setActiveRepo = useRepoStore((s) => s.setActiveRepo);
  const [selected, setSelected] = useState(activeRepoId);

  if (!open) return null;

  const handleConfirm = () => {
    if (selected) {
      setActiveRepo(selected);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Switch Repository</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {repos.map((repo) => (
            <button
              key={repo.repo_id}
              className={`w-full p-3 text-left rounded border ${
                selected === repo.repo_id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setSelected(repo.repo_id)}
            >
              <div className="font-medium">{repo.name}</div>
              {repo.description && (
                <div className="text-sm text-gray-500">{repo.description}</div>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Select</Button>
        </div>
      </div>
    </div>
  );
}
