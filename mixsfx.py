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

import json, math, os, re, subprocess, sys, tempfile, asyncio
from playwright.async_api import async_playwright
import browser

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, 'sfx-map.json')
INDEX = os.path.join(HERE, 'sfx-index.json')
EXTS = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aif', '.aiff')

# Уровни под голос Станислава. Отсчёт от рекомендаций assets/sfx/SFX.md,
# поднято на 6 дБ: по первой пробе эффекты оказались слишком тихими.
# Общую добавку можно дать ключом --gain, не трогая код.
DB_SPEECH = -16.0     # эффект звучит под речью
DB_PAUSE  = -10.0     # эффект в паузе между блоками
DB_ACCENT =  -5.0     # главное число, единственное место где эффект главнее
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


TSEL = -14.0       # норма площадки: у всех трёх разобранных чужих −14,3


def gromkost(путь):
    """Интегральная громкость файла в LUFS. None, если ffmpeg не ответил."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', путь,
                        '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
                       capture_output=True)
    м = re.findall(r'I:\s*(-?\d+\.?\d*)\s*LUFS',
                   r.stderr.decode('utf-8', 'replace'))
    return float(м[-1]) if м else None


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    name, video, out = sys.argv[1], sys.argv[2], sys.argv[3]
    extra = 0.0
    if '--gain' in sys.argv:
        extra = float(sys.argv[sys.argv.index('--gain') + 1].replace(',', '.'))
        print(f"общая добавка: {extra:+.1f} дБ")
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
        gain = round(target + extra - meas['peak'], 1)
        # По какому месту файла равнять. У удара с хвостом — по пику.
        # У звука-серии пик сидит в хвосте, и равнять надо по первому
        # слышимому месту, иначе серия отыграет до события.
        mode = c.get('m', 'peak')
        shift = meas.get('onset', 0.0) if mode == 'onset' else meas['attack']
        # Серия щелчков должна кончиться тогда же, когда останавливается
        # число на экране. Сцена объявляет длительность набора ключом d.
        # Слышимая часть файла — от onset до последнего щелчка (attack),
        # хвост затухания не в счёт.
        #
        # Коротко не хватает — ускоряем темпом. Не хватает сильно (шкала
        # дней набирается две с половиной секунды) — темпом нельзя:
        # counter на половинной скорости перестаёт быть щелчками. Тогда
        # повторяем серию по кругу, сколько нужно, и гасим хвост.
        tempo, chain = 1.0, ''
        d = float(c['d']) if c.get('d') else 0.0
        onset = meas.get('onset', 0.0)
        series = meas['attack'] - onset
        if d > 0 and mode == 'onset' and series > 0.05:
            tempo = round(series / d, 3)
            if tempo >= 0.85:                       # укладывается темпом
                tempo = min(2.0, tempo)
                chain = 'atempo=%s,' % tempo
                shift = shift / tempo
            else:                                   # укладывается повтором
                cycle = meas['attack'] + 0.06       # один прогон серии
                n = math.ceil((d + onset) / cycle)
                tempo = min(1.5, max(0.85, round(n * cycle / (d + onset), 3)))
                fin = onset / tempo + d
                chain = ('aformat=sample_rates=48000,atrim=0:%.3f,'
                         'asetpts=N/SR/TB,aloop=loop=%d:size=%d,'
                         'atempo=%s,atrim=0:%.3f,'
                         'afade=t=out:st=%.3f:d=0.10,asetpts=N/SR/TB,'
                         % (cycle, n - 1, int(cycle * 48000), tempo,
                            fin + 0.10, fin))
                shift = onset / tempo
        start = max(0.0, c['t'] - shift)
        ms = int(round(start * 1000))
        ff += ['-i', os.path.join(HERE, rel)]
        parts.append(f"[{i+2}:a]{chain}adelay={ms}|{ms},volume={gain}dB[s{i}]")
        mix.append(f"[s{i}]")
        tmp = ('  повтор' if 'aloop' in chain else
               f"  темп ×{tempo}" if abs(tempo - 1.0) > 0.01 else '')
        print(f"  событие {c['t']:>6.2f}  старт {start:>6.2f}  по {mode:<5} {c['s']:<7}"
              f" {os.path.basename(rel):<20} {target:>6.1f} дБ  ({why}){tmp}")

    # Потолок. После прибавки в 6 дБ сумма речи и удара выходила на 0,0 дБ,
    # а в замере по сэмплам — на +0,6: это уже клиппинг на декодере. Лимитер
    # срезает только сами пики (порог −1 дБ), громкость остального не трогает.
    graph = ';'.join(parts) + ';' + ''.join(mix) + \
            f"amix=inputs={len(cues)+1}:normalize=0:dropout_transition=0[m];" + \
            "[m]alimiter=limit=0.891:attack=5:release=50:level=false[a]"

    # Громкость приводим к норме площадки в два прохода: сначала сводим
    # звук в WAV и меряем, потом ставим точную добавку. Один проход
    # loudnorm подгоняет динамику на ходу и промахивается на доли децибела,
    # а здесь промах виден в ленте: замеренные 20.09.2026 наши −22,2 LUFS
    # против −14,3 у всех трёх чужих роликов — это восемь децибел тишины,
    # которые YouTube не поднимет.
    цель = TSEL
    if '--lufs' in sys.argv:
        цель = float(sys.argv[sys.argv.index('--lufs') + 1].replace(',', '.'))
    if '--bez-lufs' in sys.argv:
        цель = None

    with tempfile.TemporaryDirectory() as tmpd:
        свод = os.path.join(tmpd, 'zvuk.wav')
        subprocess.run(ff + ['-filter_complex', graph, '-map', '[a]',
                             '-c:a', 'pcm_s16le', свод], check=True)
        добавка = 0.0
        if цель is not None:
            было = gromkost(свод)
            if было is None:
                print('  громкость измерить не вышло — оставляю как есть')
            else:
                добавка = round(цель - было, 1)
                print(f"\nгромкость {было:+.1f} LUFS → цель {цель:+.1f}, "
                      f"добавка {добавка:+.1f} дБ")
        цепь = (f"volume={добавка}dB,alimiter=limit=0.891:attack=5:release=50:level=false"
                if abs(добавка) > 0.05 else
                "alimiter=limit=0.891:attack=5:release=50:level=false")
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', video, '-i', свод,
                        '-filter_complex', f"[1:a]{цепь}[a]",
                        '-map', '0:v', '-map', '[a]', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', out], check=True)
        стало = gromkost(out)
        if стало is not None:
            знак = '✓' if цель is None or abs(стало - цель) <= 0.7 else '✕'
            print(f"  на выходе {стало:+.1f} LUFS {знак}")
    print(f"\n→ {out}")


if __name__ == '__main__':
    main()
