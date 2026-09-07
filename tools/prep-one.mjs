// prep-one.mjs — LIGHT per-chapter preprocessor run (safe pattern from prep-ch5.mjs)
// Usage:   node prep-one.mjs <N>          e.g. node prep-one.mjs 4
//          GAME_ROOT=/path/to/DELTARUNE node prep-one.mjs 3   (override source, e.g. Ventoy copy)
//
// WHY THIS EXISTS: prep-all.mjs is a memory bomb — it loads all 5 chapters (~1.1GB)
// into a Node array AND copies them again into the wasm in-memory FS (~2.2GB+ staged),
// then emits a 5.6MB log. It OOM-killed a 32GB machine, and the log killed 3 agent
// sessions that read it. NEVER run prep-all.mjs again; run this once per chapter.
//
// Stages ONLY: GAME_ROOT/data.win + GAME_ROOT/chapterN_windows/**  (matches prep-ch5.mjs)
// cfg: chapter_min=chapter_max=N so only that chapter is processed.
// Output: ./out-chN/apps/DELTARUNE/**   Log: ./prep-chN.log (capped to last 200KB)
// Peak RAM ~ (root data.win + one chapter) staged twice ≈ well under 1GB.

import fs from 'fs';
import path from 'path';
import vm from 'vm';

// ---- args
const chNum = parseInt(process.argv[2], 10);
if (!chNum || chNum < 1 || chNum > 5) {
  console.error('usage: node prep-one.mjs <chapter 1-5>   (optional env: GAME_ROOT)');
  process.exit(1);
}
const GAME_ROOT = process.env.GAME_ROOT ||
  '/home/ryzen/.local/share/Steam/steamapps/common/DELTARUNE';
const CH_DIR_NAME = `chapter${chNum}_windows`;
const chapterDir = path.join(GAME_ROOT, CH_DIR_NAME);
const rootDataWin = path.join(GAME_ROOT, 'data.win');
if (!fs.existsSync(chapterDir)) { console.error('missing: ' + chapterDir); process.exit(1); }
if (!fs.existsSync(rootDataWin)) { console.error('missing: ' + rootDataWin); process.exit(1); }

// ---- wasm module (same sandbox as prep-ch5.mjs / run-preproc.mjs)
const wasmDir = path.resolve('assets/wasm/');
const loaderSrc = fs.readFileSync(path.join(wasmDir, '3ds-preprocess.js'), 'utf8');
const sandbox = { console, process, URL, TextEncoder, TextDecoder, Uint8Array };
sandbox.globalThis = sandbox;
sandbox.window = undefined;
sandbox.location = undefined;
sandbox.fetch = async () => { throw new Error('no network in sandbox'); };
const ctx = vm.createContext(sandbox);
vm.runInContext(loaderSrc, ctx);
const factory = ctx.createN3DSPreprocessModule;
const wasmBytes = fs.readFileSync(path.join(wasmDir, '3ds-preprocess.wasm'));
const dataBytes = fs.readFileSync(path.join(wasmDir, '3ds-preprocess.data'));

// ---- profile cfg pinned to THIS chapter
let cfg = fs.readFileSync('assets/wasm/deltarune-ch1-game-profiles.cfg', 'utf8');
cfg = cfg.replace(/chapter_min=\d+/, `chapter_min=${chNum}`);
cfg = cfg.replace(/chapter_max=\d+/, `chapter_max=${chNum}`);

// ---- stage root data.win + this chapter only
const entries = [];
function walk(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    const st = fs.statSync(p);
    if (st.isDirectory()) { entries.push({ path: r + '/.keep', bytes: new Uint8Array(0), dirOnly: true }); continue; }
    const lower = name.toLowerCase();
    if (/\.(dll|exe)$/.test(lower) || /^file\d+/.test(lower)) continue;
    entries.push({ path: r, bytes: fs.readFileSync(p) });
  }
}
entries.push({ path: 'data.win', bytes: fs.readFileSync(rootDataWin) });
walk(chapterDir, CH_DIR_NAME);
const totalIn = entries.reduce((a, e) => a + e.bytes.length, 0);
console.log(`[ch${chNum}] input files: ${entries.length}  bytes: ${(totalIn / 1048576).toFixed(1)} MB`);

// ---- log flood guard: the old run's 5.6MB/47k-line log killed agent sessions.
// Keep only the tail in RAM; write at most 200KB to disk; stdout stays tiny.
const logLines = [];
let droppedLines = 0;
const capLog = (tag) => (t) => {
  logLines.push(`[${tag}] ${t}`);
  if (logLines.length > 3000) { logLines.splice(0, 1500); droppedLines += 1500; }
};
const mod = await factory({
  locateFile: (p) => path.join(wasmDir, p),
  print: capLog('out'),
  printErr: capLog('err'),
  getPreloadedPackage: (name, size) => (name.includes('.data') ? dataBytes.buffer.slice(0, size) : null),
  instantiateWasm: (imports, ok) => {
    WebAssembly.instantiate(wasmBytes, imports).then((res) => ok(res.instance, res.module));
    return {};
  },
});
console.log('module ready');

const FS = mod.FS;
function ensureDir(p) {
  let cur = '';
  for (const part of p.split('/').filter(Boolean)) { cur += '/' + part; try { FS.mkdir(cur); } catch (e) {} }
}
ensureDir('/work'); ensureDir('/out');
FS.writeFile('/game_profiles.cfg', cfg);
ensureDir('/work/game');
for (const e of entries) {
  if (e.path.endsWith('/.keep')) { ensureDir('/work/game/' + e.path.slice(0, -6)); continue; }
  const dir = path.dirname(e.path);
  if (dir !== '.') ensureDir('/work/game/' + dir);
  FS.writeFile('/work/game/' + e.path, e.bytes);
}
console.log('FS staged' + (process.env.STAGE_ONLY ? ' (STAGE_ONLY — stopping before callMain)' : '') + ', calling main...');
if (process.env.STAGE_ONLY) {
  let n = 0, bytes = 0;
  (function cnt(root) {
    for (const name of FS.readdir(root)) {
      if (name === '.' || name === '..') continue;
      const p = root + '/' + name;
      const st = FS.stat(p);
      if (FS.isDir(st.mode)) cnt(p); else { n++; bytes += st.size; }
    }
  })('/work/game');
  console.log(`stage check: ${n} files staged, ${(bytes / 1048576).toFixed(1)} MB total`);
  process.exit(0);
}
const rc = mod.callMain(['/work/game', '/out/apps/DELTARUNE', '--target', 'wii']);
console.log('callMain rc =', rc);

// ---- capped log to disk
const kept = logLines.join('\n').slice(-200_000);
fs.writeFileSync(`prep-ch${chNum}.log`,
  (droppedLines ? `... ${droppedLines} earlier log lines dropped ...\n` : '') + kept);
console.log(`log: prep-ch${chNum}.log (${kept.length} bytes kept, ${droppedLines} lines dropped)`);

// ---- extract output tree to real disk (file-by-file out of the wasm FS)
function collect(root, rel, out) {
  for (const name of FS.readdir(root)) {
    if (name === '.' || name === '..') continue;
    const p = root + '/' + name;
    const st = FS.stat(p);
    if (FS.isDir(st.mode)) collect(p, rel ? rel + '/' + name : name, out);
    else out.push({ name: rel ? rel + '/' + name : name, size: st.size });
  }
}
const files = [];
collect('/out', '', files);
const totalOut = files.reduce((a, f) => a + f.size, 0);
console.log(`OUTPUT FILES: ${files.length}  total: ${(totalOut / 1048576).toFixed(1)} MB`);

const outName = `out-ch${chNum}`;
fs.mkdirSync(outName, { recursive: true });
function extractDir(root, rel) {
  for (const name of FS.readdir(root)) {
    if (name === '.' || name === '..') continue;
    const p = root + '/' + name;
    const st = FS.stat(p);
    if (FS.isDir(st.mode)) { extractDir(p, rel ? rel + '/' + name : name); continue; }
    const dst = path.join(outName, rel ? rel + '/' + name : name);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, FS.readFile(p));
  }
}
extractDir('/out', '');
console.log(`extracted to ./${outName}`);