#!/bin/sh
# Запускает проверку из scripts/ в Linux-контейнере: на macOS Chrome 154 Escape даёт тысячи keydown.
# Образ — multitracker-ci-runner, собирается из scripts/runner/Dockerfile:
# Node из .nvmrc, Chromium, agent-browser 0.38.1 запечены.
# usage: scripts/ui-docker.sh <dist> <script: check-ui.ts|ui-smoke.ts> [extra docker env...]
# Репозиторий монтируется как есть, dist — только для чтения; dist отдаёт короткий сервер ниже.
# (Сервер встроен сюда, а не лежит .ts-файлом: правило security/detect-non-literal-fs-filename
# запрещает чтение файла по вычисляемому пути в проверяемом коде.)
DIST=$(cd "$1" && pwd); SCRIPT=$2; shift 2
WT=$(cd "$(dirname "$0")/.." && pwd)
SERVER='import http from "node:http"; import { readFile } from "node:fs/promises"; import { extname, resolve } from "node:path";
const root = resolve("/dist"); const t = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const p = new URL(req.url, "http://x").pathname; const f = resolve(root, "." + (p === "/" ? "/index.html" : p));
  if (!f.startsWith(root + "/")) return res.writeHead(403).end();
  try { const d = await readFile(f); res.writeHead(200, { "Content-Type": t[extname(f)] ?? "application/octet-stream", "Cache-Control": "no-store" }); res.end(d); } catch { res.writeHead(404).end(); }
}).listen(4180, "127.0.0.1");'
exec docker run --rm --entrypoint /bin/sh --cpus 2 --memory 2g \
  -v "$WT":"$WT" -v "$DIST":/dist:ro -w "$WT" \
  -e MULTITRACKER_UI_URL=http://127.0.0.1:4180 -e SERVER="$SERVER" "$@" \
  multitracker-ci-runner:20261002 -c 'node --input-type=module -e "$SERVER" & sleep 1; export AGENT_BROWSER_SESSION=ui-$$; node --experimental-strip-types scripts/'"$SCRIPT"
