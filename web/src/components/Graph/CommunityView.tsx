import { useGraph } from '../../hooks/useGraph';
import { useEffect } from 'react';

export function CommunityView({ repoId }: { repoId: string }) {
  const { communities, fetchCommunities, loading } = useGraph();

  useEffect(() => {
    fetchCommunities();
  }, [repoId, fetchCommunities]);

  if (loading) {
    return <p className="text-gray-500">Loading communities...</p>;
  }

  if (communities.length === 0) {
    return <p className="text-gray-500">No communities detected</p>;
  }

  return (
    <div className="space-y-2">
      {communities.map((community) => (
        <div
          key={community.community_id}
          className="tribrid-card p-3 bg-white dark:bg-gray-800 rounded-lg shadow"
        >
          <div className="font-medium">{community.name}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {community.summary}
          </p>
          <div className="text-xs text-gray-500 mt-2">
            {community.member_ids.length} members | Level {community.level}
          </div>
        </div>
      ))}
    </div>
  );
}
