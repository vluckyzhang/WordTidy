from __future__ import annotations

import os
import platform
import re
import subprocess
from functools import lru_cache
from pathlib import Path


FONT_EXTENSIONS = {".ttf", ".ttc", ".otf"}


@lru_cache(maxsize=1)
def list_installed_fonts() -> list[str]:
    names: set[str] = set()
    names.update(_platform_font_names())
    names.update(_fontconfig_names())
    for directory in _font_directories():
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.suffix.lower() not in FONT_EXTENSIONS:
                continue
            names.add(_font_name_from_file(path))
    return sorted(names, key=str.casefold)


def _platform_font_names() -> set[str]:
    if platform.system().lower() != "windows":
        return set()
    try:
        import winreg
    except ImportError:
        return set()

    names: set[str] = set()
    registry_keys = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"),
    ]
    for root, key_path in registry_keys:
        try:
            with winreg.OpenKey(root, key_path) as key:
                index = 0
                while True:
                    try:
                        value_name, _, _ = winreg.EnumValue(key, index)
                    except OSError:
                        break
                    index += 1
                    cleaned = _clean_font_name(value_name)
                    if cleaned:
                        names.add(cleaned)
        except OSError:
            continue
    return names


def _fontconfig_names() -> set[str]:
    if platform.system().lower() == "windows":
        return set()
    try:
        result = subprocess.run(
            ["fc-list", ":", "family"],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return set()

    names: set[str] = set()
    for line in result.stdout.splitlines():
        for name in line.split(","):
            cleaned = _clean_font_name(name)
            if cleaned:
                names.add(cleaned)
    return names


def _font_directories() -> list[Path]:
    system = platform.system().lower()
    if system == "windows":
        windir = Path(os.getenv("WINDIR", "C:/Windows"))
        return [windir / "Fonts"]
    if system == "darwin":
        return [Path("/System/Library/Fonts"), Path("/Library/Fonts"), Path.home() / "Library/Fonts"]
    return [Path("/usr/share/fonts"), Path("/usr/local/share/fonts"), Path.home() / ".fonts", Path.home() / ".local/share/fonts"]


def _font_name_from_file(path: Path) -> str:
    return _clean_font_name(path.stem.replace("-", " ").replace("_", " "))


def _clean_font_name(value: str) -> str:
    cleaned = re.sub(r"\s*\((?:TrueType|OpenType|PostScript|Type 1)\)\s*$", "", value, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return "" if cleaned.startswith(".") else cleaned
