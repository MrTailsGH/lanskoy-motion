#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render.py — покадровый рендер сцены с докаткой.

    python3 render.py [i01.html] [frames]

Готовые кадры пропускаются, поэтому прерванный рендер продолжается с места
обрыва. Длинный рендер запускать фоном:
    nohup python3 render.py i01.html frames > render.log 2>&1 &
"""
import sys, os, time, asyncio
from playwright.async_api import async_playwright
import browser

SCENE = sys.argv[1] if len(sys.argv) > 1 else "i01.html"
FRAMES_DIR = sys.argv[2] if len(sys.argv) > 2 else "frames"

async def main():
    os.makedirs(FRAMES_DIR, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={"width":1080,"height":1920}, device_scale_factor=1)
        await pg.goto(browser.scene_url(SCENE))
        await pg.wait_for_timeout(900)
        meta = await pg.evaluate("window.META")
        N, FPS = int(meta["FRAMES"]), meta["FPS"]
        print(f"{SCENE}: {N} кадров, {FPS} fps, {meta['DUR']} с", flush=True)
        t0 = time.time()
        for i in range(N):
            fp = f"{FRAMES_DIR}/f{i:05d}.png"
            if os.path.exists(fp) and os.path.getsize(fp) > 0:
                continue
            await pg.evaluate("t=>window.seek(t)", i/FPS)
            await pg.screenshot(path=fp)
            if i and i % 200 == 0:
                el = time.time()-t0
                print(f"{i}/{N}  {el:.0f}s  осталось ~{el/i*(N-i):.0f}s", flush=True)
        print(f"готово {N} кадров за {time.time()-t0:.0f}s")
        await b.close()

asyncio.run(main())
