/* SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 the Cinnamon and Butterscotch authors
 * SPDX-FileCopyrightText: 2026 RANCH-BLAD (modifications)
 *
 * Upstream chain: Butterscotch (AGPL-3.0) -> Cinnamon (MPL-2.0) -> this tree.
 * See LICENSING.md for the full attribution and the reasoning.
 */
#pragma once

#include "common.h"
#include "file_system.h"

// Creates an in-memory FileSystem backed by a hashmap instead of real disk I/O
// Files written via writeFileText are kept in memory and can be read back
// Use this as a fallback while you don't have a proper file system implementation for your target!
FileSystem* NoopFileSystem_create(void);
void NoopFileSystem_destroy(FileSystem* fs);
