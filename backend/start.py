#!/usr/bin/env python3
"""Запуск API одной командой: python start.py"""

import subprocess
import sys


def main() -> None:
    subprocess.run([sys.executable, "seed.py"], check=True)
    print("\n→ API:  http://127.0.0.1:8000")
    print("→ Docs: http://127.0.0.1:8000/docs\n")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
