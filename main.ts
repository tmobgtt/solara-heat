// Solara Heat — the hand-in program (Node 22, standard library only).
// It copies game/ and screenshots/ from beside this file to the output
// directory and writes dossier.json there: the summary the judge reads,
// in the makefun/dossier/v1 shape — a Game block (source, vendored and
// asset counts and totals), then the sources in load order, then the
// screenshots as base64, all as canonical JSON. The caps below are the
// scorer's own: only text_max_bytes shapes the bytes; the others refuse
// an entry the scorer would refuse.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const SOURCE_EXTENSIONS = ['html', 'js', 'mjs', 'css', 'glsl', 'vert', 'frag', 'wgsl', 'json'];
const SOURCE_NAME = new RegExp('\\.(' + SOURCE_EXTENSIONS.join('|') + ')$', 'i');
const GENERATED_NAME = /\.min\.(js|mjs|css)$/i;
const MODULE_NAME = /\.(js|mjs)$/i;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byteLength = (s) => Buffer.byteLength(s, 'utf8');
const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

function classifyGamePath(path) {
  const segs = path.split('/');
  const base = segs[segs.length - 1];
  const dirs = segs.slice(0, -1);
  if (dirs.includes('vendor') || GENERATED_NAME.test(base)) return 'vendored';
  return SOURCE_NAME.test(base) ? 'source' : 'asset';
}

function lineCount(bytes) {
  if (bytes.length === 0) return 0;
  let n = 0;
  for (const b of bytes) if (b === 0x0a) n++;
  return bytes[bytes.length - 1] === 0x0a ? n : n + 1;
}

function fenceFor(body) {
  let longest = 0;
  for (const run of body.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return '`'.repeat(Math.max(3, longest + 1));
}

function languageOf(path) {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1]?.toLowerCase() ?? '';
  if (ext === 'mjs' || ext === 'js') return 'js';
  if (ext === 'glsl' || ext === 'vert' || ext === 'frag') return 'glsl';
  if (ext === 'wgsl') return 'wgsl';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'json') return 'json';
  return 'text';
}

// Every file and directory under game/, with sizes and classes.
function readGameTree(gameDir) {
  const files = [];
  const directories = [];
  const stack = [''];
  let count = 0;
  let totalBytes = 0;
  while (stack.length > 0) {
    const rel = stack.pop();
    const entries = readdirSync(rel === '' ? gameDir : join(gameDir, rel), { withFileTypes: true });
    for (const e of entries) {
      const path = rel === '' ? e.name : rel + '/' + e.name;
      if (byteLength(path) > CAPS.game_path_max_bytes) throw new Error('game/' + path + ': path too long');
      const st = lstatSync(join(gameDir, path));
      count++;
      if (count > CAPS.game_max_files) throw new Error('game/: too many entries');
      if (st.isDirectory()) {
        directories.push(path);
        stack.push(path);
      } else if (st.isFile()) {
        totalBytes += st.size;
        if (totalBytes > CAPS.game_max_bytes) throw new Error('game/: too many bytes');
        files.push({ path, bytes: st.size, cls: classifyGamePath(path) });
      } else {
        throw new Error('game/' + path + ': not a plain file');
      }
    }
  }
  files.sort((a, b) => byCodeUnit(a.path, b.path));
  directories.sort(byCodeUnit);
  return { files, directories, count, totalBytes };
}

// A module's static import and export-from specifiers, in source order.
// A plain scan is enough here: this game's own modules import at the top
// of the file in simple `import ... from './x.js'` lines.
function sourceImports(text) {
  const found = [];
  const pattern = /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|\bexport\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = pattern.exec(text)) !== null) found.push(m[1] ?? m[2]);
  return found;
}

function resolveRelative(spec, from) {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;
  const parts = from.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.length === 0 ? null : parts.join('/');
}

// The source JS files in the order the page loads them: index.html's
// module script first, then a depth-first walk of its static imports.
function importOrder(sources) {
  const byPath = new Map(sources.map((s) => [s.path, s]));
  const order = [];
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path) || !MODULE_NAME.test(path) || !byPath.has(path)) return;
    seen.add(path);
    order.push(path);
    const text = new TextDecoder('utf-8').decode(byPath.get(path).bytes);
    for (const spec of sourceImports(text)) {
      const target = resolveRelative(spec, path);
      if (target !== null) visit(target);
    }
  };
  const html = new TextDecoder('utf-8').decode(byPath.get('index.html').bytes);
  const scriptPattern = /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g;
  let m;
  while ((m = scriptPattern.exec(html)) !== null) {
    const target = resolveRelative(m[1].startsWith('./') ? m[1] : './' + m[1], 'index.html');
    if (target !== null) visit(target);
  }
  return order;
}

function gameBlockLines(tree) {
  const source = tree.files.filter((f) => f.cls === 'source');
  const vendored = tree.files.filter((f) => f.cls === 'vendored');
  const assets = tree.files.filter((f) => f.cls === 'asset');
  const sum = (list) => list.reduce((n, f) => n + f.bytes, 0);
  const lines = [
    '## Game',
    '',
    'Source files: ' + source.length + ' (' + sum(source) + ' bytes)',
    'Vendored files: ' + vendored.length + ' (' + sum(vendored) + ' bytes)',
  ];
  if (vendored.length > 0) {
    const listed = vendored.slice(0, 24).map((f) => 'game/' + f.path + ' (' + f.bytes + ' bytes)');
    const more = vendored.length > 24 ? ', and ' + (vendored.length - 24) + ' more' : '';
    lines.push('  ' + listed.join(', ') + more);
  }
  const byExt = new Map();
  for (const f of assets) {
    const base = f.path.split('/').pop();
    const dot = base.lastIndexOf('.');
    const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '(none)';
    const at = byExt.get(ext) ?? { n: 0, bytes: 0 };
    at.n++;
    at.bytes += f.bytes;
    byExt.set(ext, at);
  }
  const extText = [...byExt]
    .sort((a, b) => byCodeUnit(a[0], b[0]))
    .map(([ext, at]) => ext + ' ' + at.n + ' (' + at.bytes + ' bytes)')
    .join(', ');
  lines.push('Assets: ' + (extText === '' ? 'none' : extText));
  lines.push('Totals: ' + tree.count + ' files and directories (' + tree.totalBytes + ' bytes)');
  return lines;
}

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const o = value;
  return '{' + Object.keys(o).sort(byCodeUnit).map((k) => JSON.stringify(k) + ':' + canonicalJson(o[k])).join(',') + '}';
}

const opensWith = (bytes, magic) => bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b);

// Build the dossier bytes for an entry directory (game/ + screenshots/).
export function buildDossier(dir) {
  const max = CAPS.text_max_bytes;
  const gameDir = join(dir, 'game');
  const tree = readGameTree(gameDir);
  const sources = tree.files
    .filter((f) => f.cls === 'source')
    .map((f) => ({ path: f.path, bytes: new Uint8Array(readFileSync(join(gameDir, f.path))) }));
  const byPath = new Map(sources.map((s) => [s.path, s]));
  if (!byPath.has('index.html')) throw new Error('game/index.html: no such file');
  const ordered = importOrder(sources).filter((p) => p !== 'index.html');
  const seen = new Set(['index.html', ...ordered]);
  const rest = sources.map((s) => s.path).filter((p) => !seen.has(p)).sort(byCodeUnit);
  const order = ['index.html', ...ordered, ...rest];

  const codes = new Map();
  const codeOf = (path) => {
    let code = codes.get(path);
    if (code !== undefined) return code;
    const file = byPath.get(path);
    if (file === undefined) return null;
    const t = new TextDecoder('utf-8').decode(file.bytes);
    const fence = fenceFor(t);
    const block = fence + languageOf(path) + '\n' + t + (t.endsWith('\n') ? '' : '\n') + fence + '\n\n';
    code = { norm: file.bytes, text: t, fence, block, blockBytes: byteLength(block), lines: lineCount(file.bytes) };
    codes.set(path, code);
    return code;
  };

  const shotsDir = join(dir, 'screenshots');
  const shotNames = readdirSync(shotsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort(byCodeUnit);
  if (shotNames.length === 0) throw new Error('screenshots/: holds no image');
  if (shotNames.length > CAPS.screenshots.max) throw new Error('screenshots/: too many images');
  const images = shotNames.map((name) => {
    if (!IMAGE_NAME.test(name)) throw new Error('screenshots/' + name + ': bad name');
    const bytes = new Uint8Array(readFileSync(join(shotsDir, name)));
    if (bytes.length > CAPS.screenshots.max_bytes) throw new Error('screenshots/' + name + ': too many bytes');
    const media_type = opensWith(bytes, PNG_MAGIC) ? 'image/png' : opensWith(bytes, JPEG_MAGIC) ? 'image/jpeg' : null;
    if (media_type === null) throw new Error('screenshots/' + name + ': neither PNG nor JPEG');
    return { name, media_type, sha256: sha256Hex(bytes), base64: Buffer.from(bytes).toString('base64') };
  });

  const head = [...gameBlockLines(tree), '', '## Sources', '', ''].join('\n');
  const sections = order.map((path) => {
    const code = codeOf(path);
    const lines = code === null ? 0 : code.lines;
    const bytes = code === null ? 0 : code.norm.length;
    const heading = '### game/' + path + ' (' + lines + ' ' + (lines === 1 ? 'line' : 'lines') + ', ' + bytes + ' bytes)\n\n';
    const shown = lines === 0 ? null : code;
    return { heading, code: shown, size: byteLength(heading) + (shown === null ? 0 : shown.blockBytes), bytes };
  });
  const restBytes = new Array(sections.length + 1).fill(0);
  for (let k = sections.length - 1; k >= 0; k--) {
    restBytes[k] = restBytes[k + 1] + (k + 1 < sections.length ? sections[k + 1].bytes : 0);
  }
  const cutLine = (files, bytes) =>
    '[Cut at ' + max + ' bytes: ' + files + ' file' + (files === 1 ? '' : 's') + ' and ' + bytes + ' bytes of source left out.]\n';
  let text = head;
  let used = byteLength(head);
  let kept = 0;
  for (; kept < sections.length; kept++) {
    const section = sections[kept];
    const restCount = sections.length - kept - 1;
    const tail = restCount === 0 ? 0 : byteLength(cutLine(restCount, restBytes[kept]));
    if (used + section.size + tail > max) break;
    text += section.code === null ? section.heading : section.heading + section.code.block;
    used += section.size;
  }
  if (kept < sections.length) {
    // This entry is sized so every source fits whole under the cap; a cut
    // would change the dossier's shape, so refuse instead of cutting.
    throw new Error('dossier text would exceed ' + max + ' bytes');
  }
  const doc = { schema: 'makefun/dossier/v1', cover: 0, text: text.replace(/\n+$/, '\n'), images };
  return Buffer.from(canonicalJson(doc), 'utf8');
}

// The hand-in itself: copy game/ and screenshots/ out, then the dossier.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), buildDossier(out));
