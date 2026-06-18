from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


class LibreOfficeUnavailable(RuntimeError):
    pass


def find_libreoffice() -> str:
    configured = os.getenv("LIBREOFFICE_PATH")
    if configured and Path(configured).exists():
        return configured

    for command in ("soffice", "libreoffice"):
        path = shutil.which(command)
        if path:
            return path

    windows_default = Path("C:/Program Files/LibreOffice/program/soffice.exe")
    if windows_default.exists():
        return str(windows_default)

    raise LibreOfficeUnavailable("未找到 LibreOffice/soffice。请安装 LibreOffice 或设置 LIBREOFFICE_PATH。")


def convert_with_libreoffice(input_path: Path, output_dir: Path, target_ext: str) -> Path:
    soffice = find_libreoffice()
    output_dir.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            soffice,
            "--headless",
            "--convert-to",
            target_ext.lstrip("."),
            "--outdir",
            str(output_dir),
            str(input_path),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=120,
    )

    expected = output_dir / f"{input_path.stem}.{target_ext.lstrip('.')}"
    if expected.exists():
        return expected

    candidates = list(output_dir.glob(f"*.{target_ext.lstrip('.')}"))
    if candidates:
        return candidates[0]

    raise RuntimeError(f"LibreOffice 转换完成，但未找到 .{target_ext.lstrip('.')} 输出文件。")

