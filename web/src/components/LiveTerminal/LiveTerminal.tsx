import { useState, useRef, useEffect } from 'react';
import './LiveTerminal.css';

export function LiveTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const [container, setContainer] = useState('tribrid-api');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/docker/${container}/logs?lines=100`);
        const data = await res.json();
        setLogs(data);
      } catch {
        setLogs(['Failed to fetch logs']);
      }
    };
    fetchLogs();
  }, [container]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="live-terminal h-full flex flex-col">
      <div className="p-2 bg-gray-800 flex gap-2">
        <select
          className="px-2 py-1 bg-gray-700 text-white text-sm rounded"
          value={container}
          onChange={(e) => setContainer(e.target.value)}
        >
          <option value="tribrid-api">API</option>
          <option value="tribrid-postgres">PostgreSQL</option>
          <option value="tribrid-neo4j">Neo4j</option>
        </select>
      </div>
      <div
        ref={containerRef}
        className="flex-1 bg-black text-green-400 font-mono text-xs p-4 overflow-auto"
      >
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
