/* ══════════════════════════════════════════════════════════════
   UNDERTALE ON 3DS — archive client
   Reads the user's own data.win locally: header, GEN8, chunk table.
   Nothing is uploaded anywhere. Parsing happens in this tab.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const drop = $('#drop');
  const input = $('#file');
  const report = $('#report');
  const kv = $('#kv');
  const verdict = $('#verdict');

  if (!drop || !input) return;

  /* Undertale 1.x is GameMaker BC16. Room/sprite counts are sanity anchors. */
  const KNOWN = {
    16: { label: 'BC16', note: 'GameMaker Studio 1.x bytecode — the format this runner executes.' },
    17: { label: 'BC17', note: 'GameMaker 2.x bytecode — Deltarune territory; not this runner.' },
  };

  const fmt = (n) => n.toLocaleString('en-US');
  const bytes = (n) => {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  };

  function parseDataWin(buf) {
    const dv = new DataView(buf);
    const out = { size: buf.byteLength, chunks: [], ok: false, problems: [] };
    if (buf.byteLength < 16) { out.problems.push('File is too small to be a data.win.'); return out; }

    const u32 = (o) => dv.getUint32(o, true);
    const u8 = (o) => dv.getUint8(o);
    const printable = (o) => {
      const b = [u8(o), u8(o + 1), u8(o + 2), u8(o + 3)];
      return b.every((c) => c >= 0x20 && c <= 0x7e) ? String.fromCharCode(...b) : null;
    };

    const magic = u32(0);
    out.magicRaw = magic.toString(16).padStart(8, '0');
    if (magic !== 0x4d524f46) { // 'FORM'
      out.problems.push('Missing the FORM header GameMaker files start with.');
      return out;
    }
    out.ok = true;

    // Walk the chunk table. Each entry: 4-char name + u32 size, then payload.
    let p = 8;
    const guard = 4096;
    let n = 0;
    while (p + 8 <= buf.byteLength && n < guard) {
      const nm = printable(p);
      if (!nm) break;
      const sz = u32(p + 4);
      const start = p + 8;
      const fits = sz <= buf.byteLength - start;
      out.chunks.push({ name: nm, size: sz, start, fits });
      if (!fits) break;
      p = start + sz;
      n++;
    }

    // GEN8 holds the running version: bytecodeVersion is byte 1.
    const gen8 = out.chunks.find((c) => c.name === 'GEN8');
    if (gen8) {
      out.gen8Start = gen8.start;
      out.bytecodeVersion = u8(gen8.start + 1);
      const info = KNOWN[out.bytecodeVersion];
      out.bytecodeLabel = info ? info.label : ('BC' + out.bytecodeVersion);
      out.bytecodeNote = info ? info.note : null;
    } else {
      out.problems.push('No GEN8 chunk — not a GameMaker game file.');
    }

    // Counting chunks begin with a u32 count followed by a pointer table.
    const COUNTED = ['GEN8','OPTN','LANG','EXTN','SOUN','SOND','SPRT','BGND','ROOM','TPAG','CODE','VARI','FUNC','STRG','TXTR','AUDO','AGRP','FONT','OBJT'];
    // (SOND is the real chunk name; kept SPACER-free list of ones we can count.)
    out.counts = {};
    for (const c of out.chunks) {
      if (COUNTED.includes(c.name) && c.size >= 4 && c.fits) {
        const v = u32(c.start);
        // A count larger than the chunk could ever describe means it is not one.
        if (v <= (c.size / 4)) out.counts[c.name] = v;
      }
    }
    return out;
  }

  function row(k, v, cls) {
    const tr = document.createElement('tr');
    const a = document.createElement('td'); a.textContent = k;
    const b = document.createElement('td'); b.textContent = v;
    if (cls) b.className = cls;
    tr.append(a, b);
    return tr;
  }

  function render(r, fileName) {
    kv.textContent = '';

    kv.append(row('File', fileName));
    kv.append(row('Size', bytes(r.size) + '  (' + fmt(r.size) + ' bytes)'));
    kv.append(row('Container', r.ok ? 'FORM — GameMaker data container' : 'not recognised (' + (r.magicRaw || '?') + ')'));

    if (r.bytecodeVersion !== undefined) {
      kv.append(row('Bytecode', r.bytecodeLabel + (r.bytecodeNote ? '  — ' + r.bytecodeNote : '')));
    }
    kv.append(row('Chunks found', String(r.chunks.length)));

    const interesting = ['SPRT', 'ROOM', 'OBJT', 'CODE', 'TXTR', 'TPAG', 'BGND', 'FONT', 'SOND', 'AUDO', 'STRG'];
    const pretty = {
      SPRT: 'sprites', ROOM: 'rooms', OBJT: 'objects', CODE: 'code entries',
      TXTR: 'texture pages', TPAG: 'atlas items', BGND: 'backgrounds',
      FONT: 'fonts', SOND: 'sounds', AUDO: 'embedded audio', STRG: 'strings',
    };
    const bits = interesting
      .filter((k) => r.counts[k] !== undefined)
      .map((k) => pretty[k] + ' ' + fmt(r.counts[k]));
    if (bits.length) kv.append(row('Contents', bits.join('  ·  ')));

    verdict.className = 'verdict';
    const say = (cls, text) => { verdict.classList.add(cls); verdict.textContent = text; };

    if (!r.ok) {
      say('bad', '✕ ' + (r.problems[0] || 'This file is not a GameMaker data.win.'));
    } else if (r.bytecodeVersion === 16) {
      say('ok', '✓ BC16 — GameMaker 1.x bytecode, exactly what this runner executes. '
        + 'If this is Undertale, you are good to go: run the patcher and copy the output to your card.');
    } else if (r.bytecodeVersion === 17) {
      say('warn', '⚠ BC17 — that is GameMaker 2.x (Deltarune). The 3DS runner here targets BC16 only.');
    } else if (r.bytecodeVersion !== undefined) {
      say('warn', '⚠ ' + r.bytecodeLabel + ' — this runner is built for BC16 (Undertale 1.x). '
        + 'The patcher will refuse rather than produce a broken card.');
    } else {
      say('bad', '✕ ' + (r.problems[0] || 'Unrecognised file.'));
    }

    // Undertale 1.x sanity anchors, stated only when they match.
    const looksUT = r.bytecodeVersion === 16 && r.counts.SPRT >= 2000 && r.counts.SPRT <= 3200;
    if (looksUT) {
      const p = document.createElement('p');
      p.style.margin = '12px 0 0';
      p.style.color = 'var(--dim)';
      p.style.fontSize = '.88rem';
      p.textContent = 'Signature check: ' + fmt(r.counts.SPRT) + ' sprites and '
        + fmt(r.counts.ROOM) + ' rooms — consistent with Undertale 1.x.';
      verdict.after(p);
    }

    report.hidden = false;
    report.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handle(file) {
    if (!file) return;
    kv.textContent = '';
    verdict.className = 'verdict';
    verdict.textContent = 'Reading ' + file.name + ' …';
    report.hidden = false;

    // Slice off the 10 MB we actually parse; the header and chunk table live at the
    // front, and this keeps a 63 MB file from sitting in memory in a weak browser.
    const head = file.slice(0, Math.min(file.size, 10 * 1024 * 1024));
    const fr = new FileReader();
    fr.onerror = () => render({ size: file.size, chunks: [], ok: false, problems: ['Could not read that file.'] }, file.name);
    fr.onload = () => {
      try {
        render(parseDataWin(fr.result), file.name);
      } catch (e) {
        render({ size: file.size, chunks: [], ok: false, problems: ['Parsing failed: ' + e.message] }, file.name);
      }
    };
    fr.readAsArrayBuffer(head);
  }

  /* ── interactions ────────────────────────────────────────── */
  const browse = $('#browse');
  if (browse) browse.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handle(input.files && input.files[0]));

  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.remove('over');
  }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handle(f);
  });

  const y = $('#year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
