import { useRepoStore } from '../../stores';

export function PathsSubtab() {
  const repos = useRepoStore((s) => s.repos);

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Repository Paths</h4>
      {repos.length === 0 ? (
        <p className="text-gray-500">No repositories configured</p>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) => (
            <div
              key={repo.repo_id}
              className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              <div className="font-medium">{repo.name}</div>
              <code className="text-sm text-gray-500 block mt-1">{repo.path}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
