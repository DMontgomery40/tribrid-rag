import { useRepoStore } from '../../stores';

interface RepoSelectorProps {
  value: string | null;
  onChange: (repoId: string) => void;
}

export function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const repos = useRepoStore((s) => s.repos);

  return (
    <select
      className="tribrid-select px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-800 dark:border-gray-600"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select repository
      </option>
      {repos.map((repo) => (
        <option key={repo.repo_id} value={repo.repo_id}>
          {repo.name}
        </option>
      ))}
    </select>
  );
}
