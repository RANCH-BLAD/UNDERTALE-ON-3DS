# LICENSING.md

## This tree is AGPL-3.0-or-later

U3DS descends from **Cinnamon**, which descends from **Butterscotch**. Getting this
right matters, so here is the whole chain and the reasoning, in public.

```
Butterscotch  (ButterscotchRunner/Butterscotch)   AGPL-3.0
      |
      v
Cinnamon      (Project-Sunshine-Native/cinnamon)   MPL-2.0
      |
      v
U3DS          (this repository)                    AGPL-3.0-or-later
```

### Why AGPL-3.0 and not MIT

This repository previously carried an MIT `LICENSE`. That was wrong, for two
independent reasons:

1. **The root of the chain is AGPL-3.0.** AGPL-3.0 is strong copyleft — a
   derivative work must itself be AGPL-3.0. It cannot be relicensed to MPL-2.0,
   and it certainly cannot be relicensed to MIT.
2. **Even if the middle link were valid**, MPL-2.0 is *weak* (file-level)
   copyleft. §3.3 permits distributing a "Larger Work" under other terms, so
   MIT files may sit beside MPL files in one repository — but modified
   MPL-covered files stay MPL, and §3.4 forbids stripping their notices. A
   single root MIT license covering the entire tree is not that.

AGPL-3.0 is the safe posture because it is what the root already is. It needs
nobody's permission.

**If** the Cinnamon maintainers clarify that their relicensing from AGPL-3.0 to
MPL-2.0 was done with authorization, this decision can be revisited and the tree
could move to MPL-2.0. Until then, AGPL-3.0 is the correct default.

### What AGPL-3.0 costs you here

Very little, in practice. U3DS is a homebrew application running on a handheld.
AGPL's network clause (which is what distinguishes it from GPL) concerns
offering a program to users over a network. This application does not. In
consequence AGPL-3.0 behaves like GPL-3.0 for this project: fork it, modify it,
ship your changes — but keep them open.

## Per-file attribution

Every source file under `src/` carries an SPDX header, and the two classes are
**not** the same:

| Class | Count | Copyright holder |
|---|---|---|
| **Derived from Cinnamon** | 58 | the Cinnamon and Butterscotch authors; U3DS holds only its modifications |
| **Original to U3DS** | 24 | RANCH-BLAD |

The original files are the platform layers this project actually contributed:
`src/n3ds/*` (audio, renderer, filesystem, debug log, entry point),
`src/wiiu/*`, `src/tools/gl/image_decoder.*`, and `src/bytecode_versions.h`.

The classification was made mechanically, by comparing every file against the
Cinnamon tree at `Project-Sunshine-Native/cinnamon`, so the split reflects what
was actually copied and modified rather than what was convenient to claim.

`vendor/` is **not** covered by this license. It contains third-party libraries
(bzip2, glad, glad-gles, miniaudio, stb) that carry their own licenses, and no
SPDX header from this project has been added to them.

## Credits

- **Butterscotch** — [ButterscotchRunner/Butterscotch](https://github.com/ButterscotchRunner/Butterscotch).
  The original open-source GameMaker: Studio runner this entire lineage rests on.
  Licensed AGPL-3.0.
- **Cinnamon** — [Project-Sunshine-Native/cinnamon](https://github.com/Project-Sunshine-Native/cinnamon)
  by `@casrielasriel` and `@grayforz24682`. The 3DS/Wii U re-host. Licensed MPL-2.0.
- **Project Sunshine** — for the wider porting effort this belongs to.
- **devkitPro** (`devkitARM`, `libctru`, `citro3d`, `citro2d`, `3dstools`) — the
  toolchain without which none of this compiles.

## Game assets

**This repository contains zero assets from Undertale or Deltarune.** No
`data.win`, no sprites, no audio, no fonts — not in the tree, not in Releases,
not in CI artifacts.

The patcher reads *your own legally purchased copy* of Undertale on the PC to
generate assets, and the runner parses that copy again at runtime on the
console. Undertale and Deltarune are © Toby Fox. This project is not affiliated
with Toby Fox or with Nintendo.

## A note on the previous LICENSE

The retired MIT notice named `SPAMTON G. SPAMTON` as the copyright holder. That
was funny and it was also defective: a fictional character from someone else's
game cannot hold copyright or grant a license, and GitHub consequently reported
the repository as `NOASSERTION` rather than MIT. The SPDX headers above now name
real parties. That is the fix — not a retreat from the joke, just the paperwork
the joke was wrapped around.
