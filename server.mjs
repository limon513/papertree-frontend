// Serves the built site with compression, like Cloudflare does in production.
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import { handler } from './dist/server/entry.mjs';

const CLIENT = fileURLToPath(new URL('./dist/client/', import.meta.url));
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

/** Built files (/_astro/...) never change: browsers may keep them for a year. */
function staticFile(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(CLIENT, path);
  if (!file.startsWith(CLIENT)) return false;
  try {
    if (!statSync(file).isFile()) return false;
  } catch {
    return false;
  }
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  if (path.startsWith('_astro')) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
  createReadStream(file).pipe(res);
  return true;
}

const compress = compression();
http
  .createServer((req, res) => compress(req, res, () => staticFile(req, res) || handler(req, res)))
  .listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => console.log('ready'));
