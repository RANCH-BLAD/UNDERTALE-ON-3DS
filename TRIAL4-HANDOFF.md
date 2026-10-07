# U3DS — TRIAL 4 HANDOFF (fixes deployed to card, awaiting hardware run)

Build deployed to card: `U3DS.3dsx` md5 `8488445041d87e9a809f3001b479cefa`
(backup of previous: `U3DS.3dsx.bak-0709b`)
New sound bank deployed: `audio/sound_bank.bin` md5 `17a4beb37312fd9851b82d35d7250966`
(old backed up: `audio/sound_bank.bin.bak-0709`)
Music on card: **248 .bcwav** (202 converted from steam oggs + 46 newly converted
from data.win's embedded AUDO chunk: piano notes, drum kit, dial-up voices,
mus_bgflameA etc.) — resolver sim against the card: **248/248 resolve**.
Repo commits: `93a4562` (main fixes) + `07e177d` (embedded AUDO + dodge gate).

## What trial-3 proved (from the card log + Luma dumps)
- Game boots on hardware, reaches "entering main loop" and runs ~34s.
- `audio_fail blob parse failed ... path=sdmc:/3ds/U3DS/mus_story.ogg` (also 228
  mus_intronoise.ogg, 229 mus_cymbal.ogg): **the raw .ogg sources on the card
  shadow their .bcwav twins in the resolver** (data.win says `name.ogg`; exact
  match wins; Vorbis data then fails BCWAV parse). No music. Voice blips = OK.
- `gfx page blob malloc failed size=524309 page=154/155` x5 near 34s: app heap
  at zero; a subsequent abort-on-OOM elsewhere killed the process, then libctru
  teardown raced the still-running frame -> Luma dumps 15/16 (data aborts in
  hidScanInput with hidSharedMem NULL, mkdir after sdmc unmount).

## What trial-4 (this build) changes
1. **Music resolver**: never returns `.ogg/.wav/.mp3/.flac` sources — always the
   converted `.bcwav`. Music also excluded from all app-heap preload/cache scans
   (it streams from file; the 4MB+ transient reads on the 8.6MB O3DS heap were
   the top-ranked abort candidate).
2. **Bottom screen**: dialogue + battle-UI passes now zoom 1.2x past the plain
   fit (text caps 12 -> 14.4px) and centre on the content's actual rect
   (per-axis, sprite-aware, sane-bounded). Verified in pure Python: content
   centre lands exactly at (160,120); the measured 575px box fills the screen;
   worst-case full-width text (535px) → 321px, i.e. no visible clipping.
3. **OOM hardening** (no more abort mid-game):
   - audio whole-file reads + bcwav header reads: malloc + soft-fail
   - direct texture blob loads: malloc + soft-fail + telemetry
   - page blob cache: clamped to real free heap; evict-all retry; heap numbers
     in the failure log line (app_free=/linear_free=)
   - text layout cache: checked realloc/malloc, degrade instead of abort
   - O3DS audio cache cap 6MB -> 3MB; O3DS t3x cache 16MB -> 3MB (uncommitted->
     committed); prewarm blob budget 8MB -> 3MB
4. **Diagnostics**: `exit main loop ended shouldExit=` breadcrumb; debug log no
   longer mkdir()s per line (was crash site #16).

## What to check on the next hardware run (read `crash_history.log`)
1. Music: expect `audio_start stream sound=214 ... path=sdmc:/3ds/U3DS/mus_story.bcwav`
   and **actual music** in the intro. Any `blob parse failed` = resolver still
   picking wrong file -> report the logged path.
2. Stability: walk through the intro several rooms; expect NO `page blob malloc
   failed` (or if any, they now log app_free=/linear_free=) and NO crash screen.
3. Bottom screen: dialogue text should be ~20% bigger than before and centred;
   the box should span (nearly) the full 320px screen width. If text is still
   small: raise `k3DSBottomUIScreenZoom` in src/runner.c (~line 113) — 1.3, 1.4...
   (larger = crops box side borders first).
4. If it still crashes: the next log + a fresh Luma dump should now name the
   exact soft-fail site; send both.

## Files/anchors
- repo: ~/undertale-3ds/cinnamon-3ds (commit 93a4562)
- zoom + centring: src/runner.c (~L104-135 consts/helper, L778-790 dialogue
  callsite, L847-861 battle callsite)
- music resolver skip: src/n3ds/n3ds_audio_system.c (pathEndsWithNoCase/
  pathLooksLikeRawAudio + resolveSoundPath; shouldPreloadSound/PrewarmCachedSound
  music exclusions)
- OOM soft-fails: n3ds_audio_system.c readFileFully/parseBcwavFile;
  n3ds_renderer.c ensurePageBlobLoaded/direct blob loads/text layout;
  n3ds_file_system.c readFileText/readFileBinary
- preproc output (fresh assets): ~/3ds-build/preproc-out2 (202 bcwavs + 195-SFX
  bank; gfx already byte-identical on card)
