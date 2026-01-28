import { useEvalHistory } from '../../hooks/useEvalHistory';
import { HistoryViewer } from '../Evaluation/HistoryViewer';
import { EvalDrillDown } from '../Evaluation/EvalDrillDown';

export function EvalAnalysisTab() {
  const { selectedRun } = useEvalHistory();

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Evaluation Analysis</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <HistoryViewer />
        </div>
        <div className="lg:col-span-2">
          {selectedRun ? (
            <EvalDrillDown run={selectedRun} />
          ) : (
            <div className="text-gray-500">Select a run to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
