#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tizer_zvuk.py — звук 10-секундного 3D-тизера «Неон-рубль» (тест №5).

    python3 kiber/tizer_zvuk.py [выход.wav]

Тёмный синтвейв 120 уд/мин, ля минор: пила в басу с фильтром и «накачкой»
от бочки, суперпила-пэд, бочка/малый/хэт, плюс события картинки — зажигание
неона, пролёт такси, заряд и удар суперудара, взрыв тайника, щелчки
расшифровки, удар на пробитии цели. Склейки нарезки (2,4 · 4,2 · 6,4 ·
8,6 с) — глитч-шум. Всё синтезируется numpy, без сэмплов. Громкость
потом приводится к −14 LUFS двумя проходами loudnorm.
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 10.0
N = int(SR * DUR)
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(7)


def put(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[:N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * l * 1.414
    Rr[i:i + len(sig)] += sig * r * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=.005, r=None, curve=4.0):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    if r is None:
        r = d
    return e * np.exp(-curve * t / r)


def lp(x, fc):
    """однополюсный фильтр нижних частот, fc — число или массив"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def saw(f, d, det=0.0):
    t = tt(d)
    ph = (f * (1 + det)) * t
    return 2 * (ph - np.floor(ph + .5))


def mf(m):
    return 440 * 2 ** ((m - 69) / 12)


BEAT = .5
# ── барабаны ──
def kick():
    t = tt(.45); f = 45 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + .3 * np.sin(2 * np.pi * 60 * t) * np.exp(-t * 12)


def snare():
    t = tt(.6); n = rng.standard_normal(len(t))
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    tail = lp(n, 6000) * np.exp(-t * 7) * .7       # «закрытый» ревер 80-х
    return body * .6 + tail


def hat(d=.06):
    n = rng.standard_normal(int(d * SR))
    return (n - lp(n, 7000)) * env(d, .001, d, 6)


KICKS = []
for b in range(1, 20):
    tb = b * BEAT
    if 8.6 <= tb < 8.95:
        continue
    put(kick(), tb, .9); KICKS.append(tb)
    if b % 2 == 0:
        put(snare(), tb, .32, .05)
    for h in (0, .25):
        put(hat(), tb + h, .07 if h else .045, .3)

# накачка от бочки — для баса и пэда
pump = np.ones(N)
for kb in KICKS:
    i = int(kb * SR); m = min(N - i, int(.35 * SR))
    pump[i:i + m] = np.minimum(pump[i:i + m], 1 - .75 * np.exp(-np.arange(m) / SR * 9))

# ── гармония по склейкам: Am · F · Dm→E · C · Am ──
SEG = [(0, 2.4, 45, [57, 60, 64]), (2.4, 4.2, 41, [57, 60, 65]), (4.2, 5.4, 38, [57, 62, 65]), (5.4, 6.4, 40, [56, 59, 64]),
       (6.4, 8.6, 36, [55, 60, 64]), (8.6, 10.0, 45, [57, 60, 64, 69])]
bass = np.zeros(N); pad = np.zeros(N)
for a, b, root, ch in SEG:
    # бас: восьмые с октавой, пила через фильтр, раскрывается к концу отрезка
    k = 0; t0 = max(a, .5)
    while t0 < b - 1e-6:
        d = .25; f = mf(root + (12 if k % 2 else 0))
        s = (saw(f, d) + saw(f, d, .006)) * .5
        cut = 300 + 900 * ((t0 - a) / (b - a))
        s = lp(s, cut) * env(d, .004, .22, 3)
        i = int(t0 * SR); bass[i:i + len(s)] += s[:N - i]
        t0 += d; k += 1
    # пэд: суперпила
    d = b - a; t = tt(d); s = np.zeros(len(t))
    for m in ch:
        for dt in (-.012, -.004, .004, .012):
            s += saw(mf(m), d, dt)
    s = lp(s / (len(ch) * 4), 1800) * np.minimum(1, t / .08) * np.minimum(1, (d - t) / .05)
    i = int(a * SR); pad[i:i + len(s)] += s[:N - i]
bass *= pump; pad *= .5 + .5 * pump
put(bass, 0, .55); put(pad, 0, .22, -.1)


# ── события картинки ──
def sweep(f0, f1, d, amp=1.0, noise=0.0):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    if noise:
        s = s * (1 - noise) + lp(rng.standard_normal(len(t)), f1) * noise
    return s * amp * np.minimum(1, t / .01)


def boom(d=1.2):
    t = tt(d); f = 30 + 90 * np.exp(-t * 6)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 4) * .8)


def buzz(d):
    t = tt(d); s = saw(100, d) * .5 + saw(120, d) * .3
    gate = (rng.random(int(d * 40) + 1) > .35).repeat(SR // 40 + 1)[:len(t)]
    return lp(s, 2500) * gate * .4


def blip(f, d=.06):
    return np.sign(np.sin(2 * np.pi * f * tt(d))) * env(d, .001, d, 5) * .3


def glitchn(d=.35):
    t = tt(d); n = rng.standard_normal(len(t))
    sh = np.repeat(rng.standard_normal(int(d * 60) + 1), SR // 60 + 1)[:len(t)]
    return (n * .5 + sh * .6) * np.exp(-t * 6) * (np.sin(2 * np.pi * 37 * t) > -.2)


def riser(d):
    t = tt(d); return sweep(200, 2400, d, .5, .5) * (t / d) ** 2


# 0 · неоновый титул
put(buzz(.5), .03, .9, -.3); put(buzz(.5), .48, .9, .3)
put(sweep(60, 40, .9, .8), .05, .7)
put(sweep(2000, 200, .4, .15, .6), .85, .5)
for i in range(18):
    put(blip(1800 + 40 * (i % 5), .02), 1.45 + i * 1 / 34, .25, .2)
# склейки — глитч
for c in (2.4, 4.2, 6.4, 8.6):
    put(glitchn(), c - .02, .45, 0)
    put(sweep(3000, 300, .25, .25, .7), c, .5)
# 1 · такси: доплеровский пролёт и удар
t = tt(1.3); f = 160 * (1 + .25 * np.tanh((.65 - t) * 6))
taxi = (np.sin(2 * np.pi * np.cumsum(f) / SR) + .5 * lp(rng.standard_normal(len(t)), 1200)) * np.sin(np.pi * t / 1.3) ** 2
put(taxi * .5, 2.55, .8)
put(boom(.6), 3.2, .7); put(sweep(900, 200, .25, .4, .3), 3.2, .6)
# 2 · суперудар: заряд, луч, удар, разлом
put(riser(1.0), 4.4, .8)
put(sweep(80, 800, 1.0, .3), 4.4, .5)
put(sweep(1200, 60, .7, .6, .5), 5.4, .9)
put(boom(1.4), 5.5, 1.2)
for i in range(10):
    put(blip(600 - i * 40, .05), 5.6 + i * .07, .3, (i % 3 - 1) * .5)
# 3 · тайник: заряд, взрыв, карточка, расшифровка, звон
put(riser(.55), 6.38, .7)
put(boom(1.6), 6.9, 1.2); put(sweep(4000, 200, .8, .3, .8), 6.9, .6)
put(sweep(300, 900, .3, .25), 7.5, .5)
for i in range(7):
    put(blip(2200 + i * 120, .03), 7.85 + i * .08, .35, .2)
for m in (76, 79, 84, 88):
    t = tt(1.0); put(np.sin(2 * np.pi * mf(m) * t) * np.exp(-t * 3) * .25, 8.4 + (m - 76) * .004, .7, .15)
# 4 · башни: подъёмы и пробитие цели
for k, tb in enumerate((8.6, 8.95, 9.4, 9.85)):
    put(sweep(90, 300, .35, .35), tb, .6, (k - 1.5) * .3)
put(boom(1.0), 9.15, .9)
for m in (69, 76, 81, 84):
    t = tt(.85); put(saw(mf(m), .85, .003) * np.exp(-t * 2.5) * .12, 9.15, .7)

# ── сведение ──
mix = np.stack([L, Rr])
mix = np.tanh(mix * 1.2) / 1.2
fade = np.ones(N); fl = int(.25 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix *= fade
mix /= np.max(np.abs(mix)) * 1.12
out = sys.argv[1] if len(sys.argv) > 1 else 'TIZER.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print(out, f'{DUR} с')
