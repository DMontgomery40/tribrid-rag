import { useGraphStore, useRepoStore } from '../stores';

export function useGraph() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  const entities = useGraphStore((s) => s.entities);
  const relationships = useGraphStore((s) => s.relationships);
  const communities = useGraphStore((s) => s.communities);
  const selectedEntityId = useGraphStore((s) => s.selectedEntityId);
  const stats = useGraphStore((s) => s.stats);
  const loading = useGraphStore((s) => s.loading);

  const fetchEntitiesStore = useGraphStore((s) => s.fetchEntities);
  const fetchRelationshipsStore = useGraphStore((s) => s.fetchRelationships);
  const fetchCommunitiesStore = useGraphStore((s) => s.fetchCommunities);
  const selectEntityStore = useGraphStore((s) => s.selectEntity);
  const executeQueryStore = useGraphStore((s) => s.executeQuery);

  const selectedEntity = entities.find((e) => e.entity_id === selectedEntityId) || null;

  const fetchEntities = async (type?: string) => {
    if (!activeRepoId) return;
    await fetchEntitiesStore(activeRepoId, type);
  };

  const selectEntity = async (entityId: string) => {
    selectEntityStore(entityId);
    await fetchRelationshipsStore(entityId);
  };

  const fetchCommunities = async (level?: number) => {
    if (!activeRepoId) return;
    await fetchCommunitiesStore(activeRepoId, level);
  };

  const executeQuery = async (cypher: string) => {
    return executeQueryStore(cypher);
  };

  return {
    entities,
    relationships,
    communities,
    selectedEntity,
    stats,
    loading,
    fetchEntities,
    selectEntity,
    fetchCommunities,
    executeQuery,
  };
}
