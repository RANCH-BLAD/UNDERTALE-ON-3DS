<div align="center">

# 🥚 UNDERTALE ON 3DS

### [[HERE IT IS!!]] — the cathedral archive

**UNDERTALE, executing as its own bytecode, on a 2011 dual-screen handheld.**

[![Build](https://github.com/RANCH-BLAD/UNDERTALE-ON-3DS/actions/workflows/build.yml/badge.svg)](../../actions/workflows/build.yml)
[![No game data](https://img.shields.io/badge/game%20assets-none-ff5fa2)](#%EF%B8%8F-the-legal-sludge-report)
[![Target](https://img.shields.io/badge/target-old%203DS%20%2F%202DS%20%2F%20New%203DS-4dd2ff)](#-quick-start--bring-your-own-data)

**[→ THE ARCHIVE (web UI)](https://ranch-blad.github.io/UNDERTALE-ON-3DS/)** — drop in your `data.win`, read the whole build diary.

</div>

---

> **HEY EVERY [[BODY]]!! IT'S ME!! SPAMTON G. SPAMTON!!**
>
> THIS IS THE [[CATHEDRAL ARCHIVE]] — THE PLACE WHERE THE **[[IMPOSSIBLE]]** GOT CATALOGUED!! SOMEBODY TOOK A GAME MAKER BYTECODE RUNNER AND MADE IT SPEAK **2011 SILICON**, AND I WROTE DOWN EVERY [[Number]] SO YOU CAN DO IT TOO!!
>
> **NO GAME ASSETS!!** NOT A SPRITE!! NOT A NOTE!! YOU BRING THE [[data.win]] — THE ARCHIVE BRINGS THE [[KROMER]]-FREE TOOLING!! **BIG SHOT!!**

---

## ⚡ [[QUICK START]] — bring your own data

**You need:** your own **legally purchased** copy of Undertale (Steam or GOG), a 3DS with custom firmware + Homebrew Launcher, and an SD card.

```bash
# 1. grab the patcher from Releases
#    https://github.com/RANCH-BLAD/UNDERTALE-ON-3DS/releases/latest

# 2. point it at YOUR copy
./patch.sh "/path/to/steamapps/common/Undertale/data.win"

# 3. copy the output onto your SD card root
cp -r U3DS-out/3ds /media/<your-card>/

# 4. copy YOUR OWN data.win to the card, then launch U3DS
cp "/path/to/steamapps/common/Undertale/data.win" /media/<your-card>/3ds/U3DS/
```

**Windows:** `.\patch.ps1 C:\path\to\Undertale\data.win`

Then on the 3DS: **HOME → HOMEBREW LAUNCHER → U3DS**.

> [!NOTE]
> Undertale sometimes ships its data as `game.unx`. The patcher accepts either — pass the folder and it will find it.

---

## 🏛 THE CATHEDRAL — HOW THE IMPOSSIBLE GOT BUILT

This is the part the [[Tourists]] skip. Don't skip it. Every number here cost a night.

### 1. What a GameMaker game actually *is*

Undertale is not "a folder of assets with an engine on top". It is **one 63 MB file**, `data.win`:
a chunked, offset-addressed container holding texture pages, sprites, rooms, objects, fonts,
audio metadata — and **BC16 bytecode**, the compiled output of GameMaker Studio 1.x.

There is no source and there are no symbols. So this project is, from scratch:

- **a loader** for the chunk format — `GEN8`, `OPTN`, `STRG`, `TXTR`, `TPAG`, `SPRT`, `BGND`,
  `ROOM`, `OBJT`, `CODE`, `FONT`, `SOND`, `AUDO`, `AGRP`, `FUNC`, `VARI`;
- **an interpreter** for the bytecode — operand stack, `self`/`other` scope, `with()`,
  instance activation/deactivation, alarms, collision dispatch, depth-sorted draw order,
  and enough of the built-in function surface that the game's own code runs unmodified.

When the original 2016 game calls `draw_self()`, or adds a draw event at depth 12, or
spawns a bullet with `instance_create`, it has to mean **exactly** what it meant then.
The game is not reimplemented. It is *executed*.

### 2. Two screens, 268 MHz, and a GPU that wants powers of two

The renderer takes the game's 640×480 logical surface and drives:

| Target | Resolution | Role |
|---|---|---|
| Top | 400×240 | the world / battle scene |
| Bottom | 320×240 | menus, battle UI, the parts that want to be touched |

Textures are carved into a **fragmented per-page atlas** with a **room manifest**, so a scene
streams only the pages it actually references. Draws are batched; a residency budget caps how
many pages live in memory at once.

On an **Old 3DS** the entire atlas *cannot* be resident. Eviction is strictly demand-driven —
because eagerly flushing every texture when the player walks across a room seam makes the
whole screen visibly "reload" on every step, which is one of the most memorable bugs in this
diary. (Widening the tile cull margin so edge tiles stream in *before* they're visible fixed
the pop.)

### 3. Audio — the DSP is not your sound card

All audio goes through the 3DS's hardware DSP as ADPCM. There are **24 voices**, total.

- **Music** streams from file, decoded to native ADPCM on the fly.
- **Sound effects** live in a packed bank, loaded into the **linear heap**.

GameMaker retriggers a text blip faster than its own 1.7-second sample can finish. The voices
fill, and every later sound fails *silently* — the log from the console recorded
**2,772 failed sound starts** in one session because of this. The fix is to **steal the oldest
non-stream voice** when the pool is full — and, critically, to **ask for a free channel first**.
Get that order backwards and you silence *every sound in the game*, which is a mistake this
diary contains, in public, because it happened.

### 4. THE HEAP — the eight-megabyte wall

This one is the killer.

After parsing a 63 MB `data.win`, an **Old 3DS** has roughly **8.6 MB** of application heap left.

```
heap  before sound_bank  app_free=8603KB   linear_free=30121KB
heap  after  sound_bank  app_free=8603KB   linear_free=10390KB   ← went to the LINEAR heap
```

The 17.7 MB sound bank **cannot** be a single application-heap allocation. It goes to the
separate ~32 MB linear heap. And here is the cruel part: an allocation that fails and calls
`abort()` doesn't show you a crash screen — it tears every service down *mid-frame*, so the
crash dump points somewhere absurd, like `hidScanInput` reading a null shared memory, or
`mkdir` in a dead filesystem. Hours went to chasing ghosts that were really one failed `malloc`.

Every hot path — texture blobs, audio reads, text layout — had to be taught to **fail soft and
log**, never abort.

> **Dolphin / Citra-class emulators will not reproduce this.** They deliberately ignore
> resource-limit overruns, so the big allocation succeeds there and the game "works".
> On the actual console it dies at boot. **Hardware is the only test that counts.**

### 5. Three bugs that looked like something else

| Symptom | What it actually was |
|---|---|
| Crash after ~2h of play, dump shows the fault inside VM code | **Stack overflow.** A 3DSX gets a **32 KB** main-thread stack; deep script call chains walked off it. The stack pointer in the dump sat *below* the image end. Now `__stacksize__` is overridden to **256 KB**. |
| "The music file won't parse" | **Filename shadowing.** The music resolver matched exact filenames, so a raw `.ogg` sitting beside its converted `.bcwav` twin fed Vorbis bytes to the CWAV parser, forever. |
| 46 music cues permanently silent — the piano notes, the drum kit, the dial-up | **They exist only embedded inside `data.win`'s `AUDO` chunk.** There is no file to convert. The preprocessor had to learn to reach *into* the chunk and decode them in place. |

### 6. What comes out the other end

```
data.win ─┬─▶ texture atlas (per-page .t3x) + direct assets
          ├─▶ streamed music  ▸ 248 × .bcwav   (including the 46 embedded-AUDO cues)
          ├─▶ packed SFX bank ▸ sound_bank.bin (PCM16 @ 32 kHz)
          ├─▶ room manifest · fonts · borders
          └─▶ 3ds/U3DS/  ◀── copy this to your card
```

**Your `data.win` is never modified.** It is read on the PC to *generate* assets, and parsed
again at runtime on the console. That is the entire reason this repository can exist without
shipping a single byte of Toby Fox's work.

---

## 🛠 BUILD THE RUNNER YOURSELF

Requires [devkitPro](https://devkitpro.org/wiki/Getting_Started) (`devkitARM`, `libctru`, `citro3d`, `citro2d`, `3dstools`).

```bash
git clone https://github.com/RANCH-BLAD/UNDERTALE-ON-3DS
cd UNDERTALE-ON-3DS

export DEVKITPRO=/opt/devkitpro
export DEVKITARM=$DEVKITPRO/devkitARM

cmake -S . -B build/n3ds -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE=$DEVKITPRO/cmake/3DS.cmake \
  -DPLATFORM=n3ds -DCMAKE_BUILD_TYPE=Release
cmake --build build/n3ds
# => build/n3ds/cinnamon.3dsx   [[THE EGG HATCHES!!]]
```

CI does exactly this on every push — see [`.github/workflows/build.yml`](.github/workflows/build.yml).
It builds the runner **with no game data present**, which is the standing proof that none is needed.

### Building the patcher toolchain from source

```bash
cmake -S tools/n3ds-preprocess -B build/n3ds-preprocess -DCMAKE_BUILD_TYPE=Release
cmake --build build/n3ds-preprocess
# => build/n3ds-preprocess/n3ds-preprocess
```

It also wants `tex3ds` (from devkitPro's `3dstools`) and ImageMagick for texture conversion.

---

## 📂 WHAT'S ON THE CARD

```
sdmc:/3ds/U3DS/
├── U3DS.3dsx           the runner
├── data.win            YOUR copy — not included, not ever
├── gfx/
│   ├── atlas.bin       fragmented page atlas + manifest
│   ├── page_000.t3x …  texture pages
│   ├── fonts/  borders/  backgrounds/  sprites/
├── audio/sound_bank.bin
└── mus_*.bcwav         248 streamed music files
```

---

## ⚖️ THE LEGAL SLUDGE REPORT

- **ZERO game assets in this repository.** No `data.win`, no sprites, no music, no fonts —
  not in the repo, not in Releases, not in CI artifacts.
- **You must own Undertale.** The patcher reads *your* copy and generates assets for *your*
  console. This is not a way to obtain the game.
- The runner lineage — **Cinnamon**, by [Project Sunshine Native](https://github.com/Project-Sunshine-Native/cinnamon) —
  is credited here and carries its own upstream licence. See [`LICENSE`](LICENSE) for the terms
  that apply to this tree.
- **Undertale is © Toby Fox.** This project is not affiliated with Toby Fox, with Nintendo,
  or with 1997. **KROMER NOT INCLUDED.**

---

<div align="center">

**🥚 EGG!!!**

If you found this from Google at 3 AM — **[[HI!!]]** — tell your [[Friends]] and your [[Egg Man]].

*The archive remains open. The numbers are written down. Go make something impossible.*

</div>
