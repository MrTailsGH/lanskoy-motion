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

Файлы эффектов ищутся так:
  1. в sfx-map.json по имени реплики — туда кладём соответствие
     «наше имя» → «файл из чужого пака»;
  2. если соответствия нет — sfx/<имя>.wav или любое другое расширение,
     которое читает ffmpeg.

Громкость каждого файла выравнивается автоматически. В чужом паке уровни
разбросаны: один звук снят на −30 дБ, другой на −6, и без выравнивания
половина эффектов пропадёт, а половина ударит по ушам.
"""

import json, os, re, subprocess, sys, asyncio
from playwright.async_api import async_playwright
import browser

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, 'sfx')
MAP = os.path.join(HERE, 'sfx-map.json')
SFX_DB = -17        # эффекты заметно тише голоса: их ощущают, а не слушают
TARGET_PEAK = -6.0  # к этому пику приводится каждый файл до общего ослабления
EXTS = ('.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aif', '.aiff')


def find(name):
    """Файл эффекта: сначала соответствие из sfx-map.json, потом sfx/<имя>.*"""
    if os.path.exists(MAP):
        m = json.load(open(MAP, encoding='utf-8'))
        v = m.get(name)
        if v:
            p = v if os.path.isabs(v) else os.path.join(HERE, v)
            if os.path.exists(p):
                return p
            sys.exit(f"в sfx-map.json для «{name}» указан {v}, а его нет")
    for e in EXTS:
        p = os.path.join(SFX, name + e)
        if os.path.exists(p):
            return p
    sys.exit(f"не нашёл звук «{name}»: ни в sfx-map.json, ни в sfx/{name}.*")


def peak_db(path):
    """Пиковая громкость файла. Нужна, чтобы привести пак к одному уровню."""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', 'volumedetect',
                        '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'max_volume:\s*(-?[\d.]+) dB', r.stderr)
    return float(m.group(1)) if m else 0.0


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
    gains = {}
    for i, e in enumerate(c):
        f = find(e['s'])
        if f not in gains:
            gains[f] = round(TARGET_PEAK - peak_db(f), 1)
        ff += ['-i', f]
        idx = i + 2
        ms = max(0, int(round(e['t'] * 1000)))
        # сначала выравниваем файл к общему пику, потом уводим под голос
        parts.append(f"[{idx}:a]adelay={ms}|{ms},"
                     f"volume={gains[f]}dB,volume={SFX_DB}dB[s{i}]")
        mix.append(f"[s{i}]")
        print(f"  {e['t']:>6.2f}  {e['s']:<7} {os.path.basename(f):<22} "
              f"выравнивание {gains[f]:+.1f} дБ")

    graph = ';'.join(parts) + ';' + ''.join(mix) + \
            f"amix=inputs={len(c)+1}:normalize=0:dropout_transition=0[a]"
    ff += ['-filter_complex', graph, '-map', '0:v', '-map', '[a]',
           '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', out]
    subprocess.run(ff, check=True)
    print(f"\n→ {out}")


if __name__ == '__main__':
    main()
