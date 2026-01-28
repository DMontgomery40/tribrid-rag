const BASE_URL = '/api';

export function useAPI() {
  const get = async <T>(url: string): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const post = async <T>(url: string, data?: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const put = async <T>(url: string, data: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const patch = async <T>(url: string, data: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const del = async (url: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}${url}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
  };

  const stream = async (
    url: string,
    data: unknown,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    const res = await fetch(`${BASE_URL}${url}`, {
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
  };

  return { get, post, put, patch, delete: del, stream };
}
