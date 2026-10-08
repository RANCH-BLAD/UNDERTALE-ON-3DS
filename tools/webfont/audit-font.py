import struct, sys

p = "/home/angus/3ds-build/ut3ds-clone/docs/assets/u3ds-pixel.ttf"
d = open(p, "rb").read()
problems = []

n = struct.unpack_from(">H", d, 4)[0]
tabs = {}
for i in range(n):
    o = 12 + i*16
    tag = d[o:o+4].decode("latin-1")
    cs, off, ln = struct.unpack_from(">III", d, o+4)
    tabs[tag] = (off, ln, cs)
print("tables:", sorted(tabs))

def need(cond, msg):
    if not cond:
        problems.append(msg)

# ── glyf / loca / head ────────────────────────────────────────────────────────
head_o = tabs["head"][0]
locfmt = struct.unpack_from(">h", d, head_o+50)[0]
need(locfmt == 0, "head.indexToLocFormat should be 0")
numGlyphs = struct.unpack_from(">H", d, tabs["maxp"][0]+4)[0]
loca_o, loca_l, _ = tabs["loca"]
if locfmt == 0:
    entries = loca_l // 2
    offs = [struct.unpack_from(">H", d, loca_o+i*2)[0]*2 for i in range(entries)]
else:
    entries = loca_l // 4
    offs = [struct.unpack_from(">I", d, loca_o+i*4)[0] for i in range(entries)]
need(entries == numGlyphs + 1, "loca has %d entries, need %d" % (entries, numGlyphs+1))
glyf_o, glyf_l, _ = tabs["glyf"]
need(offs[-1] <= glyf_l, "last loca %d > glyf len %d" % (offs[-1], glyf_l))
need(offs == sorted(offs), "loca not monotonic")
print("numGlyphs=%d loca entries=%d lastOffset=%d glyfLen=%d" % (numGlyphs, entries, offs[-1], glyf_l))

# ── hhea / hmtx ───────────────────────────────────────────────────────────────
numHM = struct.unpack_from(">H", d, tabs["hhea"][0]+34)[0]
hmtx_l = tabs["hmtx"][1]
need(numHM == numGlyphs, "numberOfHMetrics %d != numGlyphs %d" % (numHM, numGlyphs))
need(hmtx_l == numHM*4 + (numGlyphs-numHM)*2, "hmtx length %d wrong" % hmtx_l)
print("numberOfHMetrics=%d hmtxLen=%d" % (numHM, hmtx_l))

# ── cmap ──────────────────────────────────────────────────────────────────────
cm_o = tabs["cmap"][0]
nsub = struct.unpack_from(">H", d, cm_o+2)[0]
need(nsub >= 1, "cmap has no subtables")
print("cmap subtables:", nsub)
for i in range(nsub):
    pid, eid, off = struct.unpack_from(">HHI", d, cm_o+4+i*8)
    so = cm_o + off
    fmt = struct.unpack_from(">H", d, so)[0]
    ln  = struct.unpack_from(">H", d, so+2)[0]
    print("  sub %d: platform=%d enc=%d format=%d length=%d" % (i, pid, eid, fmt, ln))
    if fmt == 4:
        segX2 = struct.unpack_from(">H", d, so+6)[0]
        segCount = segX2 // 2
        expect = 16 + 8*segCount
        need(ln == expect, "cmap4 length %d != expected %d" % (ln, expect))
        ends = [struct.unpack_from(">H", d, so+14+k*2)[0] for k in range(segCount)]
        need(ends == sorted(ends), "cmap4 endCodes not sorted")
        need(ends[-1] == 0xFFFF, "cmap4 last endCode must be 0xFFFF")
        need(ends[0] > 0, "cmap4 first endCode must be > 0")
        print("    segCount=%d firstEnd=0x%X lastEnd=0x%X" % (segCount, ends[0], ends[-1]))

# ── name ──────────────────────────────────────────────────────────────────────
nm_o, nm_l, _ = tabs["name"]
fmt, count, soff = struct.unpack_from(">HHH", d, nm_o)
need(fmt == 0, "name format != 0")
need(soff == 6 + count*12, "name stringOffset %d != %d (6 + count*12)" % (soff, 6+count*12))
print("name: fmt=%d count=%d stringOffset=%d (expected %d)  tableLen=%d"
      % (fmt, count, soff, 6+count*12, nm_l))
for i in range(count):
    ro = nm_o + 6 + i*12
    pid, eid, lid, nid, l, off = struct.unpack_from(">HHHHHH", d, ro)
    if soff + off + l > nm_l:
        problems.append("name record %d string runs past table end" % i)

# ── OS/2 ──────────────────────────────────────────────────────────────────────
os2_o, os2_l, _ = tabs["OS/2"]
need(os2_l >= 78, "OS/2 too short")
print("OS/2 len=%d version=%d" % (os2_l, struct.unpack_from(">H", d, os2_o)[0]))

# ── head checks ───────────────────────────────────────────────────────────────
need(struct.unpack_from(">I", d, head_o+12)[0] == 0x5F0F3CF5, "head magic wrong")
need(struct.unpack_from(">h", d, head_o+54-4)[0] == 0, "glyphDataFormat != 0")
print("head magic=%s" % hex(struct.unpack_from(">I", d, head_o+12)[0]))

print()
if problems:
    print("PROBLEMS FOUND:")
    for x in problems:
        print("  -", x)
    sys.exit(1)
print("no structural problems detected")
