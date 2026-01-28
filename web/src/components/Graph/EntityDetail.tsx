import { useGraph } from '../../hooks/useGraph';
import type { Entity } from '../../types/generated';

interface EntityDetailProps {
  entity: Entity;
}

export function EntityDetail({ entity }: EntityDetailProps) {
  const { relationships } = useGraph();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-lg">{entity.name}</h4>
        <p className="text-sm text-gray-500">{entity.entity_type}</p>
      </div>

      {entity.description && (
        <div>
          <h5 className="text-sm font-medium mb-1">Description</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {entity.description}
          </p>
        </div>
      )}

      {entity.file_path && (
        <div>
          <h5 className="text-sm font-medium mb-1">File</h5>
          <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
            {entity.file_path}
          </code>
        </div>
      )}

      {relationships.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2">Relationships ({relationships.length})</h5>
          <ul className="space-y-1 text-sm">
            {relationships.map((rel, i) => (
              <li key={i} className="text-gray-600 dark:text-gray-400">
                {rel.relation_type} → {rel.target_id}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(entity.properties).length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-1">Properties</h5>
          <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
            {JSON.stringify(entity.properties, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
