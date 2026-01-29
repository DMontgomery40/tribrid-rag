import { useConfig } from '../../hooks/useConfig';
import { useEmbeddingModels } from '../../hooks/useModels';

export function ModelPicker() {
  const { config, updateEmbedding } = useConfig();
  const { models, loading, error, providers, getModelsForProvider } = useEmbeddingModels();

  // Get current config values with safe defaults
  const currentProvider = config?.embedding?.embedding_type || 'openai';
  const currentModel = config?.embedding?.embedding_model || '';

  const handleProviderChange = async (newProvider: string) => {
    // Get first model from new provider as default
    const providerModels = getModelsForProvider(newProvider);
    const defaultModel = providerModels[0]?.model || '';
    await updateEmbedding({
      embedding_type: newProvider,
      embedding_model: defaultModel
    });
  };

  const handleModelChange = async (newModel: string) => {
    await updateEmbedding({ embedding_model: newModel });
  };

  // Get models for current provider
  const currentProviderModels = getModelsForProvider(currentProvider);

  if (loading) {
    return (
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow" data-testid="model-picker">
        <h4 className="font-medium mb-4">Embedding Model</h4>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow" data-testid="model-picker">
        <h4 className="font-medium mb-4">Embedding Model</h4>
        <div className="text-red-500 text-sm" data-testid="model-picker-error">
          Error loading models: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow" data-testid="model-picker">
      <h4 className="font-medium mb-4">Embedding Model</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Provider</label>
          <select
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            value={currentProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            data-testid="model-picker-provider"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            value={currentModel}
            onChange={(e) => handleModelChange(e.target.value)}
            data-testid="model-picker-model"
          >
            {currentProviderModels.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model} {m.dimensions ? `(${m.dimensions}d)` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {models.length} embedding models available from {providers.length} providers
        </div>
      </div>
    </div>
  );
}
