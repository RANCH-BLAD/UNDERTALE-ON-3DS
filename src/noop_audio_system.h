/* SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 the Cinnamon and Butterscotch authors
 * SPDX-FileCopyrightText: 2026 RANCH-BLAD (modifications)
 *
 * Upstream chain: Butterscotch (AGPL-3.0) -> Cinnamon (MPL-2.0) -> this tree.
 * See LICENSING.md for the full attribution and the reasoning.
 */
#pragma once

#include "common.h"
#include "audio_system.h"

// A no-op audio system that silently ignores all audio calls.
// Useful for headless mode or platforms without audio support.

typedef struct {
    AudioSystem base;
} NoopAudioSystem;

NoopAudioSystem* NoopAudioSystem_create(void);
