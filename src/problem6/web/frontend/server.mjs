import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number.parseInt(process.env.FRONTEND_PORT ?? "5173", 10);
const rootDir = process.cwd();
const baseUrl = process.env.BASE_URL?.trim() || "http://localhost:4000";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function safePath(urlPath) {
  const withoutQuery = urlPath.split("?")[0];
  const normalized = normalize(withoutQuery).replace(/^(\.\.[/\\])+/, "");
  if (normalized === "/" || normalized === "") {
    return "index.html";
  }
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

createServer(async (req, res) => {
  const path = safePath(req.url || "/");

  if (path === "config.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end(`window.APP_CONFIG = { BASE_URL: ${JSON.stringify(baseUrl)} };`);
    return;
  }

  try {
    const filePath = join(rootDir, path);
    const body = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    res.end(body);
  } catch (_err) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Frontend running at http://localhost:${port}`);
  console.log(`Frontend BASE_URL: ${baseUrl}`);
});
