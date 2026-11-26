// POC-U1 (CR-02, ADR-036): máy chủ tĩnh tối giản để thử bản build Unity Web cục bộ (chỉ 127.0.0.1).
// Dùng: node prototypes/unity-baseline-a56/serve.mjs <thư mục build> [cổng]
// Không gửi Content-Encoding: loader Unity tự giải nén (decompression fallback bật), giống máy chủ không cấu hình.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 18090);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.wasm': 'application/wasm',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const size = statSync(file).size;
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': size });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`serve ${port}`));
