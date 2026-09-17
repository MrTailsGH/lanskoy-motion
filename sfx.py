#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sfx.py — синтезировать набор звуковых эффектов канала.

    python3 sfx.py            кладёт wav-файлы в sfx/

Почему синтез, а не библиотека звуков: лицензии не нужны, длительность
подгоняется под наши анимации до миллисекунды, тембр один на весь канал.
Всё детерминировано — зерно шума фиксировано, повторный запуск даёт те же
файлы байт в байт.

Эффекты нарочно тихие. Они идут под голос диктора и должны ощущаться, а не
слушаться: громкий интерфейсный звук в ролике про деньги выглядит дёшево.
"""

import os, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx')
RNG = np.random.default_rng(20260917)      # фиксированное зерно


def save(name, x, peak=0.5):
    x = np.asarray(x, dtype=np.float64)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    # мягкие края, чтобы не щёлкало на стыке
    n = min(64, x.size // 8)
    if n > 0:
        x[:n] *= np.linspace(0, 1, n)
        x[-n:] *= np.linspace(1, 0, n)
    data = (x * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())
    return x.size / SR


def env(n, attack=0.002, decay=0.08, power=2.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    d = np.exp(-t / decay) ** power
    return a * d


def tone(f, dur, decay=0.06, harm=(1.0, 0.3, 0.12)):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in enumerate(harm, 1))
    return x * env(n, decay=decay)


def click(f=2100, dur=0.035):
    """Сухой щелчок: короткий шум через узкую полосу."""
    n = int(SR * dur)
    x = RNG.normal(0, 1, n)
    t = np.arange(n) / SR
    x = x * np.sin(2 * np.pi * f * t)
    return x * env(n, attack=0.0005, decay=0.008)


def counter(dur=0.55, rate=26, f0=1500, f1=2600):
    """Пересчёт: частые тихие щелчки с подъёмом тона к концу.
       Длительность задаётся ровно той же, что у набегания числа в сцене."""
    n = int(SR * dur)
    x = np.zeros(n)
    step = SR / rate
    k = 0
    while int(k * step) < n:
        i = int(k * step)
        p = i / n
        c = click(f0 + (f1 - f0) * p, 0.030) * (0.35 + 0.65 * p)
        j = min(n, i + c.size)
        x[i:j] += c[:j - i]
        k += 1
    return x


def land(f=180, dur=0.55):
    """Приход крупного числа: низкий удар плюс короткий обертон."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f * np.exp(-t * 6) + 55) * t) * env(n, decay=0.14)
    bell = tone(f * 6.5, dur * 0.5, decay=0.07) * 0.25
    x = body.copy()
    x[:bell.size] += bell
    return x


def flash(dur=0.42):
    """Смена акта: подъём шумом, срезанный на самой вспышке."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = RNG.normal(0, 1, n)
    # полоса едет вверх — грубый фильтр через модуляцию
    sweep = np.sin(2 * np.pi * (600 + 3400 * (t / dur) ** 2) * t)
    up = (t / dur) ** 2.2
    x = noise * sweep * up
    x[int(n * 0.93):] *= np.linspace(1, 0, n - int(n * 0.93))
    return x


def row(dur=0.10):
    """Строка карточки встала на место. Совсем тихо."""
    return tone(1180, dur, decay=0.018, harm=(1.0, 0.25))


def pill(dur=0.14):
    """Пилюля выбора — «клик» интерфейса."""
    a = tone(820, dur * 0.5, decay=0.03)
    b = tone(1240, dur * 0.5, decay=0.04)
    return np.concatenate([a, b])


if __name__ == '__main__':
    made = {
        'count':  save('count',  counter(),      0.30),
        'land':   save('land',   land(),         0.60),
        'flash':  save('flash',  flash(),        0.45),
        'row':    save('row',    row(),          0.22),
        'pill':   save('pill',   pill(),         0.30),
        'blip':   save('blip',   tone(1560, 0.12, decay=0.03), 0.26),
    }
    for k, v in sorted(made.items()):
        print(f"  {k:<6} {v*1000:>5.0f} мс")
    print(f"\n→ {OUT}")
