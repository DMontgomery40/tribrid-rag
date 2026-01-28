import { useRepoStore } from '../../stores';
import { EvaluationRunner } from '../Evaluation/EvaluationRunner';
import { DatasetManager } from '../Evaluation/DatasetManager';

export function EvaluationTab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  if (!activeRepoId) {
    return (
      <div className="p-4 text-gray-500">
        Select a repository to run evaluations
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Evaluation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EvaluationRunner repoId={activeRepoId} />
        <DatasetManager repoId={activeRepoId} />
      </div>
    </div>
  );
}
