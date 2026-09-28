#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""laboratoriya_muzyka.py — звук для laboratoriya.html, синтез без сэмплов.

    python3 laboratoriya_muzyka.py voice/LAB.wav

120 ударов в минуту. Партитура повторяет карту интенсивности ролика:
HIT → CALM/BUILD → HIT/FAST → COMPLEX → FAST → PAUSE → COMPLEX → CLIMAX.
Удары, свисты, нарастания, «цифровые» щелчки и колокольчики стоят на тех
же секундах, что и события в сцене.
"""
import sys, wave
import numpy as np

SR, DUR = 44100, 150.0
N = int(SR * DUR)
t = np.arange(N) / SR
B = 0.5
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)


def put(sig, at, gain=1.0, pan=0.0):
    a = int(at * SR)
    if a >= N or a + len(sig) <= 0:
        return
    s = sig[max(0, -a):min(len(sig), N - a)]
    a = max(0, a)
    L[a:a + len(s)] += s * gain * (1 - max(0, pan))
    R[a:a + len(s)] += s * gain * (1 + min(0, pan))


def env(n, a, d):
    x = np.arange(n) / SR
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x * d)


def hp(x):
    return np.diff(np.concatenate([[0], x]))


def lp(x, k):
    """однополюсный фильтр, векторизованно через свёртку с экспонентой"""
    n = int(SR * 0.02)
    kern = np.exp(-np.arange(n) / (SR / (2 * np.pi * k)))
    kern /= kern.sum()
    return np.convolve(x, kern, 'same')


def kick(amp=1.0):
    n = int(.45 * SR); x = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-x * 30)) / SR) * np.exp(-x * 6.5) * amp


def snare(amp=1.0):
    n = int(.3 * SR); x = np.arange(n) / SR
    return (hp(rng.standard_normal(n)) * .5 * np.exp(-x * 15) + np.sin(2 * np.pi * 190 * x) * np.exp(-x * 22) * .5) * amp


def hat(amp=1.0, dec=70):
    n = int(.08 * SR); x = np.arange(n) / SR
    return hp(hp(rng.standard_normal(n))) * np.exp(-x * dec) * .25 * amp


def impact(amp=1.0, dur=2.2):
    n = int(dur * SR); x = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-x * 1.6) + 28) / SR) * np.exp(-x * 1.6)
    nz = lp(rng.standard_normal(n), 900) * np.exp(-x * 3.5) * 1.2
    return (sub * .95 + nz * .5) * amp


def whoosh(d, amp=1.0, up=True):
    n = int(d * SR); x = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    lo = lp(nz, 400); hi = nz - lp(nz, 2500)
    mixc = x if up else 1 - x
    e = np.sin(np.pi * x) ** 1.5 if not up else x ** 2 * (1 - np.exp(-(1 - x) * 60))
    return (lo * (1 - mixc) + hi * mixc * .6) * e * amp


def riser(d, amp=1.0):
    n = int(d * SR); x = np.linspace(0, 1, n)
    nz = hp(rng.standard_normal(n)) * x ** 3
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * x ** 2) / SR) * x ** 2 * .25
    return (nz * .7 + tone) * amp


def zap(amp=1.0):
    n = int(.12 * SR); x = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * np.cumsum(2400 * np.exp(-x * 30) + 120) / SR)) * np.exp(-x * 30) * .3 * amp


def bell(f, amp=1.0, dur=2.5):
    n = int(dur * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3)) * np.exp(-x * 2.2) * amp * .35


def pluck(f, amp=1.0):
    n = int(.4 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .3 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 11) * amp * .3


# ── аккорды и пэд ────────────────────────────────────────────────
CH = [(220.0, 261.63, 329.63, 493.88), (174.61, 220.0, 261.63, 329.63), (130.81, 196.0, 261.63, 329.63), (196.0, 246.94, 293.66, 392.0)]
ROOT = [110.0, 87.31, 65.41, 98.0]
bar = 4 * B
ci = (np.floor(t / bar).astype(int)) % 4
pad = np.zeros(N)
for k in range(4):
    m = ci == k
    tt = t[m]
    s = np.zeros(tt.size)
    for f in CH[k]:
        for det in (-.1, .1):
            for h in range(1, 5):
                s += np.sin(2 * np.pi * f * (1 + det / 100) * h * tt) / (h * 1.8)
    pad[m] = s


def curve(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


pad_amp = curve([(0, 0), (3, 0), (4.5, .6), (7.5, .5), (9.7, .15), (10.5, .5), (28, .7), (30, .25), (46, .35), (50, .45), (66, .45), (70, .2),
                 (88.5, .25), (89.2, 0), (104, 0), (104.8, .2), (106, .35), (125, .4), (126, .7), (130, .8), (133, .6), (146, .5), (146.5, .9), (149.2, .5), (150, 0)])
pad = pad * pad_amp * .05
L += pad; R += pad * .97


def sect(a, b):
    return [i for i in range(int(a / B * 4), int(b / B * 4))]   # индексы шестнадцатых


# ── ударные по разделам ─────────────────────────────────────────
def drums(a, b, k=1.0, sn=True, h16=True, hat_amp=1.0):
    for q in sect(a, b):
        tq = q * B / 4
        if q % 4 == 0: put(kick(k), tq)
        if sn and q % 8 == 4: put(snare(.9 * k), tq, pan=.1)
        if h16 or q % 2 == 1: put(hat(hat_amp * (1 if q % 2 else .6)), tq, pan=-.25 if q % 4 == 1 else .25)


def bass(a, b, step=2, amp=.35):
    for q in sect(a, b):
        if q % step: continue
        tq = q * B / 4; k = int(tq / bar) % 4; f = ROOT[k]
        n = int(B * step / 4 * SR * .95); x = np.arange(n) / SR
        put((np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 5) * amp, tq)


# 1 · старт
for tb in (1.0, 1.5, 2.0, 2.5): put(kick(.5), tb)
put(riser(.6, .8), 2.4); put(impact(1.2), 3.0); put(whoosh(2.1, 1.0), 7.6); put(impact(.45, 1.4), 9.7)
# 2 · маршрут: тихо, щипки, потом хэты и мягкая бочка
for q in sect(12, 30):
    if q % 2 == 0:
        tq = q * B / 4; k = int(tq / bar) % 4
        put(pluck(CH[k][(q // 2) % 4] * 2, .7 if tq > 20 else .45), tq, pan=((q // 2) % 3 - 1) * .3)
drums(20, 24, k=.0, sn=False, h16=False, hat_amp=.5)
drums(24, 30, k=.55, sn=False, h16=False, hat_amp=.6)
put(riser(1.8, .8), 28.2); put(impact(1.1), 30.0)
# 3 · делёж: полный бит, свисты на рывке, разрезе, маске, дробь на склейках
drums(30, 38); bass(30, 38, 2, .38)
for tw in (31.9, 33.9, 35.8): put(whoosh(.45, .9, up=False), tw)
for q in range(int(38 / .25), int(41 / .25)): put(kick(.8), q * .25)
for tc in np.arange(38, 41, .5): put(impact(.35, .6), tc)
drums(41, 45); bass(41, 45, 2, .38); put(riser(1.7, .7), 44.5); put(impact(.8), 46.2)
drums(46.2, 50, k=.6, sn=False, h16=False)
# 4 · данные: ровнее, арпеджио
drums(50, 64, k=.75, sn=True, h16=False, hat_amp=.7); bass(50, 64, 4, .3)
for q in sect(50, 64):
    if q % 2 == 0:
        tq = q * B / 4; k = int(tq / bar) % 4; put(pluck(CH[k][(q // 2) % 4] * 2, .35), tq, pan=.3)
put(whoosh(1.2, .6), 53.0); put(riser(1.4, .5), 58.4); put(impact(1.0), 64.5)
for i in range(14): put(hat(1.4, 40), 64.6 + i * .09 + rng.random() * .05, pan=rng.random() - .5)
put(riser(2.0, .6), 66.0)
# 5 · сеть: техно, шестнадцатые в басу, цифровые щелчки на сбоях
drums(70, 76); bass(70, 76, 1, .28)
for tz in (72, 74, 78, 82, 84, 86): put(zap(1.4), tz); put(zap(1.0), tz + .033)
put(riser(2.6, .9), 76.0); drums(78.6, 80.3, k=.0, sn=False); put(impact(.9), 80.3)
drums(80.3, 88); bass(80.3, 88, 1, .28); put(riser(3.8, 1.0), 84.3); put(impact(1.3, 2.6), 88.0)
# 6 · пауза: гул и колокольчики
dr = np.sin(2 * np.pi * 55 * t) * .06 * curve([(0, 0), (89.6, 0), (91, 1), (103.5, 1), (104.5, 0), (150, 0)])
L += dr; R += dr
for tb, f in ((91.4, 880), (93.2, 1318.5), (95.0, 1046.5), (98.5, 1760), (99.0, 1318.5)): put(bell(f, .9), tb, pan=(f % 3 - 1) * .2)
put(whoosh(1.2, .9), 103.6); put(impact(.6, 1.6), 104.8)
# 7 · плотность
drums(106, 108, k=.6, sn=False, h16=False); drums(108, 123); bass(108, 123, 2, .34)
for tw in (111.7, 117.7): put(whoosh(.6, .8), tw)
put(riser(2.4, 1.0), 122.8); put(impact(1.1), 125.2); put(riser(4.0, .6), 125.5); put(impact(.9), 129.5)
# 8 · финал
drums(133, 137, k=.7, sn=False, h16=False); for_tb = [137 + i * .5 for i in range(6)]
for tb in for_tb: put(impact(.55, .8), tb); put(kick(1.0), tb)
drums(140, 144); bass(140, 144, 2, .36); put(riser(2.4, 1.1), 144.0); put(impact(1.5, 3.0), 146.4)
for i, f in enumerate((440, 523.25, 659.25, 880, 1046.5, 1318.5, 1760)): put(bell(f, .6), 146.6 + i * .09, pan=(i % 3 - 1) * .3)
put(impact(.5, 1.2), 149.2)

# ── сведение ─────────────────────────────────────────────────────
fade = np.minimum(1, t / .05) * np.minimum(1, (DUR - t) / .8)
out = np.stack([L, R], 1) * fade[:, None]
out = np.tanh(out / (np.max(np.abs(out)) * .55)) * .9
pcm = (out / np.max(np.abs(out)) * .95 * 32767).astype(np.int16)
path = sys.argv[1] if len(sys.argv) > 1 else 'voice/LAB.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{path}: {DUR:.0f} с')
