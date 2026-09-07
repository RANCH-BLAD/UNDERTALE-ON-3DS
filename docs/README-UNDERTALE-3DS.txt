UNDERTALE ON 3DS - DATA PACKAGE READY (Spamton-built, verbatim pipeline)
========================================================================

WHAT'S DONE (all verified on this machine):
- Undertale Steam data parsed (bytecode 16, 443 sounds, 6550 sprites, 336 rooms)
- Textures -> 3DS atlas (atlas.bin 14MB + manifests + preprocess_ready flag)
- Audio -> sound_bank.bin (22MB, 309 sfx/short tracks packed as DSP-ADPCM)
- Music -> 253 mus_*.bcwav streamed files (all 134 long tracks included!)
  The bcwavs are real DSP-ADPCM CWAVs the 3DS runner streams natively.
- data.win is byte-identical to your Steam game.unx (md5 verified)

WHERE: /home/ryzen/sunshine-patcher/ut3ds-data/   (111 MB total)

WHAT'S MISSING: the runner binary (.3dsx). It must be built with devkitPro
(devkitARM + citro2d + ctru) - this machine doesn't have it and can't install
it without your sudo. The repo (RANCH-BLAD/DELTARUNE-ON-3DS) ships NO prebuilt.

HOW TO BUILD THE RUNNER (on a machine with devkitPro):
1. git clone https://github.com/RANCH-BLAD/DELTARUNE-ON-3DS
2. COPY the contents of ut3ds-data/ into resources/3ds/romfs/
   (that's the folder the build embeds into the .3dsx)
3. arm-none-eabi-cmake -S . -B build/n3ds -DPLATFORM=n3ds -DCMAKE_BUILD_TYPE=Release
   cmake --build build/n3ds
4. => build/n3ds/papyrus.3dsx  (UNDERTALE data inside!)
5. Copy papyrus.3dsx + cinnamon.default.smdh to SD card /3ds/ folder
6. HOLD START -> homebrew menu -> run it

TOOLS BUILT HERE (reusable):
- /tmp/d3ds/build-host/n3ds-preprocess      (host preprocessor, + --audio-only flag I added)
- /tmp/tex3ds/tex3ds, tex3ds2               (tex3ds v2.3.0 built from source)
- wii-prep/prep-ut2.mjs                     (wasm pipeline run, target 3ds)
- wii-prep/ut_assemble.py                   (package assembler)

NOTES:
- The native preprocessor has a heap-corruption bug in its texture path with UT's
  data (crashes at 'corrupted size vs prev_size'). I worked around it: textures via
  the proven wasm pipeline, audio via the native tool with my new --audio-only flag.
- sound_bank has 309 sfx; the 134 long mus_* tracks are the streamed .bcwav files.
- Save data will go to sd:/3ds/papyrus/ (runner's save base path).