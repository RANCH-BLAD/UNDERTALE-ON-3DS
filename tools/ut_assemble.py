#!/usr/bin/env python3.14
"""Runner layout understood:
- .3dsx embeds ROMFS via 3dslink/romfs (StageN3DSRomfs copies game data into build romfs)
- Data files load from 'romfs:/' = the .3dsx's embedded romfs (built at compile time by
  devkitARM), fallbacks to sdmc:/3ds/papyrus/ (data.win, saves).
- For a .3dsx WITHOUT embedded romfs: put data at sdmc:/3ds/papyrus/ = SD card
  /3ds/papyrus/ folder. But chooseDataWinPath checks romfs:/data.win FIRST then
  sdmc:/3ds/papyrus/data.win. N3DSFileSystem romfsBasePath='romfs:/' - a .3dsx launched
  via homebrew menu HAS a romfs (the 3dsx's own bundled romfs section, built with
  'romfsGen'). For our data, better: pack the game data into the 3dsx romfs at build
  time (needs devkitARM) OR... check how DELTARUNE shipped data: user copied '3ds/'
  folder to SD root. The build embeds romfs with game data inside the .3dsx (romfs
  embedding via ELF). So building the .3dsx NEEDS the game data present at build time.
  We can't build 3dsx here (no devkitARM) - the USER must build it (they built DELTARUNE
  ON 3DS before, so they HAVE devkitPro on some machine? or... the repo says NO prebuilt).
  The user built the Wii port and tested - they have devkitPro? The Wii runner came from
  someone else. ASK THE USER if they have devkitPro installed OR want me to guide them.
MEANWHILE assemble the DATA package ready to drop in:
  /home/ryzen/sunshine-patcher/ut3ds-data/
    data.win  (from wasm run: out-ut/apps/UNDERTALE/data.win)
    gfx/ (atlas.bin + manifests)
    audio/sound_bank.bin (wasm bank 23MB)
    *.bcwav at ROOT (263 from native tool - resolveStreamPath bases romfs:/ = app root)
Wait - the bcwavs must be in ROMFS ROOT (romfs:/<name>.bcwav). And sound_bank at
romfs:/audio/sound_bank.bin. The wasm bank = DSP-ADPCM bcwav entries (bank ver 1).
NOTE: native tool bank said 'PCM16 at 32000Hz'?? 'Packed SFX audio into PCM16
sound_bank.bin' - the NATIVE tool writes PCM16 bank; the 3ds runner bank loader accepts
version 1 (BCWAV) and version... N3DS_SOUND_BANK_VERSION_PCM16 - both supported.
The WASM bank (23MB, 309 sounds) also fine. Use WASM's bank (it was built with the
proper pipeline) + native bcwavs for the 134 big tracks.
Assemble now."""
import os, shutil, glob

WASM = '/home/ryzen/sunshine-patcher/wii-prep/out-ut/apps/UNDERTALE'
NATIVE = '/tmp/ut-audio'
OUT = '/home/ryzen/sunshine-patcher/ut3ds-data'
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(f'{OUT}/gfx', exist_ok=True)
os.makedirs(f'{OUT}/audio', exist_ok=True)

# data.win + gfx from wasm output
shutil.copy2(f'{WASM}/data.win', f'{OUT}/data.win')
for f in os.listdir(f'{WASM}/gfx'):
    shutil.copy2(f'{WASM}/gfx/{f}', f'{OUT}/gfx/{f}')
# bank from wasm
shutil.copy2(f'{WASM}/audio/sound_bank.bin', f'{OUT}/audio/sound_bank.bin')
# bcwavs from native run
n = 0
for f in os.listdir(NATIVE):
    if f.endswith('.bcwav'):
        shutil.copy2(f'{NATIVE}/{f}', f'{OUT}/{f}')
        n += 1
total = 0
for root, _, files in os.walk(OUT):
    for f in files: total += os.path.getsize(os.path.join(root, f))
print(f'assembled {OUT}: bcwavs={n}, total={total/1048576:.0f}MB')
for f in sorted(os.listdir(OUT))[:8]:
    print(' ', f)