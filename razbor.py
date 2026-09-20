#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
razbor.py — измерить чужой ролик и записать числа.

    python3 razbor.py ролик.mp4 [папка-вывода]

Считает то, что раньше считалось руками при разборе `Primeri/`:
склейки, переходы, доля покоя, дрейф кадра, громкость, плотность
звуковых событий, темп речи по субтитрам.

На выходе — `metrics.json` и двенадцать кадров. Видео дальше не нужно:
в репозиторий едут числа и картинки, а не гигабайты.

Зависимости: ffmpeg и numpy. Ничего больше.
"""

import json, math, os, re, subprocess, sys
import numpy as np
# Windows-консоль отдаёт cp1251, и первая же стрелка «→» роняет скрипт
# с UnicodeEncodeError. Проверено на раннере 20.09.2026: разбор дошёл до
# конца, а упала печать результата. Переключаем поток на UTF-8 сразу.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

W, H = 96, 170            # кадр для покадровой разницы: мелкий, но хватает
BIG_W, BIG_H = 192, 340   # для дрейфа нужна детализация повыше
FPS = 30


def sh(cmd):
    return subprocess.run(cmd, capture_output=True).stdout


def probe(path):
    """Длина, размер и частота кадров — из самого ffmpeg, без ffprobe:
    в облаке ffprobe нет, imageio-ffmpeg кладёт только ffmpeg."""
    txt = subprocess.run(['ffmpeg', '-hide_banner', '-i', path],
                         capture_output=True).stderr.decode('utf-8', 'ignore')
    dur = re.search(r'Duration:\s*(\d+):(\d+):([\d.]+)', txt)
    size = re.search(r',\s*(\d{3,4})x(\d{3,4})', txt)
    fps = re.search(r'([\d.]+)\s*fps', txt)
    return {
        'длина': round(int(dur.group(1))*3600 + int(dur.group(2))*60 + float(dur.group(3)), 2) if dur else None,
        'ширина': int(size.group(1)) if size else None,
        'высота': int(size.group(2)) if size else None,
        'fps': float(fps.group(1)) if fps else None,
    }


def gray(path, w, h, ss=None, t=None):
    cmd = ['ffmpeg', '-v', 'error']
    if ss is not None: cmd += ['-ss', str(ss)]
    if t is not None:  cmd += ['-t', str(t)]
    cmd += ['-i', path, '-vf', f'scale={w}:{h}', '-pix_fmt', 'gray', '-f', 'rawvideo', '-']
    raw = sh(cmd)
    a = np.frombuffer(raw, dtype=np.uint8).astype(np.float32)
    n = len(a) // (w*h)
    return a[:n*w*h].reshape(n, h, w)


def cuts(path):
    """Жёсткие склейки. Всё остальное — плавные переходы, и это главное
    число разбора: у роликов-образцов склеек три на минуту с лишним."""
    txt = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', path, '-vf',
         "select='gt(scene,0.3)',metadata=print", '-an', '-f', 'null', '-'],
        capture_output=True).stderr.decode('utf-8', 'ignore')
    return [round(float(m), 2) for m in re.findall(r'pts_time:([\d.]+)', txt)]


def motion(path):
    """Кривая покадровой разницы: где движение, где покой."""
    a = gray(path, W, H)
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))
    thr = max(0.8, float(np.percentile(d, 60)) * 2.5)
    ev, i = [], 0
    while i < len(d):
        if d[i] > thr:
            j = i
            while j < len(d) and d[j] > thr*0.5:
                j += 1
            ev.append({'t': round(i/FPS, 2), 'длит': round((j-i)/FPS, 2),
                       'пик': round(float(d[i:j].max()), 1)})
            i = j
        else:
            i += 1
    return {
        'кадров': len(d)+1,
        'событий': len(ev),
        'средняя_длительность': round(float(np.mean([e['длит'] for e in ev])), 2) if ev else None,
        'доля_покоя': round(float((d < 0.35).sum()/len(d)), 2),
        'события': ev[:40],
    }


def anatomy(path, t0):
    """Анатомия одного перехода: яркость и резкость по кадрам.
    Падение резкости — это расфокус, половина ощущения мягкости."""
    a = gray(path, W, H, ss=max(0, t0-0.4), t=1.4)
    if len(a) < 8: return None
    c = a[:, 40:140, 10:86].mean(axis=(1, 2))
    g = (np.abs(np.diff(a, axis=2)).mean(axis=(1, 2)) +
         np.abs(np.diff(a, axis=1)).mean(axis=(1, 2))) / 2
    lo = int(np.argmin(c))
    return {
        'яркость_до': round(float(c[:3].mean()), 1),
        'яркость_в_провале': round(float(c[lo]), 1),
        'яркость_после': round(float(c[-3:].mean()), 1),
        'резкость_до': round(float(g[:3].mean()), 2),
        'резкость_в_провале': round(float(g[lo]), 2),
        'уход_с': round(max(0, t0-0.4), 2),
        'провал_на': round(max(0, t0-0.4) + lo/FPS, 2),
        'расфокус_во_сколько_раз': round(float(g[:3].mean()/max(g[lo], 0.01)), 1),
    }


def drift(path, t0, t1):
    """Смещение картинки за окно покоя: кадр не должен замирать совсем."""
    a = gray(path, BIG_W, BIG_H, ss=t0, t=t1-t0)
    if len(a) < 4: return None
    A, B = a[0], a[-1]
    best = (1e9, 0, 0)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            v = float(np.abs(A - np.roll(np.roll(B, dy, 0), dx, 1))[10:-10, 10:-10].mean())
            if v < best[0]: best = (v, dx, dy)
    k = 1080 / BIG_W
    return {'за_секунд': round(t1-t0, 1),
            'смещение_px': round(math.hypot(best[1], best[2]) * k, 1)}


def sound(path):
    """Громкость и плотность звуковых событий. Речь не распознаём —
    весов моделей в контейнере нет, — но паузы и удары слышно по огибающей."""
    txt = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af',
                          'ebur128=framelog=quiet', '-f', 'null', '-'],
                         capture_output=True).stderr.decode('utf-8', 'ignore')
    I = re.search(r'I:\s*(-?[\d.]+)\s*LUFS', txt)
    raw = sh(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '8000',
              '-f', 's16le', '-'])
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    if len(x) < 8000: return {'громкость_LUFS': None}
    win = 400                                   # 50 мс
    env = np.abs(x[:len(x)//win*win].reshape(-1, win)).max(axis=1)
    thr = float(np.percentile(env, 85)) * 0.9
    hits, last = 0, -99
    for i, v in enumerate(env):
        if v > thr and i - last > 6:
            hits += 1; last = i
    dur = len(x) / 8000
    return {
        'громкость_LUFS': float(I.group(1)) if I else None,
        'доля_тишины': round(float((env < np.percentile(env, 20)).sum()/len(env)), 2),
        'звуковых_событий_в_минуту': round(hits / dur * 60, 1),
    }


def subs(folder):
    """Субтитры, если их положили рядом: слов, темп, число реплик."""
    for name in os.listdir(folder):
        if name.endswith(('.vtt', '.srt')):
            txt = open(os.path.join(folder, name), encoding='utf-8', errors='ignore').read()
            times = re.findall(r'(\d+):(\d\d):([\d.,]+)\s*-->', txt)
            body = re.sub(r'<[^>]+>', '', txt)
            body = re.sub(r'^(WEBVTT|Kind:|Language:|\d+$|[\d:.,\s>-]+$)', '',
                          body, flags=re.M)
            words = [w for w in body.split() if any(ch.isalpha() for ch in w)]
            if not times: return None
            t0 = int(times[0][0])*3600 + int(times[0][1])*60 + float(times[0][2].replace(',', '.'))
            t1 = int(times[-1][0])*3600 + int(times[-1][1])*60 + float(times[-1][2].replace(',', '.'))
            span = max(t1 - t0, 1)
            return {'реплик': len(times), 'слов': len(words),
                    'темп_слов_в_секунду': round(len(words)/span, 2)}
    return None


def frames(path, out, dur, n=12):
    os.makedirs(out, exist_ok=True)
    for i in range(n):
        t = dur * (i + 0.5) / n
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.2f}', '-i', path,
                        '-frames:v', '1', '-vf', 'scale=360:-1',
                        os.path.join(out, f'k{i:02d}.jpg')], capture_output=True)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(path)[0]
    os.makedirs(out, exist_ok=True)

    m = {'файл': os.path.basename(path)}
    m.update(probe(path))
    m['склейки'] = cuts(path)
    m['движение'] = motion(path)
    m['звук'] = sound(path)
    s = subs(out) or subs(os.path.dirname(path) or '.')
    if s: m['речь'] = s

    # анатомия трёх самых заметных переходов (не склеек)
    hard = set(int(c) for c in m['склейки'])
    ev = [e for e in m['движение']['события'] if int(e['t']) not in hard]
    ev.sort(key=lambda e: -e['пик'])
    m['переходы'] = [dict(t=e['t'], **(anatomy(path, e['t']) or {})) for e in ev[:3]]

    # дрейф в самом длинном промежутке покоя
    ts = [e['t'] for e in m['движение']['события']]
    gaps = [(b-a, a) for a, b in zip(ts, ts[1:])] if len(ts) > 1 else []
    if gaps:
        g, a = max(gaps)
        m['дрейф'] = drift(path, a+0.6, min(a+0.6+3.0, a+g-0.2))

    frames(path, os.path.join(out, 'kadry'), m['длина'] or 10)
    with open(os.path.join(out, 'metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)

    d = m['движение']
    print(f"{m['файл']}: {m['длина']} с, {m['ширина']}×{m['высота']}")
    print(f"  жёстких склеек      {len(m['склейки'])}")
    print(f"  событий движения    {d['событий']}, средняя {d['средняя_длительность']} с")
    print(f"  доля покоя          {int(d['доля_покоя']*100)}%")
    if m['переходы'] and m['переходы'][0].get('расфокус_во_сколько_раз'):
        print(f"  расфокус на уходе   ×{m['переходы'][0]['расфокус_во_сколько_раз']}")
    if m.get('дрейф'):
        print(f"  дрейф               {m['дрейф']['смещение_px']} px за {m['дрейф']['за_секунд']} с")
    print(f"  громкость           {m['звук']['громкость_LUFS']} LUFS, "
          f"событий {m['звук']['звуковых_событий_в_минуту']}/мин")
    if s: print(f"  речь                {s['слов']} слов, {s['темп_слов_в_секунду']} сл/с")
    print(f"→ {out}/metrics.json и {out}/kadry")


if __name__ == '__main__':
    main()
