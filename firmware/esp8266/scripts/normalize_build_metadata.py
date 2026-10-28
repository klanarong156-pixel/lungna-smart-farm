"""Normalize dependency build metadata so identical source builds byte-identically."""

from pathlib import Path

Import("env")

framework = Path(env.subst("$PROJECT_LIBDEPS_DIR")) / env.subst("$PIOENV") / "WiFiManager" / "WiFiManager.cpp"
if framework.exists():
    source = framework.read_text(encoding="utf-8")
    old = 'String(__DATE__ " " __TIME__)'
    new = 'String("Jan 01 2026 00:00:00")'
    if old in source:
        framework.write_text(source.replace(old, new), encoding="utf-8")
