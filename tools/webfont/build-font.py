#!/usr/bin/env python3
"""
Build the U3DS pixel webfont.

Glyph shapes come from THIS PROJECT'S OWN bitmap table (src/n3ds/main.c,
the godmode9-derived 5x10 font) plus a handful of punctuation/symbol glyphs
hand-drawn here in the same 5x10 grid. No third-party font file is copied.
"""
import re, struct, sys, os

SRC = "/home/angus/3ds-build/ut3ds-clone/src/n3ds/main.c"
OUT = "/home/angus/3ds-build/ut3ds-clone/docs/assets/u3ds-pixel.ttf"

CELL_W, CELL_H, PIX = 6, 10, 100
EM, ADV = 1000, CELL_W * PIX
ASC, DESC = 1000, -200

# ── the project's own table ───────────────────────────────────────────────────
text = open(SRC, encoding="utf-8", errors="replace").read()
m = re.search(r"static const uint8_t font\[95\]\[10\]\s*=\s*\{(.*?)\n\s*\};", text, re.S)
if not m:
    print("FAIL: font table not found"); sys.exit(1)
ASCII = []
for r in re.findall(r"\{([^{}]*)\}", m.group(1)):
    vals = [int(v, 16) for v in re.findall(r"0x([0-9A-Fa-f]{1,2})", r)]
    vals += [0] * (10 - len(vals))
    ASCII.append(vals[:10])
assert len(ASCII) == 95, len(ASCII)

# 6 columns; bit 5 = leftmost. Helper to place pixels: c(col) -> mask
def c(*cols):
    m = 0
    for col in cols:
        m |= 1 << (5 - col)
    return m

# ── extra glyphs, drawn here (5x10, row 0 = top) ──────────────────────────────
EXTRA = {
 0x2014: [0,0,0,0,0,0,c(0,1,2,3,4,5),0,0,0],              # em dash
 0x00B7: [0,0,0,0,0,c(2),0,0,0,0],                         # middle dot
 0x00D7: [0,0,0,c(0,4),c(1,3),c(2),c(1,3),c(0,4),0,0],     # multiplication
 0x00A7: [0,c(1,2,3),c(0),c(1,2),c(3,4,5),c(0,4,5),c(1,2,3),0,0,0],  # section
 0x00A9: [0,c(1,2,3),c(0),c(0),c(0),c(2,3),c(1,2,3),0,0,0],          # copyright
 0x2026: [0,0,0,0,0,0,0,0,c(0,2,4),0],                     # ellipsis
 0x2013: [0,0,0,0,0,0,c(0,1,2,3),0,0,0],                   # en dash
 0x2713: [0,0,c(0,4),c(1,3),c(2,2),0,0,0,0,0],             # check (V shape)
 0x2715: [0,0,c(0,4),c(1,3),c(2),c(1,3),c(0,4),0,0,0],     # heavy X
 0x26A0: [c(2),c(1,3),c(0,4),c(1,3),c(0,4),c(2),c(0,4),0,0,0],  # warning
 0x25B6: [0,c(0),c(0,1),c(0,1,2),c(0,1,2,3),c(0,1,2),c(0,1),c(0),0,0],  # right tri
 0x25C0: [0,c(4),c(3,4),c(2,3,4),c(1,2,3,4),c(2,3,4),c(3,4),c(4),0,0],  # left tri
 0x25BC: [c(0,1,2,3,4),c(1,2,3),c(1,2,3),c(2),0,0,0,0,0,0],             # down tri
 0x25B8: [0,0,0,c(1),c(1,2),c(1),0,0,0,0],                              # small right tri
 0x25A4: [0,c(0,1,2,3,4),c(0,4),c(0,1,2,3,4),c(0,4),c(0,1,2,3,4),0,0,0,0],  # square w/ bar
 0x25E7: [0,c(0,1,2,3,4),c(0,1,2),c(0,1,2),c(0,1,2),c(0,1,2,3,4),0,0,0,0],  # half square
 0x2699: [0,c(1,3),c(0,1,2,3,4),c(2),c(0,2,4),c(2),c(0,1,2,3,4),c(1,3),0,0],# gear
}

# ── glyph list: gid = index + 1 ───────────────────────────────────────────────
GLYPHS = []                      # (codepoint, rows)
for i in range(95):
    GLYPHS.append((32 + i, ASCII[i]))
for code in sorted(EXTRA):
    GLYPHS.append((code, EXTRA[code]))
NGLYPHS = len(GLYPHS) + 1        # + .notdef

def bitmap(e):
    return [[bool(e[r] & (1 << (5 - col))) for col in range(CELL_W)] for r in range(CELL_H)]

def rects(grid):
    h, w = len(grid), len(grid[0])
    used = [[False]*w for _ in range(h)]
    out = []
    for r in range(h):
        col = 0
        while col < w:
            if not grid[r][col] or used[r][col]:
                col += 1; continue
            run = 0
            while col+run < w and grid[r][col+run] and not used[r][col+run]:
                run += 1
            hh = 1
            while r+hh < h and all(grid[r+hh][col+k] and not used[r+hh][col+k] for k in range(run)):
                hh += 1
            for rr in range(r, r+hh):
                for cc in range(col, col+run):
                    used[rr][cc] = True
            out.append((col, r, run, hh))
            col += run
    return out

def glyph_bytes(entry):
    rs = rects(bitmap(entry))
    if not rs:
        return b""
    contours = []
    for (col, r, w, h) in rs:
        x = col * PIX
        y = (CELL_H - r - h) * PIX
        W, H = w * PIX, h * PIX
        contours.append([(x, y), (x, y+H), (x+W, y+H), (x+W, y)])   # clockwise, y-up
    xs = [p[0] for cont in contours for p in cont]
    ys = [p[1] for cont in contours for p in cont]
    d = struct.pack(">hhhhh", len(contours), min(xs), min(ys), max(xs), max(ys))
    end = -1
    for cont in contours:
        end += len(cont)
        d += struct.pack(">H", end)
    d += struct.pack(">H", 0)
    for cont in contours:
        d += b"\x01" * len(cont)
    prev = 0                                   # deltas are continuous over the glyph
    for cont in contours:
        for (px, _) in cont:
            d += struct.pack(">h", px - prev); prev = px
    prev = 0
    for cont in contours:
        for (_, py) in cont:
            d += struct.pack(">h", py - prev); prev = py
    return d

def pad4(b): return b + b"\x00" * ((4 - len(b) % 4) % 4)
def checksum(b):
    b = pad4(b)
    return sum(struct.unpack(">%dI" % (len(b)//4), b)) & 0xFFFFFFFF if b else 0

# ── glyf + loca ───────────────────────────────────────────────────────────────
glyf, loca = b"", [0]
for i in range(NGLYPHS):
    gd = b"" if i == 0 else glyph_bytes(GLYPHS[i-1][1])
    if len(gd) % 2:
        gd += b"\x00"
    glyf += gd
    loca.append(len(glyf))
loca_b = b"".join(struct.pack(">H", o//2) for o in loca)

# ── head ──────────────────────────────────────────────────────────────────────
head  = struct.pack(">I", 0x00010000)
head += struct.pack(">I", 0x00010000)
head += struct.pack(">I", 0)
head += struct.pack(">I", 0x5F0F3CF5)
head += struct.pack(">H", 0b0000000000001011)
head += struct.pack(">H", EM)
head += struct.pack(">q", 0) + struct.pack(">q", 0)
head += struct.pack(">hhhh", 0, DESC, ADV, ASC)
head += struct.pack(">H", 0) + struct.pack(">H", 8)
head += struct.pack(">h", 2) + struct.pack(">h", 0) + struct.pack(">h", 0)
assert len(head) == 54, len(head)

# ── hhea ──────────────────────────────────────────────────────────────────────
hhea  = struct.pack(">I", 0x00010000)
hhea += struct.pack(">hhh", ASC, DESC, 0)
hhea += struct.pack(">H", ADV)
hhea += struct.pack(">hhh", 0, 0, ADV)
hhea += struct.pack(">hh", 1, 0)
hhea += struct.pack(">h", 0)
hhea += struct.pack(">hhhh", 0, 0, 0, 0)
hhea += struct.pack(">h", 0)
hhea += struct.pack(">H", NGLYPHS)
assert len(hhea) == 36, len(hhea)

# ── maxp ──────────────────────────────────────────────────────────────────────
maxp = struct.pack(">IH", 0x00010000, NGLYPHS)
for v in (240, 60, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0):
    maxp += struct.pack(">H", v)
assert len(maxp) == 32, len(maxp)

hmtx = b"".join(struct.pack(">Hh", ADV, 0) for _ in range(NGLYPHS))

# ── cmap format 4 (segments built from the real codepoint runs) ───────────────
codes = [cp for cp, _ in GLYPHS]
segs = []
start = codes[0]; prev = codes[0]
for cp in codes[1:]:
    if cp == prev + 1:
        prev = cp; continue
    segs.append((start, prev)); start = cp; prev = cp
segs.append((start, prev))
segs.append((0xFFFF, 0xFFFF))

gid_of = {cp: i + 1 for i, (cp, _) in enumerate(GLYPHS)}
seg_end, seg_start, seg_delta = [], [], []
for (s, e) in segs:
    seg_start.append(s); seg_end.append(e)
    if s == 0xFFFF:
        seg_delta.append(1)
    else:
        seg_delta.append(((gid_of[s] - s) & 0xFFFF) or 0)
segCount = len(segs)
segX2 = segCount * 2
_search = 2 * (2 ** (segCount.bit_length() - 1))
_entry = segCount.bit_length() - 1
_range = segX2 - _search
sub  = struct.pack(">HHHHHHH", 4, 16 + 8*segCount, 0, segX2, _search, _entry, _range)
sub += b"".join(struct.pack(">H", s) for s in seg_end)
sub += struct.pack(">H", 0)
sub += b"".join(struct.pack(">H", s) for s in seg_start)
sub += b"".join(struct.pack(">h", d if d < 0x8000 else d - 0x10000) for d in seg_delta)
sub += b"\x00\x00" * segCount
sub += b"\x00\x00"
cmap = struct.pack(">HHHHI", 0, 1, 3, 1, 12) + sub

# ── name ──────────────────────────────────────────────────────────────────────
strings = {1:"U3DS Pixel", 2:"Regular", 3:"U3DS Pixel v1.0",
           4:"U3DS Pixel", 5:"Version 1.000", 6:"U3DSPixel-Regular"}
recs, blob = b"", b""
for nid in sorted(strings):
    s = strings[nid]
    for pid, eid, lid in ((1, 0, 0), (3, 1, 0x409)):
        b = s.encode("utf-16-be") if pid == 3 else s.encode("latin-1")
        recs += struct.pack(">HHHHHH", pid, eid, lid, nid, len(b), len(blob))
        blob += b
name = struct.pack(">HHH", 0, len(strings)*2, len(recs)) + recs + blob

post = struct.pack(">IIhhIIIII", 0x00030000, 0, 0, 0, 0, 0, 0, 0, 0)

# ── OS/2 v4 ───────────────────────────────────────────────────────────────────
os2  = struct.pack(">H", 4)
os2 += struct.pack(">h", ADV)
os2 += struct.pack(">HH", 400, 5)
os2 += struct.pack(">H", 0)
os2 += struct.pack(">8h", 0,0,0,0,0,0,0,0)
os2 += struct.pack(">hh", 0, 0)                 # yStrikeoutSize, yStrikeoutPosition
os2 += struct.pack(">h", 500)                   # sFamilyClass
os2 += struct.pack(">10s", b"UNDRTL3D  ")
os2 += struct.pack(">4I", 0x00000040, 0, 0, 0)
os2 += struct.pack(">4s", b"U3DS")
os2 += struct.pack(">H", 0x0040)
os2 += struct.pack(">H", 0x20)
os2 += struct.pack(">H", max(cp for cp in [c for c,_ in GLYPHS]))   # real last char
os2 += struct.pack(">hhh", ASC, DESC, 0)
os2 += struct.pack(">HH", ASC, 200)
os2 += struct.pack(">II", 1, 0)
os2 += struct.pack(">hh", 500, 700)
os2 += struct.pack(">HHH", 0, 0x20, 1)
os2 = os2[:96].ljust(96, b"\x00")
assert len(os2) == 96, len(os2)

tables = {"head":head, "hhea":hhea, "maxp":maxp, "OS/2":os2, "hmtx":hmtx,
          "cmap":cmap, "loca":loca_b, "glyf":glyf, "name":name, "post":post}
# The sfnt directory MUST be sorted by tag (browsers enforce this; FreeType is lax).
order = sorted(tables)

n = len(order)
sr = 16 * (2 ** (n.bit_length() - 1)); es = n.bit_length() - 1; rs = n*16 - sr
off = 12 + n*16
dirs, body = [], b""
for tag in order:
    data = pad4(tables[tag])
    dirs.append((tag, checksum(tables[tag]), off, len(tables[tag])))
    body += data; off += len(data)
font = struct.pack(">IHHHH", 0x00010000, n, sr, es, rs)
for tag, cs, o, ln in dirs:
    font += tag.encode("latin-1").ljust(4) + struct.pack(">III", cs, o, ln)
font += body
adj = (0xB1B0AFBA - checksum(font)) & 0xFFFFFFFF
head_off = [d for d in dirs if d[0] == "head"][0][2]
font = font[:head_off+8] + struct.pack(">I", adj) + font[head_off+12:]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "wb").write(font)
print("wrote", OUT, len(font), "bytes  glyphs:", NGLYPHS, " mapped:", len(GLYPHS), " segments:", segCount)
