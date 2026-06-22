from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"
BACKEND_DIR = ROOT / "backend"
LAUNCHER = ROOT / "启动器" / "启动_WordTidy.py"
OUTPUT_DIR = ROOT / "output" / "程序包"
RELEASE_DIR = ROOT / "output" / "release"


def main() -> None:
    parser = argparse.ArgumentParser(description="构建 WordTidy 桌面启动程序包")
    parser.add_argument("--平台", choices=["windows", "macos"], default=_default_platform())
    parser.add_argument("--版本", default="v0.17")
    parser.add_argument("--跳过前端构建", action="store_true")
    args = parser.parse_args()

    platform = args.平台
    version = args.版本.lstrip("v")

    if not args.跳过前端构建:
        _run(["npm", "run", "build"], cwd=FRONTEND_DIR)

    if not (FRONTEND_DIR / "dist" / "index.html").is_file():
        raise SystemExit("前端构建产物不存在，请先运行 npm run build。")

    build_dir = OUTPUT_DIR / "build"
    dist_dir = OUTPUT_DIR / "dist"
    spec_dir = OUTPUT_DIR / "spec"
    shutil.rmtree(build_dir, ignore_errors=True)
    shutil.rmtree(dist_dir, ignore_errors=True)
    shutil.rmtree(spec_dir, ignore_errors=True)
    build_dir.mkdir(parents=True, exist_ok=True)
    dist_dir.mkdir(parents=True, exist_ok=True)
    spec_dir.mkdir(parents=True, exist_ok=True)
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)

    data_separator = ";" if os.name == "nt" else ":"
    add_data = f"{FRONTEND_DIR / 'dist'}{data_separator}frontend_dist"
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--console",
        "--name",
        "WordTidy",
        "--paths",
        str(BACKEND_DIR),
        "--add-data",
        add_data,
        "--hidden-import",
        "app.main",
        "--hidden-import",
        "uvicorn.logging",
        "--hidden-import",
        "uvicorn.loops",
        "--hidden-import",
        "uvicorn.loops.auto",
        "--hidden-import",
        "uvicorn.protocols",
        "--hidden-import",
        "uvicorn.protocols.http",
        "--hidden-import",
        "uvicorn.protocols.http.auto",
        "--hidden-import",
        "uvicorn.protocols.websockets",
        "--hidden-import",
        "uvicorn.protocols.websockets.auto",
        "--hidden-import",
        "uvicorn.lifespan",
        "--hidden-import",
        "uvicorn.lifespan.on",
        "--exclude-module",
        "PyQt5",
        "--exclude-module",
        "PyQt6",
        "--exclude-module",
        "PySide2",
        "--exclude-module",
        "PySide6",
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(build_dir),
        "--specpath",
        str(spec_dir),
        str(LAUNCHER),
    ]
    _run(command, cwd=ROOT)

    package_root = dist_dir / "WordTidy"
    if not package_root.is_dir():
        raise SystemExit("PyInstaller 未生成 WordTidy 目录。")

    _write_readme(package_root, platform)
    zip_name = f"WordTidy_v{version}_{'Windows' if platform == 'windows' else 'macOS'}_executable.zip"
    zip_path = RELEASE_DIR / zip_name
    if zip_path.exists():
        zip_path.unlink()
    _zip_directory(package_root, zip_path)
    _safe_print(str(zip_path))


def _default_platform() -> str:
    if sys.platform == "darwin":
        return "macos"
    return "windows"


def _run(command: list[str], cwd: Path) -> None:
    resolved = shutil.which(command[0])
    if resolved:
        command = [resolved, *command[1:]]
    _safe_print(" ".join(command))
    subprocess.run(command, cwd=cwd, check=True)


def _safe_print(value: str) -> None:
    print(value.encode("ascii", "backslashreplace").decode("ascii"))


def _write_readme(package_root: Path, platform: str) -> None:
    executable = "WordTidy.exe" if platform == "windows" else "WordTidy"
    content = f"""WordTidy 启动说明

1. 解压本程序包。
2. 双击运行 {executable}。
3. 程序会启动本地服务并自动打开浏览器。
4. 使用完成后关闭启动窗口即可停止 WordTidy。

注意：
- .doc 转 .docx、.docx 转 PDF 仍需要本机已安装 LibreOffice。
- AI模式需要配置 DeepSeek API key 或后端环境变量。
"""
    (package_root / "使用说明.txt").write_text(content, encoding="utf-8")


def _zip_directory(source_dir: Path, target_zip: Path) -> None:
    with zipfile.ZipFile(target_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in source_dir.rglob("*"):
            archive.write(path, path.relative_to(source_dir.parent))


if __name__ == "__main__":
    main()
