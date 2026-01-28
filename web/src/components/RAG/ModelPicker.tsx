import { useConfig } from '../../hooks/useConfig';

const EMBEDDING_MODELS = {
  openai: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
  voyage: ['voyage-2', 'voyage-code-2', 'voyage-large-2'],
  local: ['all-MiniLM-L6-v2', 'all-mpnet-base-v2'],
};

export function ModelPicker() {
  const { config, updateEmbedding } = useConfig();
  const provider = config?.embedding.provider || 'openai';
  const model = config?.embedding.model || '';

  const handleProviderChange = async (newProvider: 'openai' | 'voyage' | 'local') => {
    const defaultModel = EMBEDDING_MODELS[newProvider][0];
    await updateEmbedding({ provider: newProvider, model: defaultModel });
  };

  const handleModelChange = async (newModel: string) => {
    await updateEmbedding({ model: newModel });
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Embedding Model</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Provider</label>
          <select
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as any)}
          >
            <option value="openai">OpenAI</option>
            <option value="voyage">Voyage</option>
            <option value="local">Local</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {EMBEDDING_MODELS[provider].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
