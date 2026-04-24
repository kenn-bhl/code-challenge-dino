const clients = new Set();
export function registerSseClient(res) {
    clients.add(res);
}
export function unregisterSseClient(res) {
    clients.delete(res);
}
export function broadcastLeaderboard(payload) {
    const data = `event: leaderboard.updated\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
        client.write(data);
    }
}
//# sourceMappingURL=hub.js.map