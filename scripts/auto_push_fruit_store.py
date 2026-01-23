#!/usr/bin/env python3
import os
import subprocess
import time
from datetime import datetime


REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WATCH_FILE = os.path.join(REPO_DIR, "fruit-store.html")
POLL_SECONDS = 2


def run(cmd):
    return subprocess.run(
        cmd,
        cwd=REPO_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )


def working_tree_dirty():
    result = run(["git", "status", "--porcelain"])
    return bool(result.stdout.strip())


def auto_commit_and_push():
    run(["git", "add", "fruit-store.html"])
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    run(["git", "commit", "-m", f"Auto update {timestamp}"])
    run(["git", "push"])


def main():
    if not os.path.exists(WATCH_FILE):
        print("fruit-store.html not found.")
        return

    last_mtime = os.path.getmtime(WATCH_FILE)
    print(f"Watching {WATCH_FILE} for changes... (Ctrl+C to stop)")

    while True:
        time.sleep(POLL_SECONDS)
        try:
            mtime = os.path.getmtime(WATCH_FILE)
        except FileNotFoundError:
            continue

        if mtime != last_mtime:
            last_mtime = mtime
            if working_tree_dirty():
                auto_commit_and_push()
                print("Pushed update.")


if __name__ == "__main__":
    main()
