#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shot.py — снять отдельные кадры сцены, чтобы посмотреть глазами.

    python3 shot.py 2,18,26,40 out_dir [i01.html]
"""
import sys, os, asyncio
from playwright.async_api import async_playwright
import browser

TIMES = [float(x) for x in sys.argv[1].split(",")]
OUT   = sys.argv[2]
SCENE = sys.argv[3] if len(sys.argv) > 3 else "i01.html"

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={"width":1080,"height":1920}, device_scale_factor=1)
        await pg.goto(browser.scene_url(SCENE))
        await pg.wait_for_timeout(700)
        for t in TIMES:
            await pg.evaluate("t=>window.seek(t)", t)
            await pg.screenshot(path=f"{OUT}/t{t:06.2f}.png")
        print(await pg.evaluate("JSON.stringify(window.META)"))
        await b.close()

asyncio.run(main())
