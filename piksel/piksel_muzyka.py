#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""piksel_muzyka.py — звук теста №3 «Пиксель», синтез без сэмплов.

    python3 piksel/piksel_muzyka.py voice/PIKSEL.wav

Чиптюн: пульсовые волны, треугольный бас, шумовые ударные, как у 8-битных
приставок, — и под ним кинематографичный саб-удар «Лаборатории» на
крупных событиях. 120 ударов в минуту, ля минор, Am–F–C–G. Каждый
игровой звук (прыжок, монетка, удар по блоку, фанфары уровня, «+1 жизнь»)
стоит на секунде события в piksel/piksel.html.
"""
import math, sys, wave
import numpy as np

SR, DUR = 44100, 120.0
N = int(SR * DUR)
t = np.arange(N) / SR
B = .5
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)


def put(sig, at, gain=1.0, pan=0.0):
    a = int(round(at * SR))
    if a >= N or a + len(sig) <= 0:
        return
    s = sig[max(0, -a):min(len(sig), N - a)]
    a = max(0, a)
    L[a:a + len(s)] += s * gain * (1 - max(0, pan))
    R[a:a + len(s)] += s * gain * (1 + min(0, pan))


def mx(*xs):
    """сумма звуков разной длины"""
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o


def mf(m):
    return 440 * 2 ** ((m - 69) / 12)


def env(n, a=.004, r=.03):
    x = np.arange(n) / SR; d = n / SR
    return np.minimum(1, x / a) * np.minimum(1, np.maximum(0, (d - x) / r))


def pulse(f, d, duty=.25, amp=1.0, dec=0.0, vib=0.0):
    n = int(d * SR); x = np.arange(n) / SR
    ph = np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 6 * x)) / SR)
    return np.where(ph % 1 < duty, 1.0, -1.0) * env(n) * np.exp(-x * dec) * amp


def tri(f, d, amp=1.0, dec=0.0):
    n = int(d * SR); x = np.arange(n) / SR
    ph = np.cumsum(np.full(n, f) / SR) % 1
    return (4 * np.abs(ph - .5) - 1) * env(n) * np.exp(-x * dec) * amp


def sweep(f0, f1, d, duty=.25, amp=1.0, wave='p'):
    n = int(d * SR); x = np.linspace(0, 1, n)
    ph = np.cumsum((f0 * (f1 / f0) ** x) / SR)
    s = np.where(ph % 1 < duty, 1.0, -1.0) if wave == 'p' else (4 * np.abs(ph % 1 - .5) - 1)
    return s * env(n) * amp


def noise(d, hold=6, dec=20.0, amp=1.0, hold1=None):
    """шум приставки: случайные значения, удерживаемые hold отсчётов"""
    n = int(d * SR); x = np.arange(n) / SR
    if hold1 is None:
        v = rng.choice([-1.0, 1.0], n // hold + 2); s = np.repeat(v, hold)[:n]
    else:
        hs = np.linspace(hold, hold1, n).astype(int).clip(1); idx = np.cumsum(1 / hs).astype(int)
        v = rng.choice([-1.0, 1.0], idx[-1] + 2); s = v[idx]
    return s * np.exp(-x * dec) * env(n, .002, .01) * amp


def sub(amp=1.0, d=1.4):
    n = int(d * SR); x = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(58 * np.exp(-x * 2) + 28) / SR) * np.exp(-x * 2.4) * amp


def riser(d, amp=1.0, f0=200, f1=1600):
    n = int(d * SR); x = np.linspace(0, 1, n)
    return mx(sweep(f0, f1, d, .5, .5) * x[:int(d * SR)] ** 2, noise(d, 3, 0, .4) * x[:int(d * SR)] ** 3) * amp


# ── игровые звуки ─────────────────────────────────────────────────
def blip(f, d=.06, amp=.5, duty=.5): return pulse(f, d, duty, amp)
def coin(amp=.6): s = np.concatenate([pulse(988, .07, .5, amp), pulse(1319, .32, .5, amp, dec=7)]); return s
def jump(amp=.5): return sweep(260, 820, .16, .25, amp)
def bump(amp=.7): return mx(tri(110, .1, amp, 20), noise(.06, 12, 40, amp * .5))
def damage(amp=.5): return sweep(900, 180, .28, .5, amp)
def tick(amp=.3, f=1760): return pulse(f, .03, .5, amp)
def boom(amp=1.0, d=1.2): return noise(d, 4, 3.2, amp, hold1=40)
def arp(notes, step=.045, amp=.4, duty=.25, last=.25):
    return np.concatenate([pulse(mf(m), step if i < len(notes) - 1 else last, duty, amp, dec=0 if i < len(notes) - 1 else 6) for i, m in enumerate(notes)])


# ── музыка ─────────────────────────────────────────────────────────
BAR = 4 * B
CHORD = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]           # Am F C G
ROOT = [45, 41, 48, 43]
MEL = [[76, 72, 69, 72, 76, 79, 76, 74], [72, 69, 65, 69, 72, 77, 76, 72], [72, 76, 79, 76, 84, 79, 76, 72], [74, 71, 67, 71, 74, 79, 77, 74]]


def ci(tt):
    return int(tt / BAR) % 4


def lead(a, b, amp=.16, octv=0, duty=.25):
    for q in range(int(round(a / .25)), int(round(b / .25))):
        tq = q * .25; m = MEL[ci(tq)][q % 8] + 12 * octv
        if q % 8 == 7 and ci(tq) % 2: continue                            # дыхание в конце фразы
        put(pulse(mf(m), .22, duty, amp, dec=3, vib=.004), tq, pan=-.15)


def bass(a, b, amp=.3):
    for q in range(int(round(a / .25)), int(round(b / .25))):
        tq = q * .25; r = ROOT[ci(tq)] + (12 if q % 2 else 0)
        put(tri(mf(r), .23, amp, 3), tq)


def arps(a, b, amp=.09, octv=1):
    for q in range(int(round(a / .125)), int(round(b / .125))):
        tq = q * .125; c = CHORD[ci(tq)]; m = c[q % 3] + 12 * octv + (12 if q % 6 >= 3 else 0)
        put(pulse(mf(m), .1, .125, amp, dec=14), tq, pan=.2)


def drums(a, b, amp=1.0, four=False, hat=True):
    for q in range(int(round(a / .25)), int(round(b / .25))):
        tq = q * .25
        if q % 4 == 0 and (four or q % 8 == 0): put(mx(tri(90, .12, .8 * amp, 25), sweep(160, 50, .09, .5, .4 * amp, 't')), tq)
        if q % 8 == 4: put(noise(.16, 3, 18, .45 * amp), tq, pan=.1)
        if hat and q % 2 == 1: put(noise(.03, 1, 80, .18 * amp), tq, pan=-.25)


def pad(a, b, amp=.05):
    for k in range(int(a / BAR), int(math.ceil(b / BAR))):
        t0 = max(a, k * BAR); t1 = min(b, (k + 1) * BAR); c = CHORD[k % 4]
        for m in c: put(tri(mf(m + 12), t1 - t0, amp), t0)


# ═══ 1 · СТАРТ ═══
for k in range(3): put(blip(1318, .05, .15), k / 2.4)
put(sweep(900, 220, .3, .5, .4), 1.15)
for i, tb in enumerate((1.45, 2.05, 2.55, 2.9)):
    put(blip(mf(64 + 5 * i), .08, .45), tb); put(noise(.05, 2, 60, .25), tb)
for k in range(3): put(tri(220 - 40 * k, .5, .4, 5), 3.2 + k * .14)
put(boom(.9, 1.1), 4.0); put(sub(1.0), 4.0)
put(arp([69, 72, 76, 81, 84, 88, 93], .12, .2, .125, .5), 4.35)
put(coin(.5), 5.65)
put(pulse(440, 2.4, .125, .06, 0, .02), 5.8)
pad(5.6, 9.0, .035)
put(riser(.8, .8, 300, 2400), 8.2)

# ═══ 2 · МАРШРУТ ═══
put(arp([60, 64, 67, 72, 76, 79, 84], .08, .35, .5, .35), 9.05)
lead(9.7, 26.0); bass(9.7, 26.0); drums(9.7, 26.0)
SX = [130, 270, 410, 550]
for k, x in enumerate(SX):
    tj = 9.7 + (x - 22) / 40.6
    put(jump(.45), tj); put(bump(.7), tj + .35)
    put(coin(.55) if k in (0, 3) else damage(.45), tj + .38)
    if k == 3: put(arp([72, 76, 79, 84, 88, 91], .05, .3, .5, .3), tj + .7)
put(sweep(1400, 300, .5, .5, .3), 25.9)
put(arp([67, 72, 76, 79, 84, 79, 84, 88], .1, .35, .5, .6), 26.05); put(sub(.6), 26.05)
for tf in (26.2, 26.45, 26.7): put(boom(.4, .5), tf)

# ═══ 3 · КОФЕ ═══
put(noise(.4, 2, 5, .3, hold1=1), 26.6)
drums(27.0, 29.2, 1.0, True); bass(27.0, 29.2, .3)
for tw in (27.1, 27.4, 27.7): put(sweep(1800, 200, .18, .5, .35), tw); put(tri(80, .15, .7, 12), tw + .15)
put(noise(.35, 2, 2, .5, hold1=1), 29.2); put(sub(.9), 29.55); put(noise(.2, 20, 12, .5), 29.55)
put(noise(1.9, 1, 1.5, .03), 29.6)                                            # пар над чашкой
put(coin(.5), 29.9)
lead(29.55, 37.6, .15, 1, .125); bass(29.55, 37.6, .32); drums(29.55, 37.6, 1.1, True)
for tk in (31.6, 33.6, 35.6):
    put(boom(.6, .5), tk); put(sub(.8), tk)
    for i in range(12): put(tick(.25, 1760 + i * 60), tk + .25 + i * .05)
    put(blip(2093, .2, .4), tk + .85)
put(boom(1.0, 1.0), 37.6); put(sub(1.2), 37.6)
for i in range(70): put(blip(1500 + 900 * rng.random(), .03, .12), 37.75 + i * .045 + .88, pan=rng.random() - .5)
drums(37.6, 41.9, .8, False); bass(37.6, 41.9, .26)
put(sweep(900, 120, .6, .5, .35), 41.9)
put(noise(.45, 3, 3, .3), 42.6)

# ═══ 4 · ДАННЫЕ ═══
PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103]
for i in range(20):
    put(pulse(mf(PENTA[i]), .12, .25, .3, dec=10), 44.0 + i * .16)
    for k in range(3): put(tick(.08, 3000), 44.0 + i * .16 + k * .035 + .2)
arps(44.0, 56.4, .07); bass(46.0, 56.4, .24); drums(48.0, 56.4, .6, False)
for tz in (49.3, 49.5, 51.1, 51.3): put(blip(1046 if tz < 50 else 784, .06, .35), tz)
put(blip(1568, .08, .35), 51.5); put(blip(1760, .08, .35), 53.9)
for i in range(14): put(tick(.22, 2000 + i * 80), 55.8 + i * .04)
put(blip(2349, .25, .4), 56.36)
put(boom(1.1, 1.6), 56.4); put(sub(1.1), 56.4)
put(noise(.6, 2, 2, .4, hold1=1), 58.7)

# ═══ 5 · СЕТЬ ═══
pad(59.0, 73.0, .04); arps(59.5, 64.3, .05, 2); bass(59.5, 64.3, .22); bass(67.0, 69.6, .22)
star = noise(14.0, 1, 0, .02); put(star * np.linspace(1, 1, len(star)), 59.0)
for k, s in enumerate(('> ПОИСК РУБЛЯ В СЕТИ', '> УЗЛОВ: 48 · СВЯЗЕЙ: 00', '> ПЛАТЕЖЕЙ/С: 0 000')):
    for i in range(len(s)): put(tick(.12, 2400 + 200 * (i % 3)), 59.6 + k * .7 + i / 34)
for tp in (60.4, 63.0): put(pulse(1318, .5, .5, .25, dec=5), tp)
put(riser(2.7, 1.0, 200, 2600), 64.3); drums(64.3, 67.0, 1.0, True)
for i in range(3): put(blip(2637, .05, .4), 67.3 + i * .09)
for i in range(18): put(tick(.14, 1500 + 700 * rng.random()), 67.9 + i * .04)
for f in range(int(69.6 * 30), int(71.3 * 30), 2): put(noise(.05, int(2 + 20 * rng.random()), 10, .3), f / 30)
put(sweep(1200, 60, 1.2, .5, .35), 71.3)
for tb in (72.5, 73.3): put(blip(1318, .04, .12), tb)

# ═══ 6 · ПАУЗА ═══
put(arp([88, 84], .08, .3, .5, .25), 73.0)
pad(73.3, 84.0, .035)
for tb, m in ((74.3, 84), (75.6, 88), (77.0, 81), (78.3, 91), (79.6, 88)): put(pulse(mf(m), 1.2, .5, .09, dec=2.5), tb)
put(riser(1.8, .8, 300, 2000), 81.9)

# ═══ 7 · ОКНА ═══
for k in range(6): put(blip(mf(72 + [0, 4, 7, 12, 16, 19][k]), .07, .35), 84.4 + k * .18)
lead(85.0, 98.2, .14); bass(85.0, 98.2, .3); drums(85.0, 98.2, .9)
for tl in (90.0, 95.5): put(sweep(300, 1200, .2, .5, .3), tl - .05); put(tri(90, .12, .6, 20), tl + .1)
for k in range(5): put(blip(1046, .03, .15), 86 + k * 2.5 + 2.1)
for k in range(6): put(blip(mf(84 - 3 * k), .05, .25), 98.2 + k * .1)
for i in range(4): put(mx(tri(mf(45 + 5 * i), .2, .8, 10), noise(.1, 4, 30, .4)), 98.8 + i * .08)
put(riser(1.2, 1.0, 250, 3000), 99.95); put(sub(.8), 101.0)

# ═══ 8 · ФИНАЛ ═══
put(boom(.8, 1.0), 100.9)
put(arp([69, 72, 76, 81, 84, 88, 93, 96], .1, .2, .125, .6), 101.2)
arps(101.2, 104.4, .06); bass(101.2, 104.4, .26); drums(102.0, 104.4, .8, False)
BEATN = [57, 60, 64, 67, 69, 72, 76]
for i in range(7):
    tb = 104.4 + i * .4; put(boom(.5, .35), tb); put(tri(mf(BEATN[i] - 12), .3, .8, 6), tb); put(pulse(mf(BEATN[i] + 12), .3, .25, .25, dec=6), tb)
put(riser(2.1, 1.2, 200, 3200), 107.2); drums(107.2, 109.3, 1.0, True)
put(boom(1.3, 1.8), 109.3); put(sub(1.4, 2.0), 109.3)
for j in range(7): put(blip(mf(72 + [0, 2, 4, 5, 7, 9, 12][j]), .06, .3), 109.55 + j * .07)
fan = np.concatenate([pulse(mf(m), d, .5, .3, dec=2 if d > .5 else 0) for m, d in ((72, .15), (76, .15), (79, .15), (84, .8))])
put(fan, 110.1); put(tri(mf(48), 1.3, .5, 1.5), 110.1)
lead(110.1, 113.4, .12, 1, .5); bass(110.1, 113.4, .28); drums(110.1, 113.4, .8, True)
for tc in (113.8, 114.8, 115.8): put(pulse(880, .09, .5, .35), tc); put(pulse(440, .09, .5, .2), tc + .5)
for tb in np.arange(113.8, 116.6, .5): put(tri(mf(45), .2, .35, 8), tb)
put(blip(1046, .05, .3), 116.0)
put(arp([84, 88], .07, .35, .5, .2), 116.6)
put(arp([72, 76, 79, 84, 88, 91], .08, .35, .5, .5), 117.2); put(sub(.5), 117.2)
put(sweep(1400, 100, .6, .5, .3), 118.6)
for tb in (119.2, 119.62): put(blip(1318, .04, .12), tb)

# ── сведение ─────────────────────────────────────────────────────
fade = np.minimum(1, t / .02) * np.minimum(1, (DUR - t) / .3)
out = np.stack([L, R], 1) * fade[:, None]
out = np.tanh(out / (np.max(np.abs(out)) * .6)) * .9
pcm = (out / np.max(np.abs(out)) * .95 * 32767).astype(np.int16)
path = sys.argv[1] if len(sys.argv) > 1 else 'voice/PIKSEL.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{path}: {DUR:.0f} с')
