/* SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 RANCH-BLAD
 *
 * Part of U3DS. See LICENSING.md.
 */
#pragma once

#include "../file_system.h"

typedef struct {
    FileSystem base;
    char* basePath;
} WiiUFileSystem;

WiiUFileSystem* WiiUFileSystem_create(const char* dataWinPath);
void WiiUFileSystem_destroy(WiiUFileSystem* fs);