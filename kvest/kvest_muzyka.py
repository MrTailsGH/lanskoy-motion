#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kvest_muzyka.py — звук теста №4 «Рубль-квест», синтез без сэмплов.

    python3 kvest/kvest_muzyka.py voice/KVEST.wav

Чиптюн по сценам, как у 8-битной игры: титул, карта, уровень, бой
(минор), сундук, город, нырок, сохранение, титры. Каждый игровой звук —
прыжок, монетка, удар, стоп-кадр, награда, щелчок меню — стоит на
секунде события в kvest/kvest.html; под крупными ударами — саб.
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
CHORD = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]           # C G Am F — тема приключения
ROOT = [48, 43, 45, 41]
MEL = [[72, 76, 79, 76, 84, 79, 76, 79], [74, 79, 83, 79, 86, 83, 79, 74], [76, 72, 69, 72, 76, 81, 79, 76], [77, 72, 69, 72, 77, 81, 84, 81]]
BOSS_CH = [[57, 60, 64], [53, 57, 60], [52, 56, 59], [57, 60, 64]]         # Am F E Am — тема босса
BOSS_RT = [45, 41, 40, 45]
BOSS_MEL = [[69, 72, 76, 72, 81, 76, 72, 76], [77, 72, 69, 72, 77, 81, 77, 72], [76, 80, 83, 80, 88, 83, 80, 76], [81, 76, 72, 76, 81, 84, 81, 76]]


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




def leadM(a, b, mel, amp=.15, octv=0, duty=.25):
    for q in range(int(round(a / .25)), int(round(b / .25))):
        tq = q * .25; m = mel[ci(tq)][q % 8] + 12 * octv
        if q % 8 == 7 and ci(tq) % 2: continue
        put(pulse(mf(m), .22, duty, amp, dec=3, vib=.004), tq, pan=-.15)


def bassM(a, b, roots, amp=.3, step=1):
    for q in range(int(round(a / .25)), int(round(b / .25))):
        if q % step: continue
        tq = q * .25; r = roots[ci(tq)] + (12 if q % 2 else 0)
        put(tri(mf(r), .23 * step, amp, 3), tq)


def arpsM(a, b, chords, amp=.08, octv=1):
    for q in range(int(round(a / .125)), int(round(b / .125))):
        tq = q * .125; c = chords[ci(tq)]; m = c[q % 3] + 12 * octv + (12 if q % 6 >= 3 else 0)
        put(pulse(mf(m), .1, .125, amp, dec=14), tq, pan=.2)


def type_ticks(s, t0, cps=30, amp=.1):
    for i in range(len(s)):
        if s[i] != ' ': put(tick(amp, 2200 + 300 * (i % 3)), t0 + i / cps)


def confirm(amp=.35): return arp([84, 91], .06, amp, .5, .18)
def chime(amp=.3): return arp([84, 88, 91, 96], .05, amp, .5, .3)


# ═══ 0 · ЗАГРУЗКА и ТИТУЛ ═══
tt = .35
for s in ('РУБЛЬ-СИСТЕМА 1.0', 'ПАМЯТЬ 640 КБ ... ОК', 'КОПИЛКА ....... ОК', 'ЗАГРУЗКА'):
    type_ticks(s, tt, 40, .08); tt += len(s) / 40 + .08
for k in range(10): put(tick(.12, 1200 + 80 * k), 1.2 + k * .08)
put(sub(.8), 2.1); put(arp([60, 67, 72, 76, 79, 84], .07, .3, .5, .6), 2.15)
put(riser(1.2, .4, 200, 900), 2.2)
for k in range(3): put(tri(mf(36 + 7 * k), .3, .6, 8), 2.4 + k * .25)
put(bump(.8), 2.8); put(pulse(mf(72), .4, .5, .2, dec=5), 2.8); put(blip(1318, .08, .3), 3.15)
type_ticks('ПРО ДЕНЬГИ БЕЗ ВОДЫ', 3.6, 30, .06)
pad(2.1, 6.4, .04); arpsM(2.6, 6.4, CHORD, .05)
put(blip(988, .05, .3), 4.0); put(confirm(.4), 5.4)
put(noise(1.6, 3, 1.2, .25, hold1=1), 6.4); put(sweep(900, 150, 1.4, .5, .2), 6.5)

# ═══ 1 · КАРТА ═══
bassM(8.0, 13.0, ROOT, .24, 2); arpsM(8.0, 13.0, CHORD, .05)
for k in range(10): put(tick(.08, 700), 9.25 + k * .26)
put(blip(1046, .06, .3), 11.6); put(sweep(1200, 120, .9, .5, .25), 12.9)

# ═══ 2 · УРОВЕНЬ «ДЕНЬ РУБЛЯ» ═══
put(arp([67, 72, 76, 79, 84], .07, .3, .5, .3), 14.0)
leadM(14.6, 32.6, MEL); bassM(14.6, 32.6, ROOT); drums(14.6, 32.6)
for tc in (15.4, 16.2, 16.9, 17.5): put(coin(.45), tc)
for tr in (17.6, 20.2, 23.4, 27.2, 30.6): put(blip(1568, .05, .25), tr)
put(blip(220, .08, .3), 18.4); put(damage(.5), 19.6); put(tri(70, .15, .8, 15), 19.6); put(sweep(1200, 300, .4, .5, .25), 19.7)
put(noise(.7, 6, 1, .2, hold1=2), 21.9); put(noise(.3, 2, 8, .3), 22.55); put(damage(.45), 22.75)
for tc in (22.8, 23.1): put(sweep(1200, 300, .3, .5, .2), tc)
put(pulse(330, 1.6, .5, .08, 0, .04), 25.3); put(jump(.45), 26.2); put(arp([79, 84, 88], .06, .3, .5, .2), 26.9); put(noise(.3, 1, 6, .12), 27.5)
put(blip(523, .1, .25), 27.6); put(jump(.4), 29.0)
for k in range(7): put(blip(mf(76 + 2 * k), .05, .3), 29.75 + k * .1)
put(blip(1046, .05, .25), 31.0); put(blip(1175, .05, .25), 31.4)
for i in range(10): put(tick(.15, 1800 + 60 * i), 31.9 + i * .05)
put(blip(2093, .2, .3), 32.45)
put(arp([72, 76, 79, 84, 79, 84, 88], .1, .35, .5, .5), 32.6); put(sub(.5), 32.6)
put(sweep(1200, 120, .7, .5, .25), 33.3)

# ═══ карта: к замку ═══
for k in range(4): put(tick(.08, 700), 34.25 + k * .26)
bassM(34.0, 36.0, BOSS_RT, .2, 2); put(tri(mf(57), 2.2, .06, 1), 34.0); put(tri(mf(60), 2.2, .045, 1), 34.0)
put(sweep(200, 700, 1.6, .5, .12), 34.4)
put(pulse(mf(45), .6, .5, .3, dec=2), 35.0); put(pulse(mf(44), .6, .5, .25, dec=2), 35.3); put(sweep(900, 80, .6, .5, .3), 35.4)

# ═══ 3 · БОСС «ИНФЛЯЦИЯ» ═══
put(noise(1.0, 30, 2, .4), 36.2); put(sub(.9), 36.3)
put(mx(sweep(400, 60, .9, .5, .5), noise(.9, 12, 3, .4)), 36.6)
leadM(37.0, 50.6, BOSS_MEL, .13, 0, .5); bassM(37.0, 50.6, BOSS_RT, .32); drums(37.0, 50.6, 1.1, True)
type_ticks('ИНФЛЯЦИЯ НАПАЛА!', 36.8, 30, .07)
put(sweep(300, 900, .3, .5, .3), 37.95); put(damage(.55), 38.3); put(boom(.5, .5), 38.3); put(sub(.6), 38.3)
type_ticks('СИЛА РУБЛЯ -7,4%', 38.4, 30, .06)
put(blip(988, .05, .3), 40.2); put(blip(988, .04, .25), 40.8); put(confirm(.4), 41.2)
for k in range(5): put(blip(mf(79 + 3 * k), .05, .25), 41.9 + k * .08)
put(boom(.6, .4), 42.3); put(boom(.5, .4), 42.5); put(sub(.5), 42.3)
put(blip(784, .05, .25), 43.3)
put(sweep(300, 1500, .5, .25, .25), 43.7); put(sweep(300, 1100, .4, .25, .2), 44.3)
put(blip(1568, .05, .2), 45.3); put(blip(1760, .05, .2), 45.6); put(chime(.35), 46.2)
put(blip(988, .04, .25), 47.0); put(confirm(.4), 47.4)
put(riser(1.0, 1.0, 200, 2600), 47.9)
put(mx(pulse(110, .7, .5, .4, 2, .05), noise(.7, 2, 3, .4)), 48.8); put(boom(1.0, 1.0), 48.9); put(sub(1.2), 48.9)
put(boom(1.1, 1.6), 49.6)
put(arp([72, 76, 79, 84, 88, 91, 96], .09, .4, .5, .8), 50.8); put(tri(mf(48), 1.2, .5, 1.5), 50.8)
put(sweep(1800, 400, .5, .5, .2), 51.9); put(bump(.8), 52.4); put(noise(.8, 3, 2, .3, hold1=1), 53.2)

# ═══ 4 · СУНДУК: пять фаз ═══
pad(54.0, 57.4, .04)
for tw in (54.8, 55.6): put(tick(.25, 600), tw)
put(jump(.45), 56.0); put(bump(.8), 56.6); put(chime(.3), 56.7)
put(riser(1.0, 1.0, 150, 3000), 57.4)
for i in range(14): put(tick(.12, 900 + 120 * i), 57.4 + i * .07)
put(boom(1.2, 1.4), 58.4); put(sub(1.3, 1.8), 58.4); put(arp([84, 88, 91, 96, 100, 103], .05, .25, .5, .4), 58.5)
put(noise(.4, 2, 5, .25), 59.0)
for i in range(16): put(tick(.12, 1600 + 50 * i), 59.4 + i * .06)
put(chime(.35), 60.4)
for k, h in enumerate((61.4, 61.75, 62.1, 62.45, 62.8)): put(coin(.4), h); put(blip(mf(79 + 2 * k), .04, .15), h)
put(blip(1175, .05, .2), 63.0)
leadM(59.0, 64.6, MEL, .1, 0, .5); bassM(59.0, 64.6, ROOT, .24, 2)
put(riser(.6, .6, 300, 1800), 64.6); put(noise(.8, 3, 1.5, .25, hold1=1), 65.2)

# ═══ 5 · ГОРОД ═══
pad(66.0, 80.0, .045); arpsM(66.5, 79.5, CHORD, .05); bassM(67.0, 79.5, ROOT, .22, 2); drums(70.0, 79.5, .6, False)
PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103, 105]
for i in range(20): put(pulse(mf(PENTA[i]), .12, .25, .22, dec=10), 67.0 + i * .45)
put(arp([79, 84, 88, 91], .08, .35, .5, .4), 73.95); put(sub(.4), 73.95)
put(blip(1046, .05, .25), 76.4); put(blip(1318, .05, .25), 76.9)

# ═══ 6 · НЫРОК ═══
pad(80.0, 92.0, .035)
for a, b in ((80.6, 82.4), (83.2, 85.0), (85.8, 87.6), (88.3, 90.1)):
    put(riser(b - a, .55, 200, 2000), a); put(noise(b - a, 2, 1, .12, hold1=1), a)
    put(pulse(1318, .4, .5, .2, dec=5), b)
put(arp([84, 88, 91, 96], .05, .3, .5, .4), 90.1); put(blip(1568, .05, .25), 91.1)

# ═══ 7 · СОХРАНЕНИЕ ═══
pad(92.0, 100.0, .04); arpsM(92.0, 99.4, CHORD, .04, 2)
put(blip(988, .05, .25), 92.2); put(blip(988, .04, .2), 93.8); put(confirm(.4), 94.2)
for k in range(8): put(tick(.12, 1400 + 100 * k), 94.3 + k * .11)
put(chime(.3), 95.3); put(damage(.35), 97.0); put(noise(.3, 2, 5, .2), 97.6); put(coin(.35), 97.9)
put(noise(.6, 3, 2, .2, hold1=1), 99.4)

# ═══ 8 · ТИТРЫ И ФИНАЛ ═══
leadM(100.0, 109.6, MEL, .12, 0, .5); bassM(100.0, 113.4, ROOT, .26, 2); pad(100.0, 113.4, .035); drums(100.0, 109.6, .6, False)
for ft in (100.6, 101.8, 103.0, 104.3, 105.6, 106.9, 108.2): put(boom(.35, .6), ft); put(arp([88, 91, 96], .03, .12, .5, .1), ft + .05)
for k, tr in enumerate((110.0, 110.5, 111.0, 111.5)):
    put(blip(mf(79 + 3 * k), .06, .3), tr)
    for i in range(6): put(tick(.08, 1800 + 80 * i), tr + .05 + i * .05)
for i in range(12): put(tick(.1, 1500 + 80 * i), 112.0 + i * .06)
put(bump(.8), 113.6); put(arp([60, 64, 67, 72, 76, 79, 84], .07, .35, .5, .8), 113.65); put(sub(.6), 113.6)
type_ticks('ПРО ДЕНЬГИ БЕЗ ВОДЫ', 114.3, 30, .06)
put(blip(988, .05, .25), 115.0); put(confirm(.45), 116.8)
put(arp([72, 76, 79, 84, 88, 91, 96], .07, .35, .5, .5), 117.5)
put(sweep(1400, 90, .9, .5, .3), 118.6)
for tb in (119.55, 119.97): put(blip(1318, .04, .12), tb)

# ── сведение ─────────────────────────────────────────────────────
fade = np.minimum(1, t / .02) * np.minimum(1, (DUR - t) / .2)
out = np.stack([L, R], 1) * fade[:, None]
out = np.tanh(out / (np.max(np.abs(out)) * .6)) * .9
pcm = (out / np.max(np.abs(out)) * .95 * 32767).astype(np.int16)
path = sys.argv[1] if len(sys.argv) > 1 else 'voice/KVEST.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{path}: {DUR:.0f} с')
