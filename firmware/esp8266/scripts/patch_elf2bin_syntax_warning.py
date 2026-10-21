#!/usr/bin/env python3
"""Apply the upstream ESP8266 elf2bin.py raw-regex fix to PlatformIO's cache.

This is a build-time-only patch for two invalid backslash-s escape warnings
fixed upstream in esp8266/Arduino PR #9034. It does not change firmware logic.
"""

import os
from pathlib import Path

core_dir = Path(os.environ.get("PLATFORMIO_CORE_DIR", Path.home() / ".platformio"))
package_dir = core_dir / "packages"
candidates = sorted(package_dir.glob("framework-arduinoespressif8266*/tools/elf2bin.py"))

if len(candidates) != 1:
    raise SystemExit(
        f"Expected exactly one ESP8266 elf2bin.py under {package_dir}; found {len(candidates)}. "
        "Run `pio pkg install -e nodemcuv2` first and inspect the package cache."
    )

path = candidates[0]
source = path.read_text(encoding="utf-8")
old = r"re.split('\s+', line)"
fixed = r"re.split(r'\s+', line)"
old_count = source.count(old)
fixed_count = source.count(fixed)

if old_count == 2:
    path.write_text(source.replace(old, fixed), encoding="utf-8")
    print(f"Applied the two upstream raw-regex fixes to {path}")
elif old_count == 0 and fixed_count == 2:
    print(f"Upstream raw-regex fix is already present in {path}")
else:
    raise SystemExit(
        f"Unexpected elf2bin.py contents at {path}: found {old_count} old and "
        f"{fixed_count} fixed expressions; refusing to patch."
    )
