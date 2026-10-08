#!/usr/bin/env python3
"""Assemble the GitHub Pages artifact: chat site at /, sync dashboard at /sync/.

Only a whitelist of static paths is copied from the repo root — pipeline
machinery (sync/, data sources, tests, config) never reaches the public site
except through the sanitized data/ copy under /sync/data/.
"""
from __future__ import annotations

import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "_pages"

#: Static chat-site paths at the repo root that are safe to publish.
CHAT_WHITELIST = (
    "index.html",
    "css",
    "js",
    "assets",
    "images",
    "favicon.ico",
    "favicon.png",
    "robots.txt",
)


def build() -> pathlib.Path:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    # 1) the public chat site (root of the Pages deployment)
    for name in CHAT_WHITELIST:
        src = ROOT / name
        if not src.exists():
            continue
        dst = OUT / name
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)

    # 2) the sync dashboard under /sync/ with its sanitized data
    sync_out = OUT / "sync"
    shutil.copytree(ROOT / "site", sync_out)
    data = ROOT / "data"
    if data.exists():
        shutil.copytree(data, sync_out / "data", dirs_exist_ok=True)

    print(f"pages artifact assembled at {OUT}/ (chat at /, dashboard at /sync/)")
    return OUT


if __name__ == "__main__":
    build()
