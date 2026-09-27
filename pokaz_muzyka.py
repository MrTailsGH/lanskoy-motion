#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pokaz_muzyka.py — музыкальная подложка для pokaz.html, синтез без сэмплов.

    python3 pokaz_muzyka.py voice/POKAZ.wav

120 ударов в минуту, такт 2 с — смены сцен в pokaz.html стоят на сильных
долях. Аккорды Am–F–C–G по такту на аккорд, бас восьмыми, бочка на каждую
долю, хлопок на вторую и четвёртую, закрытый хэт между долями. Пэд и бас
приседают под бочку. Вступление и белый акт — без ударных, перед 8, 30,
128 и 146 секундой — нарастание шумом. Своих файлов нет, лицензий нет.
"""
import sys, wave
import numpy as np

SR, DUR, BPM = 44100, 154.0, 120
N = int(SR * DUR)
t = np.arange(N) / SR
beat = 60 / BPM
rng = np.random.default_rng(7)


def env_exp(x, k):
    return np.where(x >= 0, np.exp(-np.maximum(x, 0) * k), 0.0)


def drums_on(tt):
    """ударные: с 8 с до 146, кроме белого акта 128–136"""
    return ((tt >= 8) & (tt < 128)) | ((tt >= 136) & (tt < 146))


out_l = np.zeros(N)
out_r = np.zeros(N)

# ── бочка, хлопок, хэт ────────────────────────────────────────────
kick = np.zeros(N); snare = np.zeros(N); hat = np.zeros(N)
kick_env = np.zeros(N)
L = int(0.45 * SR); tk = np.arange(L) / SR
ph = 2 * np.pi * np.cumsum(48 + 110 * np.exp(-tk * 32)) / SR
K = np.sin(ph) * np.exp(-tk * 6.5)
Ls = int(0.3 * SR); ts = np.arange(Ls) / SR
noise = rng.standard_normal(Ls)
SN = (np.diff(np.concatenate([[0], noise])) * 0.55 * np.exp(-ts * 16) + np.sin(2 * np.pi * 190 * ts) * np.exp(-ts * 24) * 0.5)
Lh = int(0.06 * SR); th = np.arange(Lh) / SR
HH = np.diff(np.concatenate([[0], rng.standard_normal(Lh)])) * np.exp(-th * 70) * 0.35

for i in range(int(DUR / beat)):
    tb = i * beat
    if not drums_on(np.array([tb]))[0]:
        continue
    a = int(tb * SR)
    b = min(N, a + L); kick[a:b] += K[:b - a]
    kick_env[a:b] = np.maximum(kick_env[a:b], np.exp(-tk[:b - a] * 9))
    if i % 2 == 1:
        b = min(N, a + Ls); snare[a:b] += SN[:b - a]
    for off in (beat / 2,):
        c = int((tb + off) * SR); d = min(N, c + Lh)
        if c < N: hat[c:d] += HH[:d - c]

# ── аккорды и бас ────────────────────────────────────────────────
CH = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (130.81, 261.63, 392.0), (196.0, 246.94, 293.66)]
ROOT = [110.0, 87.31, 65.41, 98.0]
bar = 4 * beat
idx = (np.floor(t / bar).astype(int)) % 4
pos = t % bar
pad = np.zeros(N); bass = np.zeros(N)
for k in range(4):
    m = idx == k
    tt = t[m]; pp = pos[m]
    env = np.minimum(1, pp / 0.25) * np.minimum(1, (bar - pp) / 0.15)
    s = np.zeros(tt.size)
    for f in CH[k]:
        for det in (-0.12, 0.12):
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * (1 + det / 100) * h * tt) / (h * 1.6)
    pad[m] = s * env
    r = ROOT[k]
    e8 = env_exp(pp % (beat / 2), 7) * np.minimum(1, (pp % (beat / 2)) / 0.004)
    bass[m] = (np.sin(2 * np.pi * r * tt) + 0.35 * np.sin(4 * np.pi * r * tt) + 0.12 * np.sin(6 * np.pi * r * tt)) * e8
pad *= 0.045
bass *= 0.30 * drums_on(t)
duck = 1 - 0.65 * kick_env
pad *= duck; bass *= duck
# пэд тише под ударными, громче во вступлении и на белом акте
pad *= np.where(drums_on(t), 0.8, 1.25)

# ── нарастания перед большими сменами ─────────────────────────────
rise = np.zeros(N)
for tr_t in (8.0, 30.0, 128.0, 146.0):
    a, b = int((tr_t - 1.6) * SR), int(tr_t * SR)
    x = np.linspace(0, 1, b - a)
    nz = rng.standard_normal(b - a)
    nz = np.diff(np.concatenate([[0], nz])) * (0.3 + 0.7 * x)
    rise[a:b] += nz * x ** 3 * 0.35

# ── сведение ─────────────────────────────────────────────────────
dry = kick * 0.9 + snare * 0.5 + bass + rise
out_l = dry + pad + hat * 0.8
out_r = dry + pad * 0.96 + np.roll(hat, int(0.004 * SR)) * 0.8
fade = np.minimum(1, t / 0.5) * np.minimum(1, (DUR - t) / 1.5)
out = np.stack([out_l, out_r], 1) * fade[:, None]
out /= np.max(np.abs(out)) * 1.12
pcm = (out * 32767).astype(np.int16)

path = sys.argv[1] if len(sys.argv) > 1 else 'voice/POKAZ.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{path}: {DUR:.0f} с, {BPM} ударов в минуту')
