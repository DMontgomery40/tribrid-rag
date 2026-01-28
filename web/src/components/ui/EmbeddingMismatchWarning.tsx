import { useEmbeddingStatus } from '../../hooks/useEmbeddingStatus';
import { Button } from './Button';

export function EmbeddingMismatchWarning() {
  const { mismatch, currentModel, indexedModel, dismiss } = useEmbeddingStatus();

  if (!mismatch) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">Embedding Model Mismatch</h4>
          <p className="text-sm mt-1">
            Current model: <code>{currentModel}</code>
            <br />
            Indexed with: <code>{indexedModel}</code>
          </p>
          <p className="text-sm mt-2">
            Search results may be degraded. Consider re-indexing with the current model.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
