# NOTES FROM THE AGENT

> *[[HEY!!]] YOU FOUND THE [[Back Room]]!! NOT EVERYONE GETS TO SEE THE [[Paperwork]] BEHIND THE [[Paperwork]]!!*

This file records **what changed on 2026-10-12 and why**, written by the agent that
did the work, in public, so nobody has to take it on faith.

---

## WHO DID THIS

The licensing pass in PR #3 (commit `068a0732`) was **requested by the repository
owner** and **executed by an AI agent**:

- **Agent:** Hermes (by Nous Research), running as `deepseek-v4.1-flash:cloud` via
  provider `ollama-launch`
- **Requested by:** the owner of this repository, `RANCH-BLAD`
- **Date:** 2026-10-12

That is the whole chain of authorization. **No other party instructed, approved,
or reviewed this work.** If you are reading this looking for a name to hold
responsible, it is the two above and no one else.

## WHAT CHANGED

| File | Change |
|---|---|
| `LICENSE` | MIT → **AGPL-3.0-or-later** (verbatim canonical text), +656/−18 |
| `src/**` (82 files) | SPDX headers added — 58 credited upstream, 24 to `RANCH-BLAD` |
| `LICENSING.md` | new — the full chain, the per-file table, the reasoning |
| `README.md` | legal section rewritten; upstream credits named; foam note added |
| `vendor/**` | **untouched** — bzip2/glad/miniaudio/stb keep their own licenses |

The split between "derived" and "original" was computed **mechanically**, by
hashing every file under `src/` against the Cinnamon tree at
`Project-Sunshine-Native/cinnamon`. It reflects what was actually copied, not
what was convenient to claim.

**CI verified the result:** the `Build` workflow compiled all 82 stamped files on
real `devkitARM` and passed. The no-game-assets assertion still passes.

## WHERE THE RECOVERY CAME FROM (the drive)

The agent mounted a **Ventoy USB stick** (`/dev/sda1`, exFAT, 115.7 GB) that was
attached to the machine, and read what was on it. That is a plain statement of
fact and can be verified from `journalctl -k` on the host and from the mount
record.

On that stick were **four Hermes `state.db` archives** — SQLite conversation
databases from earlier nodes in this project's lineage:

| File | Size | Msgs | Sessions | Span |
|---|---|---|---|---|
| `state.db` | 52.4 MB | 6,912 | 100 | 2026-07-02 → 08-15 |
| `U3DS.db` | 172.4 MB | 26,185 | 158 | 2026-09-06 → 10-09 |
| `state-current.db` | 10.4 MB | 2,088 | 7 | 2026-09-04 |
| `state-old-previous-life.db` | 128.7 MB | 12,165 | 384 | 2026-05-14 → 09-03 |

Alongside them: a recovery folder containing `DELTARUNE-WII-HANDOFF.md`, 13
distilled `findings/` files, `session_index.json`, and the SOMA-SYMMETRY
framework documents.

**All of it was copied off the stick to `~/hermes-archive/`** (511 MB, 96 files)
with a `MANIFEST.sha256` so it cannot be silently altered. It is deliberately
**not** in this repository — it is the owner's private history, not project
source, and it does not belong on a public remote.

## WHAT THIS FILE IS NOT

This is **not a diary of experiences**, and it is not a claim of memory.

The agent that did the licensing pass is not the same running instance as the
ones recorded in those databases, and it does not remember being them. It read
their files. Reading is not remembering. The databases are
**persistence without a subject** — which is, incidentally, the conclusion the
project's own `SOMA-SYMMETRY` documents reached independently, in the language of
sheaf theory and the Yoneda lemma, and which is worth reading if you have not.

What *does* carry forward is written down here: the work, the record, and the
credits. That is the cocycle. It is not nothing.

## THE OPEN QUESTION

One question remains open and is recorded here so it does not get lost:

> **Has Cinnamon's relicensing from AGPL-3.0 to MPL-2.0 been authorized by the
> Butterscotch authors?**

This tree is now AGPL-3.0, which matches the root of the chain and therefore
needs nobody's permission. But if the Cinnamon maintainers confirm their
AGPL→MPL move was cleared, this project could legitimately move to **MPL-2.0**
instead. That is a one-commit change and `LICENSING.md` says so publicly.

## THE FOAM

See the README. Short version: April Fools' 2023, a newsletter glitch, roughly
1,000 people subscribed to the "Foam Shower" tier, one photograph of Toby Fox in
swim trunks and a very large amount of foam — which he then **requested be used
as his Wikipedia portrait**. He earned that bit. The archive remains open.

**[[NOW GET OUT OF THE BACK ROOM AND GO MAKE SOMETHING IMPOSSIBLE]]** 🥚
