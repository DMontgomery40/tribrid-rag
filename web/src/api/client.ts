let baseUrl = '/api';

export function setBaseUrl(url: string) {
  baseUrl = url;
}

export const client = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async put<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async patch<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(path: string): Promise<void> {
    const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
  },

  async stream(path: string, data: unknown, onChunk: (chunk: string) => void): Promise<void> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  },
};
