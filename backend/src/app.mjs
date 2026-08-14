import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SearchService } from "./services/search-service.mjs";
import { validateSearchRequest } from "./jobs/core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(root, "frontend");
const service = new SearchService();
const tasks = new Map();
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) { chunks.push(chunk); if (Buffer.concat(chunks).length > 20_000) throw new Error("请求过大"); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function startTask(input) {
  const id = randomUUID();
  const task = { id, status: "queued", progress: [], createdAt: new Date().toISOString() };
  tasks.set(id, task);
  queueMicrotask(async () => {
    task.status = "running";
    try {
      const result = await service.search(input, (event) => task.progress.push({ ...event, at: new Date().toISOString() }));
      task.result = result;
      task.status = result.sources.some((source) => source.state === "failed") ? "partial" : "completed";
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
    } finally { task.completedAt = new Date().toISOString(); }
  });
  return task;
}

async function serveFile(response, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = path.resolve(frontendRoot, relative);
  if (!target.startsWith(`${frontendRoot}${path.sep}`) && target !== path.join(frontendRoot, "index.html")) return json(response, 403, { error: "禁止访问" });
  try {
    const body = await readFile(target);
    response.writeHead(200, { "content-type": contentTypes[path.extname(target)] || "application/octet-stream" });
    response.end(body);
  } catch { json(response, 404, { error: "未找到资源" }); }
}

export function createApp() {
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    try {
      if (request.method === "GET" && url.pathname === "/api/health") return json(response, 200, { status: "ok", anySearchConfigured: Boolean(process.env.ANYSEARCH_CLI) });
      if (request.method === "POST" && url.pathname === "/api/searches") {
        const input = await readBody(request);
        validateSearchRequest(input);
        return json(response, 202, { taskId: startTask(input).id });
      }
      const match = url.pathname.match(/^\/api\/searches\/([\w-]+)$/);
      if (request.method === "GET" && match) {
        const task = tasks.get(match[1]);
        return task ? json(response, 200, task) : json(response, 404, { error: "查询任务不存在或已过期" });
      }
      if (url.pathname.startsWith("/api/")) return json(response, 404, { error: "未找到 API" });
      return serveFile(response, url.pathname);
    } catch (error) { return json(response, 400, { error: error.message || "请求处理失败" }); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createApp().listen(port, "127.0.0.1", () => console.log(`OpenWork 已启动：http://127.0.0.1:${port}`));
}
