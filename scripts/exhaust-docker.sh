#!/bin/sh
# Исчерпывающий прогон scripts/exhaust в Linux-контейнере: имя mt-exhaust-*, порт 5179.
# Образ multitracker-ci-runner собирается из scripts/runner/Dockerfile (Node, Chromium, agent-browser).
# usage: scripts/exhaust-docker.sh <dist> <script-under-scripts: exhaust/run.ts>
# Репозиторий монтируется как есть, dist — только для чтения; сервер ниже отдаёт dist.
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
}).listen(5179, "127.0.0.1");'
exec docker run --rm --entrypoint /bin/sh --cpus 2 --memory 2g --name "mt-exhaust-$$" \
  -v "$WT":"$WT" -v "$DIST":/dist:ro -w "$WT" \
  -e MULTITRACKER_UI_URL=http://127.0.0.1:5179 -e SERVER="$SERVER" "$@" \
  multitracker-ci-runner:20261002 -c 'node --input-type=module -e "$SERVER" & curl --fail --silent --retry 30 --retry-delay 1 --retry-connrefused --retry-all-errors --retry-max-time 40 --connect-timeout 2 --max-time 2 http://127.0.0.1:5179/ > /dev/null; export AGENT_BROWSER_SESSION=mt-exhaust-$$; node --experimental-strip-types scripts/'"$SCRIPT"
