import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export function createCiBundle(repository, sha) {
  const files = {};
  let total = 0;
  function visit(directory, prefix = '') {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.isSymbolicLink() || item.name.startsWith('.')) throw new Error('Unexpected private file or symlink in build');
      const file = prefix + item.name;
      if (item.isDirectory()) visit(path.join(directory, item.name), file + '/');
      else if (item.isFile()) {
        const content = fs.readFileSync(path.join(directory, item.name));
        total += content.length;
        if (total > 256 * 1024 * 1024 || Object.keys(files).length >= 2500) throw new Error('CI build exceeds limit');
        files[file] = content.toString('base64');
      } else throw new Error('Unexpected build file');
    }
  }
  visit('dist');
  if (!files['index.html']) throw new Error('Missing build entry point');
  const archive = gzipSync(JSON.stringify({ schema: 1, repository, sha, profile: 'production', files,
    headers: JSON.parse(fs.readFileSync('vercel.json', 'utf8')) }));
  if (archive.length > 64 * 1024 * 1024) throw new Error('Compressed CI build exceeds limit');
  return { archive, build: { schema: 1, digest: createHash('sha256').update(archive).digest('hex'), bytes: archive.length, profile: 'production' } };
}
