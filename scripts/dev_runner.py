"""Cross-platform supervisor for the local FastAPI and Next.js dev servers."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "apps" / "api"
WEB_DIR = ROOT / "apps" / "web"
LOG_DIR = ROOT / ".dev"


def _load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        if name and name.isidentifier() and name not in os.environ:
            os.environ[name] = value.strip().strip('"').strip("'")


def _stop(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def _wait_for_api(url: str) -> None:
    for _ in range(60):
        try:
            with urllib.request.urlopen(f"{url}/health", timeout=2) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.5)
    raise RuntimeError(f"API did not become ready at {url}")


def main() -> int:
    _load_dotenv()
    database_path = os.environ.setdefault(
        "CRM_DATABASE_PATH", str(ROOT / "data" / "crm.sqlite")
    )
    api_url = os.environ.setdefault("API_INTERNAL_URL", "http://127.0.0.1:8000")
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    api_out = (LOG_DIR / "api.out.log").open("ab")
    api_err = (LOG_DIR / "api.err.log").open("ab")
    api_process: subprocess.Popen | None = None
    web_process: subprocess.Popen | None = None

    try:
        api_env = os.environ.copy()
        api_env["CRM_DATABASE_PATH"] = database_path
        api_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--app-dir",
                str(API_DIR),
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=ROOT,
            env=api_env,
            stdout=api_out,
            stderr=api_err,
        )
        _wait_for_api(api_url)

        npm = shutil.which("npm.cmd") or shutil.which("npm")
        if npm is None:
            raise RuntimeError("npm was not found on PATH")
        web_env = os.environ.copy()
        web_env["API_INTERNAL_URL"] = api_url
        print(f"API: {api_url} (logs: {LOG_DIR})", flush=True)
        print("Web: http://127.0.0.1:3000", flush=True)
        web_process = subprocess.Popen([npm, "run", "dev"], cwd=WEB_DIR, env=web_env)
        return web_process.wait()
    except KeyboardInterrupt:
        return 0
    finally:
        _stop(web_process)
        _stop(api_process)
        api_out.close()
        api_err.close()


if __name__ == "__main__":
    raise SystemExit(main())
