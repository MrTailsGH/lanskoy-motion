#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mixsfx.py — подмешать звуковые эффекты в готовый ролик.

    python3 mixsfx.py i01 out/I-01.mp4 out/I-01_sfx.mp4

Времена эффектов берутся из самой сцены: она объявляет window.SFX из тех
же якорей, что двигают картинку. Поэтому звук не может разъехаться с
изображением — подгонять на слух нечего.

Кадры при этом не трогаются: видеодорожка копируется как есть. Менять
звук можно сколько угодно, рендер не нужен.
"""

import os, subprocess, sys, asyncio
from playwright.async_api import async_playwright
import browser

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, 'sfx')
VOICE_DB = 0        # голос не трогаем
SFX_DB = -17        # эффекты заметно тише голоса: их ощущают, а не слушают


async def cues(scene):
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        await pg.goto(browser.scene_url(scene))
        await pg.wait_for_timeout(600)
        out = await pg.evaluate("JSON.stringify(window.SFX || [])")
        await b.close()
    import json
    return json.loads(out)


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    name, video, out = sys.argv[1], sys.argv[2], sys.argv[3]
    scene = os.path.join(HERE, name + '.html')
    voice = os.path.join(HERE, 'voice', 'I-' + name[1:] + '.mp3')

    c = asyncio.run(cues(scene))
    if not c:
        print(f"{scene}: window.SFX пуст — сцена не объявляет звук"); sys.exit(1)
    print(f"{name}: эффектов {len(c)}")

    ff = ['ffmpeg', '-y', '-v', 'error', '-i', video, '-i', voice]
    parts, mix = [], ['[1:a]']
    for i, e in enumerate(c):
        f = os.path.join(SFX, e['s'] + '.wav')
        if not os.path.exists(f):
            sys.exit(f"нет звука {f}")
        ff += ['-i', f]
        idx = i + 2
        ms = max(0, int(round(e['t'] * 1000)))
        parts.append(f"[{idx}:a]adelay={ms}|{ms},volume={SFX_DB}dB[s{i}]")
        mix.append(f"[s{i}]")
        print(f"  {e['t']:>6.2f}  {e['s']}")

    graph = ';'.join(parts) + ';' + ''.join(mix) + \
            f"amix=inputs={len(c)+1}:normalize=0:dropout_transition=0[a]"
    ff += ['-filter_complex', graph, '-map', '0:v', '-map', '[a]',
           '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', out]
    subprocess.run(ff, check=True)
    print(f"\n→ {out}")


if __name__ == '__main__':
    main()
