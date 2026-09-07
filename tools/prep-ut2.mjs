// prep-ut2.mjs — Undertale via the PROVEN wasm preprocessor (bc16 profile, target 3ds).
// Stages: data.win (copy of game.unx) + mus/<all oggs>. Output: out-ut/apps/UNDERTALE
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const UT = '/home/ryzen/.local/share/Steam/steamapps/common/Undertale/assets';
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

// cfg: undertale profiles only (bc16 + bc17), target decided by callMain arg
let cfg = fs.readFileSync('assets/wasm/deltarune-ch1-game-profiles.cfg', 'utf8');
const blocks = cfg.split('[profile]').filter(b => b.trim());
const utBlocks = blocks.filter(b => b.includes('undertale'));
cfg = utBlocks.map(b => '[profile]' + b).join('\n');
fs.writeFileSync('/tmp/ut-profiles.cfg', cfg);
console.log('cfg blocks:', utBlocks.length);

const dataWin = fs.readFileSync(path.join(UT, 'game.unx'));
const oggs = fs.readdirSync(UT).filter(f => f.endsWith('.ogg'));
console.log(`[ut] data.win=${(dataWin.length/1048576).toFixed(1)}MB oggs=${oggs.length}`);

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
ensureDir('/work/game'); ensureDir('/work/game/mus');
FS.writeFile('/work/game/data.win', dataWin);
for (const f of oggs) FS.writeFile('/work/game/mus/' + f, fs.readFileSync(path.join(UT, f)));
console.log('FS staged, calling main (target 3ds)...');
const rc = mod.callMain(['/work/game/data.win', '/out/apps/UNDERTALE', '--target', '3ds']);
console.log('callMain rc =', rc);

const kept = logLines.join('\n').slice(-200_000);
fs.writeFileSync('prep-ut-wasm.log', (dropped ? `... ${dropped} lines dropped ...\n` : '') + kept);
console.log(`log: prep-ut-wasm.log (${kept.length} bytes kept, ${dropped} dropped)`);

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
for (const f of files.slice(0, 12)) console.log('  ', f.name, (f.size / 1024).toFixed(0) + 'KB');
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