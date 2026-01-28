import { useEffect } from 'react';
import { useGraph } from '../../hooks/useGraph';
import { EntityDetail } from './EntityDetail';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface GraphExplorerProps {
  repoId: string;
  initialEntityId?: string;
}

export function GraphExplorer({ repoId, initialEntityId }: GraphExplorerProps) {
  const { entities, selectedEntity, loading, fetchEntities, selectEntity } = useGraph();

  useEffect(() => {
    fetchEntities();
    if (initialEntityId) {
      selectEntity(initialEntityId);
    }
  }, [repoId, fetchEntities, initialEntityId, selectEntity]);

  if (loading && entities.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <div className="lg:col-span-2 tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-4">Entities ({entities.length})</h4>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {entities.map((entity) => (
            <button
              key={entity.entity_id}
              className={`w-full text-left p-2 rounded ${
                selectedEntity?.entity_id === entity.entity_id
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => selectEntity(entity.entity_id)}
            >
              <div className="font-medium text-sm">{entity.name}</div>
              <div className="text-xs text-gray-500">{entity.entity_type}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        {selectedEntity ? (
          <EntityDetail entity={selectedEntity} />
        ) : (
          <p className="text-gray-500">Select an entity to view details</p>
        )}
      </div>
    </div>
  );
}
