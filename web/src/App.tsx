import { useAppInit } from './hooks/useAppInit';
import { useTheme } from './hooks/useTheme';
import { TabBar } from './components/Navigation/TabBar';
import { TabRouter } from './components/Navigation/TabRouter';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { EmbeddingMismatchWarning } from './components/ui/EmbeddingMismatchWarning';
import { RepoSelector } from './components/ui/RepoSelector';
import { useRepoStore } from './stores';

function App() {
  const { initialized, error } = useAppInit();
  useTheme();

  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const setActiveRepo = useRepoStore((s) => s.setActiveRepo);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Failed to initialize</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-2">
            <h1 className="text-lg font-bold">TriBridRAG</h1>
            <RepoSelector value={activeRepoId} onChange={setActiveRepo} />
          </div>
          <TabBar />
        </header>

        <main className="p-0">
          <EmbeddingMismatchWarning />
          <TabRouter />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
