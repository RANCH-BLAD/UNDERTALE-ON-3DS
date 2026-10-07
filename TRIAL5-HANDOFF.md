# U3DS — TRIAL 5 HANDOFF (deployed to card, awaiting hardware run)

Build: `U3DS.3dsx` md5 `a4c125b7dcd6b174a131c5b016134474` (commit `ff40c5a`)
Card: logs cleared, bcwavs (248) + bank unchanged from trial-4.

## Trial-4 verdict (from the card's log + Luma dump 17)
WORKING: music streams (mus_ruins/menu1/torch/battle1/ghostbattle all played),
sessions ran 23 min / 2 h 43 min, zero page-blob failures, heap stable.
REMAINING (all three now fixed in trial-5):

1. **Crash (Luma dump 17)** — main-thread STACK OVERFLOW, not heap: sp had
   crossed below the image end while `VM_callCodeIndex` executed; libctru's
   default 3DSX stack is only 32KB (weak `__stacksize__`), each VM frame ~2.4KB.
   → main.c now defines a strong `__stacksize__` = 256KB (verified 0x40000 in
   the ELF). Costs the app heap 224KB; heap telemetry shows boot free ~8.6MB.
2. **263× `bank pcm start failed sound=95`** — text-blip voices: SND_TXT2 is a
   1.7s sample and GM retriggers it faster than it ends; all 24 DSP channels
   fill, later blips fail (no sound for the letter) — this is the 'text blips'
   stutter. → audio system now steals the oldest non-stream voice when the
   channel pool is exhausted (new acquireChannelStealingOldestSfx + oldest-slot
   recycling). Streams keep their reserved slots.
3. **'Loading in and out' walking back/forth across screen edges** — every
   room change set `pendingOld3DSAtlasFlush` and flushed ALL direct assets,
   so crossing the seam unloaded and re-streamed every texture. → both eager
   flushes removed; demand-driven LRU eviction still bounds RAM/VRAM. Tile
   cull margin raised 16 → 64px so edge tiles stream in BEFORE visible.

## Next hardware check (card log)
- Walk over a room seam back and forth x5: no texture pop / no 'loading' flash.
- Type/walk over several dialogue triggers: text blips should keep working
  (no more silent letters); expect NO 'bank pcm start failed' lines.
- Play until the same deep battle that crashed: no crash. If a dump appears,
  grab its PC + the log tail.
- Music/SFX unchanged (streams log `audio_start stream ... path=...`).

## Anchors
- Stack: src/n3ds/main.c (strong __stacksize__ near top).
- Voice stealing: src/n3ds/n3ds_audio_system.c —
  N3DSAudio_acquireChannelStealingOldestSfx (~L1290),
  tryCacheSoundBlob oldest-slot recycle (~L3256).
- No-flush: src/n3ds/n3ds_renderer.c N3DSRenderer_prewarmRoom (~L3320),
  beginFrame (~L3480); runner.c tile margin (~L1465).
- Prior handoffs: TRIAL4-HANDOFF.md (music/audio/heap/OOM hardening).
