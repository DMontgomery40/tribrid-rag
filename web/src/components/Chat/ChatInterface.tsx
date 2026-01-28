import { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/Button';
import type { Message, ChunkMatch } from '../../types/generated';

interface ChatInterfaceProps {
  repoId: string;
  conversationId?: string;
}

export function ChatInterface({ repoId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<ChunkMatch[]>([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, repo_id: repoId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setSources(data.sources);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {sources.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-2">Sources</h4>
          <div className="space-y-1 text-xs">
            {sources.slice(0, 5).map((s) => (
              <div key={s.chunk_id} className="text-gray-500">
                {s.file_path}:{s.start_line}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
          placeholder="Ask about the codebase..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <Button onClick={sendMessage} loading={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
