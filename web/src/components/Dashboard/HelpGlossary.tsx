import { useState } from 'react';
import { useTooltipStore } from '../../stores';
import './HelpGlossary.css';

export function HelpGlossary() {
  const [search, setSearch] = useState('');
  const glossary = useTooltipStore((s) => s.glossary);
  const setSearchQuery = useTooltipStore((s) => s.setSearchQuery);
  const filteredGlossary = useTooltipStore((s) => s.filteredGlossary);

  const handleSearch = (query: string) => {
    setSearch(query);
    setSearchQuery(query);
  };

  const items = search ? filteredGlossary : glossary;

  return (
    <div className="help-glossary">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search glossary..."
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">No glossary entries yet</p>
      ) : (
        <dl className="space-y-4">
          {items.map((entry) => (
            <div key={entry.id} className="tribrid-card p-3 bg-white dark:bg-gray-800 rounded">
              <dt className="font-medium">{entry.term}</dt>
              <dd className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {entry.definition}
              </dd>
              {entry.links.length > 0 && (
                <div className="mt-2 text-xs space-x-2">
                  {entry.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
