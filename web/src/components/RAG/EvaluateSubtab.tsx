import { useRepoStore } from '../../stores';
import { EvaluationRunner } from '../Evaluation/EvaluationRunner';
import { HistoryViewer } from '../Evaluation/HistoryViewer';

export function EvaluateSubtab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  if (!activeRepoId) {
    return <div className="text-gray-500">Select a repository to run evaluation</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EvaluationRunner repoId={activeRepoId} />
      <HistoryViewer repoId={activeRepoId} />
    </div>
  );
}
