# [[PROCESSING GUIDE]] — HOW YOUR LEGAL UNDERTALE BECOMES 3DS DATA

## STEP 1: GET THE SOURCE DATA (LEGALLY!!)
- Own Undertale on Steam
- Find: `Steam/steamapps/common/Undertale/assets/`
- You need: `game.unx` + the 218 `.ogg` files

## STEP 2: TEXTURES → ATLAS (wasm pipeline)
```bash
node tools/prep-ut2.mjs
# outputs: out-ut/apps/UNDERTALE/{data.win, gfx/atlas.bin, manifests}
```

## STEP 3: MUSIC → BCWAV STREAMS (native tool, --audio-only)
```bash
# build n3ds-preprocess from repo tools/ (cmake) with our --audio-only patch
./n3ds-preprocess /tmp/ut-work/data.win /tmp/ut-audio --audio-only
# outputs: *.bcwav (DSP-ADPCM streams) + audio/sound_bank.bin
```

## STEP 4: ASSEMBLE PACKAGE
```bash
python3 tools/ut_assemble.py
# => sunshine-patcher/ut3ds-data/ ready for SD card
```

## SD CARD LAYOUT
```
SD root/
└── 3ds/
    ├── UNDERTALE.3dsx      (870KB slim runner)
    └── cinnamon/           (all data: data.win, gfx/, audio/, *.bcwav)
```

## NOTES
- bcwav = CWAV container, DSP-ADPCM encoding mandatory (runner checks encoding==2)
- 134 long tracks (>15s) ship as streams; 309 short sfx packed in the bank
- data.win used is byte-identical to your Steam game.unx (no patches needed!)