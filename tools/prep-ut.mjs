// prep-ut.mjs — Undertale preprocessor run (safe pattern from prep-one.mjs).
// Stages the Undertale Steam install, targets 3DS, outputs to ./out-ut/apps/UNDERTALE
// Log capped to 200KB. Peak RAM = whole Undertale dir (~600MB x2) — fine, single run.
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const GAME_ROOT = process.env.GAME_ROOT || '/home/ryzen/.local/share/Steam/steamapps/common/UNDERTALE';
if (!fs.existsSync(GAME_ROOT)) { console.error('missing: ' + GAME_ROOT); process.exit(1); }

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

// cfg: use the undertale profiles (bc16/bc17), target 3DS, single game (no chapters)
let cfg = fs.readFileSync('assets/wasm/deltarune-ch1-game-profiles.cfg', 'utf8');
// strip deltarune chapter profile (its chapter_dir pattern won't match anyway, but keep it clean)
cfg = cfg.split('[profile]')[0] + cfg.split('[profile]').slice(1).filter(b => b.includes('undertale')).map(b => '[profile]' + b).join('');
if (process.env.CFG_OVERRIDE) cfg = fs.readFileSync(process.env.CFG_OVERRIDE, 'utf8');

const entries = [];
(function walk(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p, r); continue; }
    const lower = name.toLowerCase();
    if (/\.(dll|exe)$/.test(lower) || /^file\d/.test(lower)) continue;
    entries.push({ path: r, bytes: fs.readFileSync(p) });
  }
})(GAME_ROOT, '');
const totalIn = entries.reduce((a, e) => a + e.bytes.length, 0);
console.log(`[ut] input files: ${entries.length}  bytes: ${(totalIn / 1048576).toFixed(1)} MB`);

const logLines = [];
let dropped = 0;
const capLog = (tag) => (t) => {
  logLines.push(`[${tag}] ${t}`);
  if (logLines.length > 3000) { logLines.splice(0, 1500); dropped += 1500; }
};
const mod = await factory({
  locateFile: (p) => path.join(wasmDir, p),
  print: capLog('out'),
  printErr: capLog('err'),
  getPreloadedPackage: (n, s) => (n.includes('.data') ? dataBytes.buffer.slice(0, s) : null),
  instantiateWasm: (imports, ok) => {
    WebAssembly.instantiate(wasmBytes, imports).then((r) => ok(r.instance, r.module));
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
  const dir = path.dirname(e.path);
  if (dir !== '.') ensureDir('/work/game/' + dir);
  FS.writeFile('/work/game/' + e.path, e.bytes);
}
console.log('FS staged, calling main (target 3ds)...');
if (process.env.STAGE_ONLY) process.exit(0);
const rc = mod.callMain(['/work/game', '/out/apps/UNDERTALE', '--target', '3ds']);
console.log('callMain rc =', rc);

const kept = logLines.join('\n').slice(-200_000);
fs.writeFileSync('prep-ut.log', (dropped ? `... ${dropped} lines dropped ...\n` : '') + kept);
console.log(`log: prep-ut.log (${kept.length} bytes kept, ${dropped} dropped)`);

const files = [];
(function collect(root, rel) {
  for (const name of FS.readdir(root)) {
    if (name === '.' || name === '..') continue;
    const p = root + '/' + name;
    const st = FS.stat(p);
    if (FS.isDir(st.mode)) collect(p, rel ? rel + '/' + name : name);
    else files.push({ name: rel ? rel + '/' + name : name, size: st.size });
  }
})('/out', '');
console.log(`OUTPUT FILES: ${files.length}  total: ${(files.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(1)} MB`);
fs.mkdirSync('out-ut', { recursive: true });
(function extract(root, rel) {
  for (const name of FS.readdir(root)) {
    if (name === '.' || name === '..') continue;
    const p = root + '/' + name;
    const st = FS.stat(p);
    if (FS.isDir(st.mode)) { extract(p, rel ? rel + '/' + name : name); continue; }
    const dst = path.join('out-ut', rel ? rel + '/' + name : name);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, FS.readFile(p));
  }
})('/out', '');
console.log('extracted to out-ut/');