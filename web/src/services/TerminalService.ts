import { client } from '../api/client';

export const TerminalService = {
  async getLogs(container: string, lines = 100): Promise<string[]> {
    return client.get(`/docker/${container}/logs?lines=${lines}`);
  },

  async restartContainer(container: string): Promise<void> {
    return client.post(`/docker/${container}/restart`);
  },
};
