import { client } from './client';
import type { ChatRequest, ChatResponse, Message } from '../types/generated';

export const send = (request: ChatRequest) =>
  client.post<ChatResponse>('/chat', request);

export const stream = (request: ChatRequest, onChunk: (chunk: string) => void) =>
  client.stream('/chat/stream', request, onChunk);

export const getHistory = (conversationId: string) =>
  client.get<Message[]>(`/chat/history/${conversationId}`);

export const clearHistory = (conversationId: string) =>
  client.delete(`/chat/history/${conversationId}`);
