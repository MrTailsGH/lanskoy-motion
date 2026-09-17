#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sfxindex.py — замерить все звуки и сложить в sfx-index.json.

    python3 sfxindex.py

Замеряется четыре числа на файл:
  длина    сколько занимает на таймлайне
  атака    от начала файла до пика
  начало   первое слышимое место (onset)

  По какому из двух равнять — зависит от звука. У удара с хвостом пик и
  начало почти совпадают, равнять можно по любому. А у звука-серии пик
  сидит в хвосте: у counter.mp3 девять щелчков идут с 0,10 по 0,71, а пик
  на 0,75. Выровняй такой по пику — и вся серия отыграет ДО события.
  Поэтому у реплики в сцене есть режим: 'peak' или 'onset'.
  пик      максимум в дБ — насколько файл уже в потолке
  тембр    центр тяжести спектра на пике; выше 3 кГц звук спорит с
           разборчивостью речи и его надо опускать ещё на 3 дБ

Справочник assets/sfx/SFX.md написан человеком; этот индекс считается
машиной и используется при сведении. Расхождения печатаются.
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOTS = [os.path.join(HERE, 'assets', 'sfx'), os.path.join(HERE, 'sfx')]
EXTS = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aif', '.aiff')
SR = 22050


def pcm(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1',
                        '-ar', str(SR), '-f', 's16le', '-'], capture_output=True)
    if p.returncode != 0:
        return None
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768


def measure(path):
    x = pcm(path)
    if x is None or x.size < 256:
        return None
    HOP = 256
    n = x.size // HOP
    fr = x[:n * HOP].reshape(n, HOP)
    rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
    i = int(np.argmax(rms))
    db = 20 * np.log10(rms + 1e-12)
    floor = float(np.percentile(db, 10))
    onset = int(np.argmax(db > floor + 12))
    W = 2048
    s = max(0, i * HOP - W // 2)
    seg = x[s:s + W]
    if seg.size < W:
        seg = np.pad(seg, (0, W - seg.size))
    S = np.abs(np.fft.rfft(seg * np.hanning(W))) ** 2
    f = np.fft.rfftfreq(W, 1 / SR)
    centroid = float((f * S).sum() / (S.sum() + 1e-12))
    return {
        'len':   round(x.size / SR, 3),
        'attack': round(i * HOP / SR, 3),
        'onset': round(onset * HOP / SR, 3),
        'peak':  round(float(20 * np.log10(np.abs(x).max() + 1e-9)), 1),
        'hz':    int(centroid),
    }


def main():
    out = {}
    for root in ROOTS:
        if not os.path.isdir(root):
            continue
        for dirpath, _, files in os.walk(root):
            for f in sorted(files):
                if not f.lower().endswith(EXTS):
                    continue
                p = os.path.join(dirpath, f)
                m = measure(p)
                if m:
                    out[os.path.relpath(p, HERE)] = m
    with open(os.path.join(HERE, 'sfx-index.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"замерено файлов: {len(out)}")
    return out


if __name__ == '__main__':
    o = main()
    print(f"\n{'файл':<42}{'длина':>7}{'начало':>8}{'атака':>7}{'пик':>7}{'тембр':>8}")
    for k in sorted(o):
        m = o[k]
        print(f"{k:<42}{m['len']:>7.2f}{m['onset']:>8.2f}{m['attack']:>7.2f}{m['peak']:>7.1f}{m['hz']:>8}")
