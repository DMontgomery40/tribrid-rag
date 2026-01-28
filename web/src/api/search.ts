import { client } from './client';
import type { SearchRequest, SearchResponse, AnswerRequest, AnswerResponse } from '../types/generated';

export const search = (request: SearchRequest) =>
  client.post<SearchResponse>('/search', request);

export const answer = (request: AnswerRequest) =>
  client.post<AnswerResponse>('/answer', request);

export const answerStream = (request: AnswerRequest, onChunk: (chunk: string) => void) =>
  client.stream('/answer/stream', request, onChunk);
