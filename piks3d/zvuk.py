#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""zvuk.py — чиптюн теста №6 «Пиксель-3D», 10 с.

    python3 piks3d/zvuk.py [выход.wav]

Квадратные и треугольные волны, шумовые барабаны — как в «Рубль-квесте»,
плюс объёмные удары из «Неона» на падении и взрыве босса. Каждое событие
картинки озвучено: буквы титула щёлкают по нарастающей, прыжки, монеты,
босс падает, бьёт, заряд, луч, взрыв, кубики садятся в башни — каскадом
от низких к высоким, цель, логотип. Громкость потом −14 LUFS.
"""
import sys, wave
import numpy as np

SR = 48000
N = int(SR * 10)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)


def put(s, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    s = s[:N - i] * g
    L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
    R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414


tt = lambda d: np.arange(int(d * SR)) / SR
mf = lambda m: 440 * 2 ** ((m - 69) / 12)


def env(d, a=.003, k=6.0):
    t = tt(d); return np.minimum(1, t / a) * np.exp(-k * t / d)


def pulse(f, d, duty=.25, k=4.0):
    t = tt(d); ph = (np.cumsum(np.broadcast_to(f, t.shape)) / SR) % 1
    return np.where(ph < duty, 1., -1.) * env(d, .002, k) * .3


def tri(f, d, k=3.0):
    t = tt(d); ph = (f * t) % 1
    return (4 * np.abs(ph - .5) - 1) * env(d, .002, k) * .45


def noise(d, k=8.0, cut=1.0):
    n = rng.standard_normal(int(d * SR))
    if cut < 1:
        n = np.convolve(n, np.ones(int(1 / cut)) * cut, 'same')
    return n * env(d, .001, k) * .4


def sweep(f0, f1, d, duty=.5):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d)
    return pulse(f, d, duty, 1.5)


def boom(d=1.0):
    t = tt(d); f = 35 + 110 * np.exp(-t * 7)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) + noise(d, 5, .25) * .9)


B = .5   # 120 уд/мин
# ── музыка: бас треугольником, арпеджио квадратом, шумовые барабаны ──
PROG = [(0, 2.5, 45, [57, 60, 64, 69]), (2.5, 5.0, 41, [57, 60, 65, 69]), (5.0, 6.8, 40, [56, 59, 64, 68]), (6.8, 8.6, 36, [55, 60, 64, 67]),
        (8.6, 10.0, 45, [57, 61, 64, 69])]
for a, b, root, ch in PROG:
    t = a
    k = 0
    while t < b - 1e-6:
        if t >= .5:
            put(tri(mf(root + (12 if k % 2 else 0)), .24, 4), t, .9)
        t += .25; k += 1
    t = a; k = 0
    while t < b - 1e-6:
        if t >= 1.0:
            put(pulse(mf(ch[k % 4] + 12), .12, .125, 6), t, .35, .25 * ((k % 2) * 2 - 1))
        t += .125; k += 1
for i in range(2, 20):
    tb = i * B
    if 5.0 <= tb < 5.6 or 6.7 <= tb < 7.1:
        continue
    put(boom(.25) * .7, tb, .5)
    if i % 2:
        put(noise(.18, 7, .5), tb, .35, .1)
    put(noise(.04, 9), tb + .25, .12, -.3)

# ── события ──
put(pulse(mf(84), .05, .5), .02, .5)
for i in range(10):                                    # буквы титула
    put(pulse(mf(60 + i * 2), .05, .25, 5), .12 + i * .08, .5, (i - 5) * .1)
for m in (69, 73, 76, 81):
    put(pulse(mf(m), .5, .25, 3), 1.1, .3)
put(pulse(mf(88), .04, .5), 1.7, .4); put(pulse(mf(91), .04, .5), 1.75, .4)
for k in range(5):
    put(pulse(mf(96), .03, .5), 2.2 + k * .08, .35)
put(sweep(1600, 120, .55), 2.5, .5)                    # титул рассыпается, кран вниз
for k in range(6):                                     # прыжки
    put(sweep(220, 660, .1, .5), 2.6 + k * .45, .35, -.2)
for tc in (3.2, 3.65, 4.1):                            # монеты
    put(pulse(mf(83), .06, .5, 2), tc, .55, .2); put(pulse(mf(88), .25, .5, 4), tc + .06, .55, .2)
put(sweep(900, 80, .6, .5), 5.0, .5)                   # босс падает
put(boom(1.1), 5.6, 1.1)
put(sweep(600, 200, .25), 5.62, .4)
put(noise(.3, 4, .5), 5.88, .6); put(sweep(400, 90, .3, .25), 5.88, .5)
put(sweep(150, 1800, .45, .125), 6.3, .55)             # заряд
put(noise(.2, 3, 1), 6.62, .5); put(sweep(2400, 300, .2, .5), 6.62, .5)
put(boom(1.4), 6.8, 1.4); put(noise(1.0, 3, .5), 6.8, .7)
for k, m in enumerate((72, 76, 79, 84)):               # «ПОБЕДА!»
    put(pulse(mf(m), .12, .25, 4), 6.95 + k * .07, .45)
for i in range(60):                                    # кубики садятся в башни
    t = 7.75 + i * .025
    put(pulse(mf(60 + (i % 20) + i // 20 * 5), .03, .5, 6), t, .22, ((i % 20) - 10) * .07)
for m in (76, 81, 88):
    put(tri(mf(m), .7, 3), 9.0, .45)
for k, m in enumerate((69, 73, 76, 81, 85)):           # логотип
    put(pulse(mf(m), .6, .25, 2.5), 9.35 + k * .03, .3)

mix = np.stack([L, R]); mix = np.tanh(mix * 1.1)
fl = int(.2 * SR); mix[:, -fl:] *= np.linspace(1, 0, fl)
mix /= np.max(np.abs(mix)) * 1.1
out = sys.argv[1] if len(sys.argv) > 1 else 'PIKS3D.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print(out, '10 с')
