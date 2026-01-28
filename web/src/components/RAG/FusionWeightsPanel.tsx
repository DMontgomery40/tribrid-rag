import { useFusion } from '../../hooks/useFusion';
import { Button } from '../ui/Button';
import type { FusionConfig } from '../../types/generated';

interface FusionWeightsPanelProps {
  onChange?: (weights: FusionConfig) => void;
}

export function FusionWeightsPanel({ onChange }: FusionWeightsPanelProps) {
  const { weights, method, setWeights, setMethod, normalizeWeights } = useFusion();

  const handleWeightChange = (key: 'vector' | 'sparse' | 'graph', value: number) => {
    const newWeights = { ...weights, [key]: value };
    setWeights(newWeights);
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">Fusion Weights</h4>
        <select
          className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
          value={method}
          onChange={(e) => setMethod(e.target.value as 'rrf' | 'weighted')}
        >
          <option value="rrf">RRF</option>
          <option value="weighted">Weighted</option>
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Vector</label>
            <span>{(weights.vector * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            className="tribrid-slider w-full"
            min="0"
            max="1"
            step="0.05"
            value={weights.vector}
            onChange={(e) => handleWeightChange('vector', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Sparse</label>
            <span>{(weights.sparse * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            className="tribrid-slider w-full"
            min="0"
            max="1"
            step="0.05"
            value={weights.sparse}
            onChange={(e) => handleWeightChange('sparse', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Graph</label>
            <span>{(weights.graph * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            className="tribrid-slider w-full"
            min="0"
            max="1"
            step="0.05"
            value={weights.graph}
            onChange={(e) => handleWeightChange('graph', parseFloat(e.target.value))}
          />
        </div>

        <Button variant="secondary" size="sm" onClick={normalizeWeights}>
          Normalize (sum = 1.0)
        </Button>
      </div>
    </div>
  );
}
