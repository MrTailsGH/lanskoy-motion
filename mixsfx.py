#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mixsfx.py — подмешать звуковые эффекты в готовый ролик.

    python3 mixsfx.py i01 out/I-01.mp4 out/I-01_sfx.mp4

Времена берутся из самой сцены: она объявляет window.SFX из тех же якорей,
что двигают картинку. Подгонять на слух нечего.

Кадры не трогаются — видеодорожка копируется. Менять звук можно сколько
угодно, рендер не нужен.

Две вещи, которые делают звук попадающим, а не просто присутствующим:

1. ВЫРАВНИВАНИЕ ПО ПИКУ. На событие должен попасть пик звука, а не начало
   файла. У counter.mp3 атака 0,74 с: положи его началом на кадр — и
   щелчки прозвучат почти секундой позже числа. Файл сдвигается назад на
   свою атаку, которую замерил sfxindex.py.

2. УРОВЕНЬ ПО РОЛИ. Голос Станислава идёт около −16 dB RMS. Эффект под
   речью должен сидеть на −22, в паузе между блоками можно −16, на главном
   числе −11. Роль определяется сама: сцена сообщает границы блоков, и
   скрипт смотрит, попал эффект в речь или в паузу. Яркие звуки (выше
   3 кГц) опускаются ещё на 3 дБ — они бьют в ту полосу, где разбираются
   согласные.
"""

import json, os, subprocess, sys, asyncio
from playwright.async_api import async_playwright
import browser

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, 'sfx-map.json')
INDEX = os.path.join(HERE, 'sfx-index.json')
EXTS = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aif', '.aiff')

# уровни под голос Станислава, из assets/sfx/SFX.md
DB_SPEECH = -22.0     # эффект звучит под речью
DB_PAUSE  = -16.0     # эффект в паузе между блоками
DB_ACCENT = -11.0     # главное число, единственное место где эффект главнее
DB_BRIGHT = -3.0      # добавка ярким: они спорят с согласными
BRIGHT_HZ = 3000


def load(path, what):
    if not os.path.exists(path):
        sys.exit(f"нет {what}: {path}")
    return json.load(open(path, encoding='utf-8'))


def find(name, m):
    v = m.get(name)
    if v:
        p = v if os.path.isabs(v) else os.path.join(HERE, v)
        if os.path.exists(p):
            return os.path.relpath(p, HERE)
        sys.exit(f"в sfx-map.json для «{name}» указан {v}, а его нет")
    for e in EXTS:
        p = os.path.join(HERE, 'sfx', name + e)
        if os.path.exists(p):
            return os.path.relpath(p, HERE)
    sys.exit(f"не нашёл звук «{name}»: ни в sfx-map.json, ни в sfx/{name}.*")


async def read_scene(scene):
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        await pg.goto(browser.scene_url(scene))
        await pg.wait_for_timeout(600)
        out = await pg.evaluate(
            "JSON.stringify({sfx: window.SFX || [], blocks: (window.T||{}).B || []})")
        await b.close()
    return json.loads(out)


def role_db(t, blocks, cue):
    if cue.get('a'):
        return DB_ACCENT, 'акцент'
    for s, e in blocks:
        if s - 0.05 <= t <= e + 0.05:
            return DB_SPEECH, 'под речью'
    return DB_PAUSE, 'в паузе'


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    name, video, out = sys.argv[1], sys.argv[2], sys.argv[3]
    scene = os.path.join(HERE, name + '.html')
    voice = os.path.join(HERE, 'voice', 'I-' + name[1:] + '.mp3')

    m = load(MAP, 'карты звуков')
    idx = load(INDEX, 'индекса замеров (запустите sfxindex.py)')
    data = asyncio.run(read_scene(scene))
    cues, blocks = data['sfx'], data['blocks']
    if not cues:
        sys.exit(f"{scene}: window.SFX пуст — сцена не объявляет звук")

    print(f"{name}: эффектов {len(cues)}")
    ff = ['ffmpeg', '-y', '-v', 'error', '-i', video, '-i', voice]
    parts, mix = [], ['[1:a]']
    for i, c in enumerate(cues):
        rel = find(c['s'], m)
        meas = idx.get(rel)
        if not meas:
            sys.exit(f"нет замеров для {rel} — запустите sfxindex.py")
        target, why = role_db(c['t'], blocks, c)
        if meas['hz'] > BRIGHT_HZ:
            target += DB_BRIGHT
            why += ', яркий'
        gain = round(target - meas['peak'], 1)
        # на событие должен попасть пик, а не начало файла
        start = max(0.0, c['t'] - meas['attack'])
        ms = int(round(start * 1000))
        ff += ['-i', os.path.join(HERE, rel)]
        parts.append(f"[{i+2}:a]adelay={ms}|{ms},volume={gain}dB[s{i}]")
        mix.append(f"[s{i}]")
        print(f"  пик {c['t']:>6.2f}  старт {start:>6.2f}  {c['s']:<7}"
              f" {os.path.basename(rel):<20} {target:>6.1f} дБ  ({why})")

    graph = ';'.join(parts) + ';' + ''.join(mix) + \
            f"amix=inputs={len(cues)+1}:normalize=0:dropout_transition=0[a]"
    ff += ['-filter_complex', graph, '-map', '0:v', '-map', '[a]',
           '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', out]
    subprocess.run(ff, check=True)
    print(f"\n→ {out}")


if __name__ == '__main__':
    main()
