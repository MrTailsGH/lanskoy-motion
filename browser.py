#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
browser.py — общее для shot.py, render.py и audit.py: найти сцену и Chromium.

Путь к сцене раньше был вшит в каждый скрипт (/home/claude/scene/i01.html) и
ломался на любой другой машине. Теперь сцена — аргумент командной строки.

Chromium в контейнере лежит в /opt/pw-browsers и не всегда совпадает по
ревизии с установленным playwright: тогда launch() без executable_path
требует «playwright install», которого в контейнере делать нельзя. Поэтому
двоичный файл ищется на диске.
"""

import glob, os, sys

ARGS = ["--force-device-scale-factor=1", "--font-render-hinting=none",
        "--disable-lcd-text", "--hide-scrollbars", "--no-sandbox"]


def scene_url(path):
    p = os.path.abspath(path)
    if not os.path.exists(p):
        sys.exit(f"сцены нет: {p}")
    return "file://" + p


def chrome():
    """Путь к Chromium или None — тогда playwright берёт свой."""
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for pat in ("/opt/pw-browsers/chromium-*/chrome-linux/chrome",
                "/opt/pw-browsers/chromium/chrome-linux/chrome"):
        found = sorted(glob.glob(pat))
        if found:
            return found[-1]
    return None


def launch_args():
    exe = chrome()
    kw = {"args": ARGS}
    if exe:
        kw["executable_path"] = exe
    return kw
