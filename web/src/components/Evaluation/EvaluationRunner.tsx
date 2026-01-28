import { useState } from 'react';
import { useRepoStore, useUIStore } from '../../stores';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import type { EvalRun } from '../../types/generated';

interface EvaluationRunnerProps {
  repoId: string;
  onComplete?: (run: EvalRun) => void;
}

export function EvaluationRunner({ repoId, onComplete }: EvaluationRunnerProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const setEvalInProgress = useUIStore((s) => s.setEvalInProgress);

  const runEval = async () => {
    setRunning(true);
    setProgress(0);
    setEvalInProgress(true);

    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId }),
      });
      const run = await res.json();
      setProgress(100);
      onComplete?.(run);
    } finally {
      setRunning(false);
      setEvalInProgress(false);
    }
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Run Evaluation</h4>
      {running && (
        <div className="mb-4">
          <ProgressBar progress={progress} label="Running evaluation..." />
        </div>
      )}
      <Button onClick={runEval} loading={running} disabled={running}>
        Start Evaluation
      </Button>
    </div>
  );
}
