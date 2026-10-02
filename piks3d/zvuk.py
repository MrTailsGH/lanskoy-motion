#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""zvuk.py — чиптюн теста №6 «Пиксель-3D» v3, 30 с.

    python3 piks3d/zvuk.py [выход.wav]

Квадратные и треугольные волны, шумовые барабаны, объёмные удары. Четыре
части: вступление (0–4), весёлая улица (4–14), бой с инфляцией в миноре
(14–21), победа и башни (21–30). Каждое событие картинки озвучено:
буквы титула, прыжки Рублика, монеты, воришка, такси, призрак, копилка,
итог дня, падение босса, ценники, меню, щит, сравнение, заряд, луч,
взрыв, кубики в башнях, цель, логотип, кнопка. Громкость потом −14 LUFS.
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 30.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)


def put(s, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0:
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


def sweep(f0, f1, d, duty=.5, k=1.5):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d)
    return pulse(f, d, duty, k)


def boom(d=1.0):
    t = tt(d); f = 35 + 110 * np.exp(-t * 7)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) + noise(d, 5, .25) * .9


def coin(t, g=.5, pan=0.):
    put(pulse(mf(83), .06, .5, 2), t, g, pan); put(pulse(mf(88), .25, .5, 4), t + .06, g, pan)


def jingle(t, notes, step=.08, g=.4, dur=.14):
    for k, m in enumerate(notes):
        put(pulse(mf(m), dur, .25, 3), t + k * step, g, .15 * ((k % 2) * 2 - 1))


def ticks(t0, t1, cps=30, f=1800, g=.18):
    t = t0
    while t < t1:
        put(pulse(f + 60 * (int(t * 97) % 3), .02, .5, 6), t, g, .1); t += 1 / cps


# ── музыка ──
PART = [(0, 4.0, [(45, [57, 60, 64, 69])], .9),                                   # Am, вступление
        (4.0, 13.9, [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])], 1.0),  # C G Am F
        (13.9, 21.1, [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 68]), (40, [56, 59, 64, 68]), (45, [57, 60, 64, 69])], 1.15),  # бой
        (21.1, 30.0, [(41, [57, 60, 65, 69]), (43, [59, 62, 67, 71]), (48, [60, 64, 67, 72]), (48, [60, 64, 67, 72])], 1.0)]  # F G C C
BAR = 2.0
for a, b, prog, drive in PART:
    t = a; k = 0
    while t < b - 1e-6:
        root, ch = prog[int((t - a) / BAR) % len(prog)]
        if t >= .6:
            put(tri(mf(root + (12 if k % 2 else 0)), .24, 4), t, .9 * drive)
        t += .25; k += 1
    t = a; k = 0
    while t < b - 1e-6:
        root, ch = prog[int((t - a) / BAR) % len(prog)]
        if t >= 1.0:
            put(pulse(mf(ch[k % 4] + 12), .12, .125, 6), t, .32, .25 * ((k % 2) * 2 - 1))
        t += .125; k += 1
    if a >= 4:   # мелодия на улице и в победе
        mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 74] if a != 13.9 else [69, 72, 76, 72, 68, 71, 76, 71, 69, 72, 77, 76, 74, 72, 71, 68]
        t = a + .5; k = 0
        while t < b - .4:
            put(pulse(mf(mel[k % len(mel)]), .22, .5 if a == 13.9 else .25, 3), t, .2, -.2)
            t += .5; k += 1
for i in range(2, 60):
    tb = i * .5
    if 13.9 <= tb < 14.8 or 20.4 <= tb < 21.5 or tb >= 29.5:
        continue
    put(boom(.25) * .7, tb, .5)
    if i % 2:
        put(noise(.18, 7, .5), tb, .35, .1)
    put(noise(.04, 9), tb + .25, .12, -.3)
    if 14 < tb < 21:
        put(noise(.03, 9), tb + .125, .09, .3); put(noise(.03, 9), tb + .375, .09, .3)

# ── события ──
put(pulse(mf(84), .05, .5), .02, .5)
for i in range(10):
    put(pulse(mf(60 + i * 2), .05, .25, 5), .15 + i * .1, .5, (i - 5) * .1)
for m in (69, 73, 76, 81):
    put(pulse(mf(m), .6, .25, 3), 1.4, .28)
put(pulse(mf(88), .04, .5), 2.2, .4); put(pulse(mf(91), .04, .5), 2.25, .4)
for k in range(5):
    put(pulse(mf(96), .03, .5), 2.9 + k * .08, .35)
put(sweep(1600, 120, .7), 3.3, .5)
# прыжки Рублика — как в сцене
HK = [[4.0, -24], [4.6, -16], [6.0, -16], [6.6, -6], [7.7, -6], [8.1, 0], [9.3, 0], [9.75, 6], [10.05, 6], [10.45, 10.2, 'big'], [10.75, 11], [11.1, 20], [22.2, 20], [23.2, 12]]
for i in range(1, len(HK)):
    t0, x0 = HK[i - 1][:2]; t1, x1 = HK[i][:2]
    if x1 == x0:
        continue
    if len(HK[i]) > 2:
        put(sweep(200, 900, .3, .5), t0, .45); continue
    n = max(1, round(abs(x1 - x0) / 3.2))
    for k in range(n):
        put(sweep(220, 660, .1, .5), t0 + (t1 - t0) * k / n, .3, -.2)
for k in range(5):
    put(sweep(220, 660, .1, .5), 13.2 + k / 3, .25); put(sweep(220, 660, .1, .5), 25.0 + k * .4, .25)
for tc in (4.9, 5.25, 5.6, 5.95):
    coin(tc, .55, .2)
put(sweep(300, 900, .12, .25), 6.5, .4)                     # воришка выскакивает
put(sweep(900, 300, .2, .25), 7.05, .45); put(noise(.12, 6, .5), 7.05, .4)
t = tt(1.2); f = 180 * (1 + .3 * np.tanh((.6 - t) * 6))      # такси: доплер
put((np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * noise(1.2, 1, .3)) * np.sin(np.pi * t / 1.2) ** 2 * .5, 8.0, .7)
put(boom(.5) * .6, 8.6, .8); put(sweep(800, 200, .2, .25), 8.6, .4)
for k in range(6):                                         # призрак-автоплатёж
    put(pulse(mf(62 + (k % 2) * 3), .1, .5, 3), 9.45 + k * .1, .15)
put(noise(.3, 4, .5), 10.45, .5); put(sweep(1200, 200, .25), 10.45, .4)
jingle(10.55, [76, 81, 88], .06, .35)
for k in range(7):                                         # копилка
    put(pulse(mf(76 + k * 2), .05, .5, 3), 11.35 + k * .1, .35, .3)
put(pulse(mf(88), .04, .5), 12.0, .4)
ticks(12.4, 12.9, 24, 2000, .15)
jingle(13.0, [72, 76, 79, 84, 79, 84], .09, .45)
# бой
put(sweep(1800, 200, .8), 13.9, .3)
put(sweep(1200, 140, .6, .5), 14.15, .45)
put(boom(1.2), 14.75, 1.2); put(noise(.6, 3, .5), 14.75, .6)
ticks(14.85, 15.4, 34)
for k in range(3):
    put(sweep(500, 1200, .12, .25), 15.15 + k * .12, .35, -.3)
put(noise(.3, 4, .5), 15.6, .6); put(sweep(400, 90, .3, .25), 15.6, .5)
ticks(15.6, 16.2, 34)
put(pulse(mf(84), .04, .5), 16.4, .35); put(pulse(mf(86), .04, .5), 16.9, .35)
for k in range(3):
    put(pulse(mf(91), .03, .5), 17.0 + k * .1, .35)
ticks(17.2, 17.8, 34)
for k in range(12):
    put(pulse(mf(79 + (k % 4) * 3), .05, .5, 4), 17.4 + k * .05, .2, .2)
put(pulse(mf(84), .04, .5), 17.8, .35)
put(sweep(200, 700, .4, .5), 18.0, .25); put(sweep(200, 560, .35, .5), 18.3, .25)
put(pulse(mf(88), .05, .5), 18.9, .35)
jingle(19.3, [72, 76, 79, 84], .07, .4)
put(pulse(mf(86), .04, .5), 19.9, .35)
for k in range(3):
    put(pulse(mf(91), .03, .5), 20.0 + k * .1, .35)
ticks(20.2, 20.7, 34)
put(sweep(150, 2000, .65, .125, .5), 20.4, .6)
put(noise(.25, 3, 1), 20.98, .5); put(sweep(2600, 300, .25, .5), 20.98, .5)
put(boom(1.6), 21.1, 1.5); put(noise(1.2, 3, .5), 21.1, .8)
jingle(21.4, [72, 76, 79, 84, 88], .08, .45, .2)
# башни
for i in range(80):
    t = 22.0 + i * .028
    put(pulse(mf(60 + (i % 20) + i // 20 * 4), .03, .5, 6), t, .2, ((i % 20) - 10) * .07)
ticks(22.8, 24.8, 20, 1500, .1)
for m in (76, 81, 88):
    put(tri(mf(m), .8, 3), 25.0, .45)
put(pulse(mf(84), .04, .5), 25.3, .35)
put(pulse(mf(79), .04, .5), 26.2, .3); put(pulse(mf(83), .04, .5), 26.4, .3); put(pulse(mf(86), .04, .5), 26.8, .3)
for k, m in enumerate((72, 76, 79, 84, 88)):
    put(pulse(mf(m), .7, .25, 2.5), 27.9 + k * .04, .3)
put(pulse(mf(88), .04, .5), 28.8, .35)
put(noise(.05, 9), 29.25, .4); put(pulse(mf(96), .06, .5), 29.3, .4)
jingle(29.45, [84, 88, 91], .06, .4)
for m in (60, 64, 67, 72):
    put(tri(mf(m), .6, 2), 29.4, .3)

mix = np.stack([L, R]); mix = np.tanh(mix * 1.1)
fl = int(.3 * SR); mix[:, -fl:] *= np.linspace(1, 0, fl)
mix /= np.max(np.abs(mix)) * 1.1
out = sys.argv[1] if len(sys.argv) > 1 else 'PIKS3D.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print(out, f'{DUR:.0f} с')
