import type { Response } from "express";

const clients = new Set<Response>();

export function registerSseClient(res: Response): void {
  clients.add(res);
}

export function unregisterSseClient(res: Response): void {
  clients.delete(res);
}

export function broadcastLeaderboard(payload: unknown): void {
  const data = `event: leaderboard.updated\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}
