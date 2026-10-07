# TRIAL 3 — HARDWARE BOOT FIX HANDOFF (2026-10-06)

## THE ROOT CAUSE OF "DOESN'T LAUNCH" ON HARDWARE (found, fixed, on card)

Card crash log (before fix) ended at:

```
audio      loading sound bank
audio      sound_bank path=sdmc:/3ds/U3DS/audio/sound_bank.bin
audio      reading sound_bank        <-- process died here, nothing after
```

Cause: `N3DSAudio_loadPackedSoundBank()` allocated the entire **17.7 MB**
sound_bank.bin in ONE block from the **application heap** via `safeMalloc`
(which calls `abort()` on NULL). Heap telemetry from the same build
emulated in Old3DS mode:

```
heap  before sound_bank app_free=8603KB linear_free=30121KB
```

8.6 MB free app heap can never fit a 17.7 MB block → malloc NULL → abort()
→ silent instant process death. On the emulator this never reproduced because
Azahar's resource limit code ignores overruns (`resource_limit.cpp` TODO), so
the big malloc succeeded there. This is exactly the emulator-vs-hardware
asymmetry that made the failure so confusing.

## THE FIX — commit cd85bcd (branch UNDERTALE-3DS)

1. Sound bank loads to the **linear heap first** (30 MB free; separate pool),
   app-heap fallback; never aborts. Chunked 1 MB reads + `bank read progress=`
   breadcrumbs + `linear=%d` in the loaded line.
2. `N3DSAudio_logHeapState()` `heap` breadcrumbs before/after bank load.
3. Renderer init gfx breadcrumbs (atlas / maps / direct assets / manifest /
   fonts) — previously renderer init was invisible on hardware.
4. Atlas page blob `t3xData` malloc no longer `safeMalloc` (logs + skips the
   page instead of aborting).
5. `ndspReady` guards on update/playSound/destroy — audio DSP failure degrades
   to silence, never a crash.
6. Dialogue routing widened (`writer`/`dialoguer`/`sidestalk` tokens +
   obj_sadmsggen) so the whole writer family routes to the bottom screen.

## VERIFIED (emulator, Old3DS mode = same mode as the console)

Final build `md5 c97a4672e6b962f8ff543c5228d38953` boot log:

```
heap before sound_bank app_free=8603KB linear_free=30121KB
sound_bank read size=18078322 linear=1
heap after sound_bank  app_free=8603KB linear_free=12466KB
audio_bank loaded version=2 entries=443
ndspInit failed: 0xD880A7FA   (O3DS hbl has no DSP firmware - now harmless)
atlas load done loaded=1 pages=522 items=6550
... font pages preloaded
runner created, rendererReady=1
first room initialized
entering main loop              <-- furthest any build has ever reached
```

Ruins art renders on the emulated screens.

## WHAT'S ON THE CARD RIGHT NOW

- `3ds/U3DS/U3DS.3dsx` = build cd85bcd (md5 c97a4672…), md5 verified after copy.
- Old build backed up on card as `U3DS.3dsx.bak-0709`.
- `crash_history.log` / `last_breadcrumb.txt` deleted (fresh boot recreates).

## NEXT SESSION — FIRST STEPS

1. Read `3ds/U3DS/crash_history.log` from the card.
   - If it ends at `entering main loop`: the boot abort is dead; move on to
     bottom-screen dialogue + battle rendering checks.
   - If it dies earlier: the last breadcrumb names the stage; the `heap` lines
     give numbers to size the next fix.
2. Likely next hardware gates (in order): O3DS atlas resident budget (16 pages)
   during room loads; direct asset VRAM budget (1 MB on O3DS); touch screen.
3. Dialogue: verify text boxes land bottom-center by walking to a trigger;
   alignment math lives in `N3DSRenderer_beginBottomScreenGUIEx` (runner.c =>
   `Runner_draw3DSBottomDialogue`).

## KEY PATHS

- Source: `/home/angus/undertale-3ds/cinnamon-3ds/` (HEAD cd85bcd)
- Build: `build/n3ds/cinnamon.3dsx`
- Staging: `/home/angus/U3DS-prototype1-sd/3ds/U3DS/U3DS.3dsx`
- Emulated SD: `~/.var/app/org.azahar_emu.Azahar/data/azahar-emu/sdmc/3ds/U3DS/`
- Debug log: `3ds/U3DS/crash_history.log`
- Azahar log: `~/.var/app/org.azahar_emu.Azahar/data/azahar-emu/log/azahar_log.txt`

## RULES

- No system installs; toolchain local at `/home/angus/devkitpro/opt/devkitpro`.
- No touching port 8080. `sync` before card removal. Measure, never assert.

*Context: the 3DS is a Luma3DS v13.0.2 Old3DS; crash dumps at
`luma/dumps/arm11/crash_dump_*.dmp` use the Luma format (header 0x28, 23 regs
from 0x28, 96-byte code dump, 16-byte trailer: "3dsx_app" + titleid).*
