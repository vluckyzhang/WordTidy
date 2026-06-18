from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn


def _app_root() -> Path:
    bundle_root = getattr(sys, "_MEIPASS", None)
    if bundle_root:
        return Path(bundle_root)
    return Path(__file__).resolve().parents[1]


def _configure_runtime_paths() -> None:
    root = _app_root()
    backend_dir = root / "backend"
    if backend_dir.is_dir():
        sys.path.insert(0, str(backend_dir))

    static_dir = root / "frontend_dist"
    if not static_dir.is_dir():
        static_dir = root / "frontend" / "dist"
    if (static_dir / "index.html").is_file():
        os.environ.setdefault("WORDTIDY_STATIC_DIR", str(static_dir))


def _find_available_port(start: int = 8765, attempts: int = 50) -> int:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("没有找到可用的本地端口。")


def _wait_until_ready(port: int, timeout_seconds: int = 20) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            try:
                sock.connect(("127.0.0.1", port))
                return True
            except OSError:
                time.sleep(0.2)
    return False


def _open_browser_when_ready(port: int) -> None:
    if _wait_until_ready(port):
        webbrowser.open(f"http://127.0.0.1:{port}/")


def main() -> None:
    _configure_runtime_paths()
    from app.main import app

    port = _find_available_port()
    url = f"http://127.0.0.1:{port}/"
    print("WordTidy 正在启动...")
    print(f"浏览器将自动打开：{url}")
    print("关闭此窗口即可停止 WordTidy。")

    threading.Thread(target=_open_browser_when_ready, args=(port,), daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info", access_log=False)


if __name__ == "__main__":
    main()
