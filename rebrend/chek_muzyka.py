#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""chek_muzyka.py — звук манифеста «ЧЕК», синтез без сэмплов.

    python3 rebrend/chek_muzyka.py voice/CHEK.wav

120 ударов в минуту, фа минор. Звуковой язык бренда — касса: шаговый
двигатель и треск термопечати вместо хэтов, щелчки клавиш, писк сканера,
звонок кассы, удар штампа, треск рвущейся бумаги. Каждый звук стоит на
секунде события в rebrend/chek.html. Музыка идёт по карте сцены:
ПЕЧАТЬ (без бита) → ЛЕНТА (минимал) → КАССА (электро) → РАЗРЫВ (тишина) →
ФОРМАТ (грув) → ЛИВЕНЬ (кульминация) → ИТОГО (выдох).
"""
import math, sys, wave
import numpy as np

SR, DUR = 44100, 90.0
N = int(SR * DUR)
t = np.arange(N) / SR
B = 0.5
rng = np.random.default_rng(23)
L = np.zeros(N); R = np.zeros(N)
KENV = np.zeros(N)   # огибающая бочки — для приседания баса и пэда


def put(sig, at, gain=1.0, pan=0.0):
    a = int(round(at * SR))
    if a >= N or a + len(sig) <= 0:
        return
    s = sig[max(0, -a):min(len(sig), N - a)]
    a = max(0, a)
    L[a:a + len(s)] += s * gain * (1 - max(0, pan))
    R[a:a + len(s)] += s * gain * (1 + min(0, pan))


def hp(x):
    return np.diff(np.concatenate([[0], x]))


def lp(x, k):
    n = int(SR * 0.02)
    kern = np.exp(-np.arange(n) / (SR / (2 * np.pi * k)))
    kern /= kern.sum()
    return np.convolve(x, kern, 'same')


def bp(x, lo, hi):
    return lp(x, hi) - lp(x, lo)


def ar(n, a, d):
    x = np.arange(n) / SR
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x * d)


def rnd(i):
    x = math.sin(i * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)


# ── голоса ───────────────────────────────────────────────────────
def kick(amp=1.0):
    n = int(.42 * SR); x = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(44 + 130 * np.exp(-x * 32)) / SR) * np.exp(-x * 7) * amp


def clap(amp=1.0):
    n = int(.25 * SR); x = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = sum(np.exp(-np.maximum(0, x - d) * 60) * (x >= d) for d in (0, .011, .022)) * .4 + np.exp(-x * 18) * (x >= .03)
    return nz * e * .8 * amp


def tick(amp=1.0, f=5200):
    """треск термопечати вместо хэта"""
    n = int(.035 * SR); x = np.arange(n) / SR
    return bp(rng.standard_normal(n), f * .6, f * 1.6) * np.exp(-x * 140) * amp


def keyclick(amp=1.0):
    n = int(.09 * SR); x = np.arange(n) / SR
    return (hp(rng.standard_normal(n)) * np.exp(-x * 220) * .5 + np.sin(2 * np.pi * 180 * x) * np.exp(-x * 60) * .6
            + np.sin(2 * np.pi * 1250 * x) * np.exp(-x * 160) * .25) * amp


def beep(f=2900, d=.18, amp=1.0):
    n = int(d * SR); x = np.arange(n) / SR
    return np.sin(2 * np.pi * f * x) * np.minimum(1, x / .004) * np.minimum(1, (d - x) / .01) * .35 * amp


def bell(f, amp=1.0, dur=2.2):
    n = int(dur * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 4) + .25 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x * 7)) \
        * np.exp(-x * 2.4) * amp * .3


def kaching(amp=1.0):
    """звонок кассы и ящик"""
    n = int(1.6 * SR); x = np.arange(n) / SR
    s = bell(2093, 1.0, 1.6) + bell(2637, .8, 1.6) * (x >= .06)
    drawer = np.sin(2 * np.pi * 95 * x) * np.exp(-x * 14) * .7 + lp(rng.standard_normal(n), 700) * np.exp(-x * 10) * 1.2
    return (s + drawer) * amp


def stamp(amp=1.0):
    n = int(.7 * SR); x = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(58 + 60 * np.exp(-x * 25)) / SR) * np.exp(-x * 9)
    slap = bp(rng.standard_normal(n), 300, 3500) * np.exp(-x * 45) * 1.3
    wood = np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30) * .4
    return (body + slap + wood) * amp


def impact(amp=1.0, dur=2.0):
    n = int(dur * SR); x = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(62 * np.exp(-x * 1.6) + 26) / SR) * np.exp(-x * 1.8)
    nz = lp(rng.standard_normal(n), 1100) * np.exp(-x * 4) * 1.1
    return (sub * .95 + nz * .45) * amp


def whoosh(d, amp=1.0, up=True):
    n = int(d * SR); xx = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    lo = lp(nz, 450); hi = nz - lp(nz, 2600)
    mixc = xx if up else 1 - xx
    e = xx ** 2 * (1 - np.exp(-(1 - xx) * 50)) if up else np.sin(np.pi * xx) ** 1.4
    return (lo * (1 - mixc) + hi * mixc * .6) * e * amp


def riser(d, amp=1.0, f0=200, f1=1200):
    n = int(d * SR); xx = np.linspace(0, 1, n)
    nz = hp(rng.standard_normal(n)) * xx ** 3
    tone = np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * xx ** 2) / SR) * xx ** 2 * .22
    return (nz * .7 + tone) * amp


def printer(d, amp=1.0, rate=38):
    """точечная печать: треск, промодулированный частотой строк, и писк мотора"""
    n = int(d * SR); x = np.arange(n) / SR
    am = (np.sin(2 * np.pi * rate * x) > -.2).astype(float) * (.6 + .4 * np.sin(2 * np.pi * 7 * x) ** 2)
    nz = bp(rng.standard_normal(n), 1800, 7000) * am
    whine = np.sin(2 * np.pi * (1150 + 30 * np.sin(2 * np.pi * 5 * x)) * x) * .08
    e = np.minimum(1, x / .01) * np.minimum(1, (d - x) / .02)
    return (nz * .5 + whine) * e * amp


def stepper(d, amp=1.0):
    """шаговый двигатель подачи: 15 шагов в секунду"""
    n = int(d * SR); x = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(int(d * 15)):
        a = int(k / 15 * SR); m = min(n - a, int(.03 * SR)); xx = np.arange(m) / SR
        s[a:a + m] += (np.sin(2 * np.pi * 420 * xx) * .5 + hp(rng.standard_normal(m)) * .4) * np.exp(-xx * 90)
    hum = np.sin(2 * np.pi * 380 * x) * .05 * np.minimum(1, x / .05) * np.minimum(1, (d - x) / .05)
    return (s + hum) * amp


def tear(d, amp=1.0):
    """рвущаяся бумага: редкие щелчки волокон поверх шума"""
    n = int(d * SR); x = np.arange(n) / SR
    base = bp(rng.standard_normal(n), 600, 6000) * (.25 + .75 * np.abs(np.sin(np.pi * x / d))) * .5
    cr = np.zeros(n)
    for _ in range(int(d * 160)):
        a = rng.integers(0, max(1, n - 400)); cr[a:a + 200] += hp(rng.standard_normal(200)) * np.exp(-np.arange(200) / 30) * rng.uniform(.4, 1.2)
    return (base + cr) * amp


def swipe(d, amp=1.0):
    """бумага скользит / маркер"""
    n = int(d * SR); xx = np.linspace(0, 1, n)
    return bp(rng.standard_normal(n), 1200, 5000) * np.sin(np.pi * xx) ** 2 * amp * .6


def zap(amp=1.0):
    n = int(.1 * SR); x = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * np.cumsum(2600 * np.exp(-x * 30) + 140) / SR)) * np.exp(-x * 32) * .3 * amp


def coinring(amp=1.0, dur=2.6):
    n = int(dur * SR); x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * d) * g for f, d, g in ((2150, 1.5, 1), (3310, 2.2, .6), (5120, 3.5, .35), (2163, 1.5, .8)))
    return s * amp * .22


# ── гармония ──────────────────────────────────────────────────────
CH = [(174.61, 207.65, 261.63), (138.59, 174.61, 207.65), (207.65, 261.63, 311.13), (155.56, 196.0, 233.08)]
ROOT = [87.31, 69.30, 103.83, 77.78]
BAR = 4 * B
ci = (np.floor(t / BAR).astype(int)) % 4


def curve(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def sect(a, b):
    return range(int(round(a / B * 4)), int(round(b / B * 4)))


def drums(a, b, k=1.0, cl=True, tk=1.0, tk16=True):
    for q in sect(a, b):
        tq = q * B / 4
        if q % 4 == 0:
            put(kick(k), tq)
            i = int(tq * SR); m = min(N - i, int(.35 * SR)); KENV[i:i + m] = np.maximum(KENV[i:i + m], np.exp(-np.arange(m) / SR * 9) * k)
        if cl and q % 8 == 4: put(clap(.9 * k), tq, pan=.08)
        if tk and (tk16 or q % 2 == 1): put(tick(tk * (1 if q % 2 else .55), 5200 + 800 * (q % 3)), tq, pan=-.3 if q % 4 == 1 else .3)


def bass(a, b, amp=.33, step=2):
    for q in sect(a, b):
        if q % step: continue
        tq = q * B / 4; f = ROOT[int(tq / BAR) % 4]
        n = int(B * step / 4 * SR * .92); x = np.arange(n) / SR
        put((np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x) + .15 * np.sign(np.sin(2 * np.pi * f * x))) * np.exp(-x * 4.5) * amp, tq)


def arp(a, b, amp=.16):
    """квадратное арпеджио — «дисплей кассы»"""
    for q in sect(a, b):
        tq = q * B / 4; c = CH[int(tq / BAR) % 4]; f = c[q % 3] * (2 if q % 6 < 3 else 4)
        n = int(.11 * SR); x = np.arange(n) / SR
        put(np.sign(np.sin(2 * np.pi * f * x)) * np.exp(-x * 30) * amp, tq, pan=(q % 4 - 1.5) * .25)


def stabs(a, b, amp=.22, every=(2, 6)):
    for q in sect(a, b):
        if q % 8 not in every: continue
        tq = q * B / 4; c = CH[int(tq / BAR) % 4]
        n = int(.28 * SR); x = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * 2 * x) + .5 * np.sin(2 * np.pi * f * 4 * x) for f in c) * np.exp(-x * 13)
        put(s * amp / 3, tq)


# пэд
pad = np.zeros(N)
for k in range(4):
    m = ci == k; tt = t[m]; s = np.zeros(tt.size)
    for f in CH[k]:
        for det in (-.12, .12):
            for h in range(1, 5):
                s += np.sin(2 * np.pi * f * (1 + det / 100) * h * tt) / (h * 1.7)
    pad[m] = s
pad_amp = curve([(0, 0), (.5, .35), (3, .35), (3.2, .1), (4, .3), (7, .45), (7.3, .3), (20.8, .5), (21.05, 0), (35.5, 0), (36, .55), (44.4, .6),
                 (45.2, .3), (63.5, .4), (64, .25), (79.2, .45), (79.4, .8), (88.4, .7), (90, 0)])
drone = np.sin(2 * np.pi * 43.65 * t) * .1 * curve([(0, 0), (.4, 1), (7, 1), (7.4, .3), (21, .3), (21.1, 1), (35.5, 1), (36, .5), (45, .5), (45.3, 0), (90, 0)])

# ═══ 1 · ПЕЧАТЬ ═══
put(stepper(2.3, .9), .5)
put(printer(2.3, .45, 30), .5)
put(riser(.5, .5), 2.5); put(stamp(1.4), 3.0); put(impact(.7, 1.6), 3.0)
put(tear(.45, 1.0), 3.95); put(whoosh(.7, .8, up=False), 4.0)
put(coinring(1.0, 3.0), 4.05); put(whoosh(2.4, .6), 4.1)
for i, tb in enumerate(np.arange(4.3, 6.6, .09 + 0 * B)):
    put(tick(.4 * (1 - (tb - 4.3) / 2.5)), tb, pan=math.sin(tb * 9) * .5)   # монета крутится: дребезг гаснет
put(riser(1.2, .9, 300, 1800), 5.45); put(impact(.8, 1.4), 6.65); put(whoosh(.55, .9), 6.62)

# ═══ 2 · ЛЕНТА ═══
drums(9.2, 15.2, k=.55, cl=False, tk=.5, tk16=False)
drums(15.2, 19.9, k=.75, cl=True, tk=.7)
bass(11.2, 19.9, .26, 4)
ROWS = ['КОФЕ ПО ДОРОГЕ', 'ДОСТАВКА: ЛЕНЬ ИДТИ', 'ПОДПИСКА-ПРИЗРАК', 'ТАКСИ «ОПАЗДЫВАЮ»', 'ЧАС В ПРОБКЕ', '«ПОТОМ РАЗБЕРУСЬ»', 'РЕШЕНИЕ «НЕ СЕЙЧАС»']
for k, s in enumerate(ROWS):
    t0 = 9.2 + k * .85
    put(printer(len(s) / 34, .5, 34), t0, pan=-.1)
    put(keyclick(.8) + 0, t0 + .5, pan=.15)
put(swipe(.45, 1.1), 12.3); put(swipe(.55, .9), 13.7)
for i in range(21): put(tick(.6, 3000), 15.2 + i / 30)
put(swipe(.35, .8), 16.1); put(whoosh(1.8, .5), 15.9)
laser = np.sin(2 * np.pi * 110 * np.arange(int(1.1 * SR)) / SR) * .06
put(laser, 18.3); put(beep(2900, .18, 1.2), 19.4); put(beep(2900, .08, .6), 19.62)
put(riser(1.15, 1.0, 180, 2400), 19.9); put(whoosh(1.1, 1.0), 19.95); put(impact(1.0, 1.3), 21.05)

# ═══ 3 · КАССА ═══
buzz = (np.sign(np.sin(2 * np.pi * 100 * t)) * .015 + np.sin(2 * np.pi * 50 * t) * .03) * curve([(0, 0), (21.05, 0), (21.1, 1), (34.6, 1), (35.5, 0), (90, 0)])
for i in range(12): put(zap(.5), 21.06 + i * .04 + rnd(i) * .02)
drums(22.2, 30.9, k=.8, cl=True, tk=.8); bass(22.2, 30.9, .3, 2); arp(23.7, 30.9, .12)
PR = [[21.7, '2'], [21.95, '5'], [22.2, '0'], [22.9, '×'], [23.2, '5'], [23.7, '='], [24.7, '×'], [25.0, '5'], [25.2, '0'], [25.8, '='], [26.9, '×'], [27.2, '1'], [27.4, '0'], [28.6, '=']]
for tp, k in PR:
    put(keyclick(1.0), tp, pan=.1)
    if k == '=':
        big = tp == 28.6
        put(bell(1567.98 if not big else 2093, .9), tp + .02); put(impact(.6 if not big else 1.2, 1.6), tp)
        if big: put(kaching(1.1), tp + .05)
for i in range(16): put(keyclick(.5 * (1 - i / 20)), 31.3 + i * .07 + rnd(i + 5) * .05, pan=rnd(i + 9) - .5)
put(riser(1.8, .7), 31.2)
for f in range(int(33.0 * 30), int(34.7 * 30)):
    if rnd(f * 3 + 1) > .45: put(zap(1.2), f / 30)
put(swipe(1.05, 1.4), 34.5); put(whoosh(1.0, .7, up=False), 34.55)

# ═══ 4 · РАЗРЫВ ═══
room = lp(rng.standard_normal(N), 300) * .02 * curve([(0, 0), (35.4, 0), (35.8, 1), (44.6, 1), (45, 0), (90, 0)])
for t0 in (36.0, 36.5, 37.1, 37.6): put(printer(.34, .6, 44), t0)
put(swipe(.4, 1.6), 38.5); put(stamp(1.6), 39.3); put(impact(.9, 2.2), 39.3)
put(tear(.55, .5), 41.0)
put(printer(1.3, .55, 30), 41.9); put(swipe(.45, 1.1), 43.35)
put(riser(.8, .5), 43.8); put(tear(.55, 1.3), 44.6); put(whoosh(.95, 1.0, up=False), 44.95)

# ═══ 5 · ФОРМАТ ═══
drums(45.2, 60.5, k=1.0, cl=True, tk=.9); bass(45.2, 60.5, .34, 2); stabs(47, 60.5, .2)
for i in range(4): put(whoosh(.5, .6, up=False), 45.2 + i * .12)
put(printer(.8, .35, 24), 45.6)
for tk_ in (50.3, 53.7, 57.1): put(whoosh(.6, .9, up=False), tk_ - .05); put(stamp(.5), tk_ + .15)
for tk_ in (46.9, 50.3, 53.7, 57.1): put(swipe(.4, .7), tk_ + .35)
for i in range(3): put(tick(.5, 2400), 47.5 + i)       # часы тикают на рубрике «час»
put(riser(1.2, 1.0, 250, 2200), 60.5)
drums(61.75, 63.6, k=.5, cl=False, tk=.6); bass(61.75, 63.6, .24, 4)       # сборка QR: тихий бит держит темп
for i in range(40): put(tick(.5, 3500 + 2000 * rnd(i)), 61.75 + rnd(i + 70) * .85, pan=rnd(i + 3) - .5)
put(laser[:int(.7 * SR)], 62.9); put(beep(2900, .16, 1.2), 63.6); put(impact(1.1, 1.8), 63.65); put(whoosh(.6, .8, up=False), 63.65)

# ═══ 6 · ЛИВЕНЬ ═══
drums(64.0, 68.0, k=.9, cl=True, tk=.9); bass(64.0, 68.0, .32, 2)
for tw in (64.3, 65.2, 66.1): put(impact(.9 if tw < 66 else 1.3, 1.2), tw); put(stamp(.6), tw)
put(riser(1.9, .9), 66.1)
drums(68.0, 76.0, k=1.1, cl=True, tk=1.1); bass(68.0, 76.0, .36, 1); stabs(68, 76, .22, (0, 2, 4, 6))
for i in range(16): put(impact(.5, .6), 68 + i * .5); put(clap(.5), 68 + i * .5 + .25)
put(riser(3.3, 1.2, 150, 3000), 76.0); put(whoosh(3.3, .9), 76.0)
_n = int(3.3 * SR); _x = np.arange(_n) / SR
put(np.sin(2 * np.pi * np.cumsum(41 + 50 * (_x / 3.3) ** 2) / SR) * (.35 + .65 * _x / 3.3) * .5
    + bp(rng.standard_normal(_n), 200, 2500) * (_x / 3.3) * .25, 76.0)          # воронка: гул снизу, без провала
for i in range(24): put(tick(.6, 4000), 76 + (i / 24) ** .6 * 3.2)
put(impact(1.8, 3.0), 79.3); put(kaching(1.2), 79.35)
for i, f in enumerate((1046.5, 1318.5, 1568, 2093, 2637)): put(bell(f, .5), 79.45 + i * .08, pan=(i % 3 - 1) * .3)

# ═══ 7 · ИТОГО ═══
put(stepper(1.35, 1.0), 80.1); put(printer(1.35, .3, 20), 80.1)
put(swipe(.5, .7), 81.75); put(beep(1760, .07, .8), 81.9)
put(printer(1.2, .55, 34), 82.3)
for i, s in enumerate(('ПОДПИСКА НА КАНАЛ', 'ИТОГО')):
    t0 = 84.0 + i * .9
    put(printer(len(s) / 34, .45, 34), t0); put(keyclick(.8), t0 + .55)
put(stamp(1.5), 86.3); put(kaching(1.0), 86.45); put(impact(.6, 1.6), 86.3)
put(printer(.7, .4, 30), 87.0)
put(stepper(1.3, .9), 88.5); put(whoosh(1.3, .5), 88.5)

# ── сведение ─────────────────────────────────────────────────────
duck = 1 - .6 * np.clip(KENV, 0, 1)
L += (pad * pad_amp * .045 * duck + drone + buzz + room); R += (pad * pad_amp * .045 * duck * .97 + drone + buzz + room)
fade = np.minimum(1, t / .02) * np.minimum(1, (DUR - t) / .4)
out = np.stack([L, R], 1) * fade[:, None]
out = np.tanh(out / (np.max(np.abs(out)) * .5)) * .9
pcm = (out / np.max(np.abs(out)) * .95 * 32767).astype(np.int16)
path = sys.argv[1] if len(sys.argv) > 1 else 'voice/CHEK.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{path}: {DUR:.0f} с')
