#!/usr/bin/env bash
# U3DS patcher - turns YOUR OWN Undertale data.win into a 3DS-ready SD card folder.
#
# Usage:
#   ./patch.sh /path/to/data.win            (or a folder containing it)
#   ./patch.sh                              (auto-detect nearby data.win)
#
# Output: ./U3DS-out/3ds/U3DS/  <-- copy these onto the root of your 3DS SD card.
#
# It does NOT modify data.win. It reads it and generates the converted
# graphics + audio the 3DS runner loads at runtime. You must own Undertale.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS="$HERE/tools"
PRE="$TOOLS/n3ds-preprocess"
TEX3DS="$TOOLS/tex3ds"
OUT="$HERE/U3DS-out"

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- locate data.win ---------------------------------------------------------
INPUT="${1:-}"
if [ -z "$INPUT" ]; then
  for c in "$HERE/data.win" "$HERE/game.unx" "$PWD/data.win" \
           "$PWD/game.unx" "$HOME/.local/share/Steam/steamapps/common/Undertale/data.win"; do
    [ -f "$c" ] && INPUT="$c" && break
  done
fi
[ -n "$INPUT" ] || die "Could not find data.win. Pass it explicitly: ./patch.sh /path/to/data.win"

# Steam ships the file as game.unx; accept a folder or either filename.
if [ -d "$INPUT" ]; then
  if [ -f "$INPUT/data.win" ]; then INPUT="$INPUT/data.win"
  elif [ -f "$INPUT/game.unx" ]; then INPUT="$INPUT/game.unx"
  else die "No data.win or game.unx inside $INPUT"; fi
fi
[ -f "$INPUT" ] || die "Not a file: $INPUT"

# The tool rejects paths that don't contain the literal substring "data.win",
# so stage a correctly-named copy if needed.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
case "$INPUT" in
  *data.win*) DW="$INPUT" ;;
  *) cp "$INPUT" "$WORK/data.win"; DW="$WORK/data.win"
     say "Staged $(basename "$INPUT") as data.win" ;;
esac

[ -x "$PRE" ] || die "Missing $PRE"
chmod +x "$PRE" "$TEX3DS" 2>/dev/null || true

# --- check dependencies ------------------------------------------------------
if ! "$TEX3DS" --help >/dev/null 2>&1; then
  die "tools/tex3ds will not run (needs a 64-bit Linux/x86-64 host)."
fi
if ! command -v magick >/dev/null 2>&1 && ! command -v convert >/dev/null 2>&1; then
  say "Note: ImageMagick not found. Texture conversion may be slower/fallback."
fi

# --- convert -----------------------------------------------------------------
say "Input:  $DW  ($(du -h "$DW" | cut -f1))"
say "Output: $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/3ds/U3DS"

# The preprocessor finds its sibling helpers (borders/, tex3ds) via its own dir.
say "Converting textures + audio (this takes a few minutes)..."
"$PRE" "$DW" "$OUT/staging" --tex3ds "$TEX3DS"

# --- assemble card layout ----------------------------------------------------
ST="$OUT/staging"
[ -d "$ST" ] || die "Preprocessor produced no output at $ST"
say "Assembling card layout..."
mkdir -p "$OUT/3ds/U3DS"
cp -r "$ST/gfx"   "$OUT/3ds/U3DS/"
cp -r "$ST/audio" "$OUT/3ds/U3DS/"
find "$ST" -maxdepth 1 -name '*.bcwav' -exec cp {} "$OUT/3ds/U3DS/" \;
cp "$HERE/U3DS.3dsx" "$OUT/3ds/U3DS/U3DS.3dsx"
rm -rf "$ST"

# --- report ------------------------------------------------------------------
BC=$(find "$OUT/3ds/U3DS" -maxdepth 1 -name '*.bcwav' | wc -l)
say "Done.  $BC music files, $(du -sh "$OUT/3ds/U3DS" | cut -f1) total."
echo
echo "Next steps:"
echo "  1. Copy the folder  $OUT/3ds  onto the ROOT of your 3DS SD card"
echo "     (merge with the existing 3ds folder if you have one)."
echo "  2. data.win is NOT included - put your own copy at"
echo "     sdmc:/3ds/U3DS/data.win  on the card."
echo "  3. Launch U3DS from the Homebrew Launcher."
echo
