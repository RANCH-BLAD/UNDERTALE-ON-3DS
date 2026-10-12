/* SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 the Cinnamon and Butterscotch authors
 * SPDX-FileCopyrightText: 2026 RANCH-BLAD (modifications)
 *
 * Upstream chain: Butterscotch (AGPL-3.0) -> Cinnamon (MPL-2.0) -> this tree.
 * See LICENSING.md for the full attribution and the reasoning.
 */
#pragma once

#include "common.h"
#include "runner.h"

// Draws collision overlays for every active + visible instance in the current room.
// For instances backed by a sprite that has a precise mask (sepMasks == 1), every set
// mask pixel is filled with a translucent tint and the AABB outline is green.
// Otherwise, only the AABB outline is drawn in red.
//
// The drawing happens through the Renderer vtable, so this works on any platform that
// implements drawRectangle. Must be called inside a beginView/endView pair so the
// world-space coordinates project correctly.
void DebugOverlay_drawCollisionMasks(Runner* runner);
