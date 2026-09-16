#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
align.py — принудительное выравнивание известного текста по дорожке.

Не распознавание речи. Текст известен заранее; задача — найти, где
какое слово прозвучало. Работает на numpy, без сторонних пакетов.

Модель:
  дорожка  → огибающая энергии 100 кадров/с → вероятность «здесь речь»
  текст    → цепочка [слово][пауза][слово][пауза]…
             длительность слова  ≈ число слогов × темп
             длительность паузы  ≈ приор по знаку препинания
  сшивка   → динамическое программирование с явной длительностью:
             ищем разбиение дорожки, минимизирующее
             (несогласие с энергией) + (отклонение от ожидаемых длительностей)

Запуск:
    python3 align.py voice.mp3 text.txt timing.json
"""

import json, math, os, re, subprocess, sys
import numpy as np

# ─────────────────────────────────────────────── параметры

SR      = 16000       # частота дискретизации для анализа
HOP     = 160         # 10 мс — шаг кадра анализа
FPS_A   = SR // HOP   # 100 кадров анализа в секунду

# приоры пауз в секундах: сколько тишины ожидаем ПОСЛЕ слова
PAUSE = {
    ''  : 0.00,   # внутри предложения
    ',' : 0.10,
    '-' : 0.12,   # тире любого начертания
    ':' : 0.18,
    ';' : 0.18,
    '.' : 0.28,
    '!' : 0.28,
    '?' : 0.28,
    '…' : 0.45,
    'BLOCK': 0.55,  # пустая строка — граница блока
}

K_WORD  = 9.0    # вес штрафа за неверную длительность слова
K_GAP   = 4.0    # вес штрафа за неверную длительность паузы
P_FLOOR = 0.02   # чтобы не брать log(0)

VOWELS = set('аеёиоуыэюяАЕЁИОУЫЭЮЯ')


# ─────────────────────────────────────────────── звук

def decode(path):
    """mp3 → numpy float32, моно, 16 кГц. Через ffmpeg, без сторонних библиотек."""
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "s16le", "-"],
        capture_output=True)
    if p.returncode != 0:
        raise RuntimeError("ffmpeg не смог прочитать файл:\n" + p.stderr.decode(errors="replace"))
    x = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    if x.size == 0:
        raise RuntimeError("пустая дорожка")
    return x


def envelope(x):
    """Огибающая громкости в дБ, один отсчёт на 10 мс."""
    n = x.size // HOP
    fr = x[:n * HOP].reshape(n, HOP)
    rms = np.sqrt((fr ** 2).mean(axis=1) + 1e-12)
    db = 20.0 * np.log10(rms)
    # лёгкое сглаживание: 50 мс, чтобы смычки согласных не читались как паузы
    k = np.ones(5) / 5.0
    db = np.convolve(db, k, mode='same')
    return db


def voiced_prob(db):
    """Вероятность «в этом кадре звучит речь». Порог — от самой дорожки."""
    floor = np.percentile(db, 8)     # фон
    peak  = np.percentile(db, 92)    # речь
    span  = max(peak - floor, 6.0)
    thr   = floor + 0.42 * span      # граница между фоном и речью
    slope = max(span / 9.0, 1.2)     # мягкость перехода, дБ
    p = 1.0 / (1.0 + np.exp(-(db - thr) / slope))
    p = np.clip(p, P_FLOOR, 1.0 - P_FLOOR)
    return p, dict(floor=float(floor), peak=float(peak), thr=float(thr))


# ─────────────────────────────────────────────── текст

def syllables(word):
    n = sum(1 for ch in word if ch in VOWELS)
    return max(n, 1)


def parse_text(path):
    """
    Текст → список блоков, блок → список слов.
    Каждому слову приписывается пауза, ожидаемая ПОСЛЕ него.
    """
    raw = open(path, encoding='utf-8').read()
    blocks_raw = [b.strip() for b in re.split(r'\n\s*\n', raw) if b.strip()]
    blocks = []
    for bi, b in enumerate(blocks_raw):
        b = b.replace('\n', ' ')
        toks = re.findall(r'[^\s]+', b)
        words = []
        for t in toks:
            core = re.sub(r'[^\w\-]', '', t, flags=re.UNICODE)
            core = core.strip('-')
            if not core:
                continue
            tail = t[len(t.rstrip('.,:;!?…»")—–-')):] if t != t.rstrip('.,:;!?…»")—–-') else ''
            mark = ''
            for ch in reversed(tail):
                if ch in '…':      mark = '…'; break
                if ch in '.!?':    mark = ch;  break
                if ch in ':;':     mark = ch;  break
                if ch in ',':      mark = ','; break
                if ch in '—–-':    mark = '-'; break
            words.append({'w': core, 'syl': syllables(core), 'mark': mark})
        if words:
            words[-1]['mark'] = 'BLOCK'
            blocks.append(words)
    if blocks:
        blocks[-1][-1]['mark'] = 'BLOCK'
    return blocks


# ─────────────────────────────────────────────── выравнивание

def align(p_voiced, blocks):
    T = p_voiced.size
    cost_v = -np.log(p_voiced)          # цена объявить кадр речью
    cost_s = -np.log(1.0 - p_voiced)    # цена объявить кадр тишиной
    cumV = np.concatenate([[0.0], np.cumsum(cost_v)])
    cumS = np.concatenate([[0.0], np.cumsum(cost_s)])

    words = [w for b in blocks for w in b]
    total_syl = sum(w['syl'] for w in words)

    # темп: сколько кадров на слог. Оцениваем по доле речи в дорожке.
    speech_frames = float(p_voiced.sum())
    rate = max(speech_frames / total_syl, 4.0)   # кадров на слог, минимум 40 мс

    # цепочка единиц: слово, пауза, слово, пауза, … + тишина в начале
    units = [('gap', 0.20)]                      # ведущая тишина
    for w in words:
        units.append(('word', w['syl'] * rate))
        units.append(('gap', PAUSE[w['mark']] * FPS_A))
    units[-1] = ('gap', 0.20 * FPS_A)            # хвостовая тишина — свободная
    units[0]  = ('gap', 0.20 * FPS_A)

    U = len(units)
    INF = 1e18
    dp   = np.full((U + 1, T + 1), INF)
    back = np.zeros((U + 1, T + 1), dtype=np.int32)
    dp[0, 0] = 0.0

    for u in range(U):
        kind, exp = units[u]
        if kind == 'word':
            dmin = max(2, int(0.40 * exp))
            dmax = min(int(2.6 * exp) + 4, 220)
            cum, K = cumV, K_WORD
        else:
            dmin = 0
            free = (u == 0 or u == U - 1)
            dmax = 320 if free else min(int(2.6 * exp) + 26, 260)
            cum, K = cumS, K_GAP
        if dmax < dmin:
            dmax = dmin

        prev = dp[u]
        best = dp[u + 1]
        for d in range(dmin, dmax + 1):
            if kind == 'word':
                pen = K * (math.log(max(d, 1) / max(exp, 1.0))) ** 2
            else:
                if free:
                    pen = 0.0
                else:
                    pen = K * ((d - exp) / (exp + 12.0)) ** 2
            # cand[t] = prev[t-d] + (cum[t]-cum[t-d]) + pen, для t >= d
            if d == 0:
                cand = prev + pen
                t_lo = 0
            else:
                cand = np.full(T + 1, INF)
                cand[d:] = prev[:T + 1 - d] + (cum[d:] - cum[:T + 1 - d]) + pen
                t_lo = d
            m = cand < best
            best[m] = cand[m]
            back[u + 1][m] = d

    # разбор назад
    t = T
    ends = [0] * (U + 1)
    ends[U] = T
    for u in range(U, 0, -1):
        d = int(back[u][t])
        ends[u - 1] = t - d
        t -= d
    if t != 0:
        # не сошлось до нуля — берём что есть
        pass

    bounds = []   # (start, end) каждого слова, в кадрах анализа
    idx = 0
    for u in range(U):
        if units[u][0] == 'word':
            bounds.append((ends[u], ends[u + 1]))
            idx += 1

    cost = float(dp[U, T]) / T
    return bounds, cost, rate


# ─────────────────────────────────────────────── вывод

def run(audio, text, out):
    x = decode(audio)
    dur = x.size / SR
    db = envelope(x)
    p, lev = voiced_prob(db)
    blocks = parse_text(text)
    bounds, cost, rate = align(p, blocks)

    # границы блоков
    B, i = [], 0
    for b in blocks:
        s = bounds[i][0] / FPS_A
        e = bounds[i + len(b) - 1][1] / FPS_A
        B.append([round(s, 3), round(e, 3)])
        i += len(b)

    nwords = len(bounds)
    print(f"файл         {os.path.basename(audio)}")
    print(f"длина        {dur:.2f} с")
    print(f"фон/речь     {lev['floor']:.1f} / {lev['peak']:.1f} дБ, порог {lev['thr']:.1f} дБ")
    print(f"слов         {nwords}   темп {FPS_A/rate:.2f} слог/с "
          f"({nwords/max(dur,0.01)*60:.0f} слов/мин)")
    print(f"цена         {cost:.3f}   "
          + ("норма" if cost < 0.20 else "ПОДОЗРИТЕЛЬНО — текст может не совпадать с записью"))
    print()
    # проверка каждой границы: попала ли она в настоящую тишину
    sil = p < 0.5
    def quiet(a, b_):
        i0, i1 = int(a * FPS_A), int(b_ * FPS_A)
        if i1 <= i0:
            return 0.0
        return float(sil[i0:i1].mean())

    print(f"{'#':>3}  {'начало':>7}  {'конец':>7}  {'пауза':>6}  {'проверка':>8}  текст")
    prev_end = 0.0
    weak = 0
    for n, b in enumerate(blocks, 1):
        s, e = B[n - 1]
        gap = s - prev_end
        q = quiet(prev_end, s) if gap > 0.01 else 0.0
        ok = '—' if n == 1 else (f"{q*100:>3.0f}%" + (' ok' if (q > 0.7 and gap > 0.15) else ' ??'))
        if n > 1 and not (q > 0.7 and gap > 0.15):
            weak += 1
        line = ' '.join(w['w'] for w in b)
        if len(line) > 46:
            line = line[:43] + '…'
        print(f"{n:>3}  {s:>7.2f}  {e:>7.2f}  {gap:>6.2f}  {ok:>8}  {line}")
        prev_end = e
    print()
    if weak == 0:
        print("все границы блоков попали в настоящие паузы — раскладке можно верить")
    else:
        print(f"ВНИМАНИЕ: границ без явной паузы — {weak}. "
              "Проверить на слух до рендера.")

    data = {
        'audio': os.path.basename(audio),
        'DUR': round(dur, 3),
        'cost': round(cost, 4),
        'rate_syl_per_sec': round(FPS_A / rate, 3),
        'B': B,
        'words': [
            {'w': w['w'], 't': round(bd[0] / FPS_A, 3), 'e': round(bd[1] / FPS_A, 3)}
            for w, bd in zip([w for b in blocks for w in b], bounds)
        ],
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"\n→ {out}")
    return data


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    run(sys.argv[1], sys.argv[2], sys.argv[3])
