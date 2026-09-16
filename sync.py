#!/usr/bin/env python3
"""
sync.py — разбор дорожки озвучки на фразы и выдача тайминга для сцены.

Порядок работы канала: сначала озвучка, потом картинка под неё.
Скрипт находит границы фраз по уровню сигнала, подбирая порог так,
чтобы число найденных фраз совпало с числом абзацев в тексте.

  python3 sync.py voice.mp3 text.txt out.json   → раскладка по абзацам текста
  python3 sync.py voice.mp3 10                  → просто границы 10 фраз

Текстовый файл — тот же, что отдавали в Eleven Labs: абзацы разделены
пустой строкой. Так надёжнее: скрипт сопоставляет участки речи с абзацами
по числу слов, а не гадает по числу пауз.

Выход: JSON с длиной ролика, обрезкой тишины и границами каждой фразы.
"""
import subprocess, sys, re, json, os

NOISE = "-32dB"                      # порог тишины
TRIES = [0.55, 0.50, 0.45, 0.40, 0.36, 0.32, 0.28, 0.25, 0.22, 0.20]


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True).stdout.strip()
    return float(out)


def silences(path, mind):
    """Возвращает список (начало, конец) участков тишины."""
    p = subprocess.run(
        ["ffmpeg", "-i", path, "-af",
         f"silencedetect=noise={NOISE}:d={mind}", "-f", "null", "-"],
        capture_output=True, text=True)
    log = p.stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    if len(ends) > len(starts):          # тишина в самом начале файла
        starts = [0.0] + starts
    if len(starts) > len(ends):          # тишина до конца файла
        ends = ends + [probe_duration(path)]
    return list(zip(starts, ends))


def seg_volume(path, a, b):
    """Средняя громкость участка, дБ."""
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-ss", str(a), "-t", str(max(0.05, b - a)),
         "-i", path, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True)
    m = re.search(r"mean_volume: (-?[\d.]+) dB", p.stderr)
    return float(m.group(1)) if m else -99.0


def segments(path, mind):
    """Участки речи между паузами."""
    dur = probe_duration(path)
    sil = silences(path, mind)
    segs, cur = [], 0.0
    for a, b in sil:
        if a > cur + 0.05:
            segs.append((cur, a))
        cur = b
    if dur > cur + 0.05:
        segs.append((cur, dur))
    segs = [s for s in segs if s[1] - s[0] > 0.25]
    if len(segs) < 2:
        return segs
    # Отсев вдохов и щелчков: ffmpeg не помечает тишину в самом начале файла,
    # а тихий вдох может оказаться громче порога. Считаем громкость каждого
    # участка и выбрасываем те, что заметно тише медианы.
    vols = [seg_volume(path, a, b) for a, b in segs]
    med = sorted(vols)[len(vols) // 2]
    keep = [s for s, v in zip(segs, vols) if v > med - 11.0]
    return keep if len(keep) >= 2 else segs


def align(segs, words, total_speech):
    """
    Сопоставление участков речи с абзацами текста.

    Пауза внутри предложения и пауза между абзацами на слух одинаковые,
    поэтому «сколько пауз — столько абзацев» не работает: один абзац может
    развалиться на два участка, а два коротких — слиться в один.

    Поэтому раскладываем динамикой: каждому абзацу достаётся подряд идущая
    группа участков, суммарная длина группы должна быть близка к ожидаемой
    (число слов × средний темп). Минимизируем суммарное расхождение.
    """
    M, N = len(segs), len(words)
    rate = total_speech / sum(words)                 # секунд на слово
    want = [w * rate for w in words]
    dur = [b - a for a, b in segs]
    pre = [0.0]
    for d in dur:
        pre.append(pre[-1] + d)

    INF = float("inf")
    cost = [[INF] * (N + 1) for _ in range(M + 1)]
    back = [[-1] * (N + 1) for _ in range(M + 1)]
    cost[0][0] = 0.0
    for j in range(1, N + 1):
        for i in range(j, M - (N - j) + 1):
            for k in range(j - 1, i):                # группа k..i-1 → абзац j
                if cost[k][j - 1] == INF:
                    continue
                got = pre[i] - pre[k]
                c = cost[k][j - 1] + abs(got - want[j - 1])
                if c < cost[i][j]:
                    cost[i][j] = c
                    back[i][j] = k

    groups, i = [], M
    for j in range(N, 0, -1):
        k = back[i][j]
        groups.append((k, i))
        i = k
    groups.reverse()
    return [(segs[a][0], segs[b - 1][1]) for a, b in groups], cost[M][N]


def split_by_biggest_gaps(path, n_blocks):
    """
    Режем дорожку по САМЫМ ДЛИННЫМ паузам.

    Работает, когда паузы на границах блоков заведомо длиннее, чем паузы
    внутри блока, — то есть когда в тексте каждый блок закончен многоточием.
    Тогда достаточно взять n-1 самых длинных пауз: гадать не нужно.
    """
    dur = probe_duration(path)
    sil = silences(path, 0.18)                    # ловим все паузы
    # первая «тишина» может быть речью: ffmpeg не метит тишину в начале файла
    gaps = [(a, b, b - a) for a, b in sil if b - a >= 0.18]
    if len(gaps) < n_blocks - 1:
        return None, gaps
    top = sorted(gaps, key=lambda g: -g[2])[:n_blocks - 1]
    top.sort(key=lambda g: g[0])

    # границы блоков: от конца предыдущей паузы до начала следующей
    bounds, start = [], 0.0
    for a, b, _ in top:
        bounds.append((start, a))
        start = b
    bounds.append((start, dur))

    # отсечь тишину по краям по громкости, а не по событиям
    first_a, first_b = bounds[0]
    step = 0.05
    t = first_a
    while t < first_b - 0.2 and seg_volume(path, t, t + 0.25) < -45:
        t += step
    bounds[0] = (round(t, 3), first_b)

    last_a, last_b = bounds[-1]
    t = last_b
    while t > last_a + 0.2 and seg_volume(path, t - 0.25, t) < -45:
        t -= step
    bounds[-1] = (last_a, round(t, 3))
    return bounds, gaps


def analyse(path, expect, words=None):
    dur = probe_duration(path)
    if words:
        # Нужно БОЛЬШЕ участков, чем абзацев: пусть текст разложится по ним
        # динамикой. Идём от грубого порога к мелкому, пока участков не станет
        # заметно больше числа абзацев.
        best, best_d = None, None
        for d in TRIES:
            segs = segments(path, d)
            best, best_d = segs, d
            if len(segs) >= expect * 1.4:
                break
        if len(best) < expect:                    # пауз меньше, чем абзацев
            best = segments(path, TRIES[-1])
            best_d = TRIES[-1]
    else:
        best, best_d, best_gap = None, None, 10 ** 9
        for d in TRIES:
            segs = segments(path, d)
            gap = abs(len(segs) - expect)
            if gap < best_gap:
                best, best_d, best_gap = segs, d, gap
            if gap == 0:
                break

    # если известны слова по абзацам — раскладываем участки по абзацам
    align_err = None
    raw_segments = len(best)
    if words and len(best) >= expect:
        total_speech = sum(b - a for a, b in best)
        best, align_err = align(best, words, total_speech)

    head = round(best[0][0], 3)                  # тишина в начале
    tail = round(dur - best[-1][1], 3)           # тишина в конце
    speech_end = best[-1][1]

    phrases = [{"i": i + 1,
                "start": round(s - head, 3),     # время уже БЕЗ начальной тишины
                "end":   round(e - head, 3),
                "len":   round(e - s, 3)}
               for i, (s, e) in enumerate(best)]

    return {
        "file": os.path.basename(path),
        "duration_raw": round(dur, 3),
        "trim_head": head,
        "trim_tail": tail,
        "duration_trimmed": round(speech_end - head, 3),
        "threshold_used": best_d,
        "raw_segments": raw_segments,
        "phrases_found": len(best),
        "phrases_expected": expect,
        "matched": len(best) == expect,
        "align_error": None if align_err is None else round(align_err, 2),
        "phrases": phrases,
    }


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    if "--blocks" in sys.argv:
        sys.argv.remove("--blocks")
        path, n = sys.argv[1], None
        arg2 = sys.argv[2]
        if os.path.exists(arg2):
            paras = [x.strip() for x in open(arg2, encoding="utf-8").read().split("\n\n") if x.strip()]
            n = len(paras)
        else:
            n = int(arg2)
        bounds, gaps = split_by_biggest_gaps(path, n)
        if bounds is None:
            print(f"Пауз найдено {len(gaps)}, нужно минимум {n-1}. "
                  "Блоки не разделены — генерировать заново с многоточиями.")
            sys.exit(2)
        print(f"блоков          {n}")
        print(f"пауз всего      {len(gaps)}")
        used = sorted([g[2] for g in sorted(gaps, key=lambda g: -g[2])[:n-1]])
        rest = sorted([g[2] for g in sorted(gaps, key=lambda g: -g[2])[n-1:]], reverse=True)
        print(f"взятые паузы    от {used[0]:.2f} до {used[-1]:.2f} с")
        if rest:
            print(f"следующая пауза {rest[0]:.2f} с  ← запас "
                  f"{used[0]-rest[0]:+.2f} с")
            if used[0] - rest[0] < 0.15:
                print("                ЗАПАС МАЛ: границы могли уехать, проверить глазами")
        print()
        print(" №   начало    конец   длина")
        t0 = bounds[0][0]
        for i, (a, b) in enumerate(bounds, 1):
            print(f"{i:>3}   {a-t0:>6.2f}   {b-t0:>6.2f}   {b-a:>5.2f}")
        print(f"\nЧИСТАЯ ДЛИНА    {bounds[-1][1]-t0:.3f} с")
        if len(sys.argv) > 3:
            json.dump({"mode": "blocks", "file": os.path.basename(path),
                       "offset": round(t0, 3),
                       "duration": round(bounds[-1][1] - t0, 3),
                       "blocks": [{"i": i + 1, "start": round(a - t0, 3),
                                   "end": round(b - t0, 3), "len": round(b - a, 3)}
                                  for i, (a, b) in enumerate(bounds)]},
                      open(sys.argv[3], "w", encoding="utf-8"),
                      ensure_ascii=False, indent=2)
            print(f"Тайминг записан: {sys.argv[3]}")
        return

    path, arg2 = sys.argv[1], sys.argv[2]
    words = None
    if os.path.exists(arg2):                     # передали файл с текстом
        paras = [x.strip() for x in open(arg2, encoding="utf-8").read().split("\n\n") if x.strip()]
        words = [len(x.split()) for x in paras]
        expect = len(paras)
        print(f"текст               {os.path.basename(arg2)}: {expect} абзацев, {sum(words)} слов")
    else:
        expect = int(arg2)
    r = analyse(path, expect, words)

    print(f"файл                {r['file']}")
    print(f"длина исходная      {r['duration_raw']:.3f} с")
    print(f"тишина в начале     {r['trim_head']:.3f} с")
    print(f"тишина в конце      {r['trim_tail']:.3f} с")
    print(f"ЧИСТАЯ ДЛИНА        {r['duration_trimmed']:.3f} с   ← длина ролика")
    print(f"порог паузы         {r['threshold_used']} с")
    print(f"фраз найдено        {r['phrases_found']} из {r['phrases_expected']}"
          + ("  ✓" if r["matched"] else "  ✗ РАСХОЖДЕНИЕ"))
    print()
    print(" №   начало    конец   длина")
    for p in r["phrases"]:
        print(f"{p['i']:>3}   {p['start']:>6.2f}   {p['end']:>6.2f}   {p['len']:>5.2f}")

    if not r["matched"]:
        print("\nФраз найдено не столько, сколько абзацев в тексте.")
        print("Причины: модель проглотила пустую строку, или внутри абзаца")
        print("оказалась длинная пауза. Свериться с текстом вручную.")

    print()
    print("Обрезать тишину:")
    print(f"  ffmpeg -y -i {r['file']} -ss {r['trim_head']} "
          f"-t {r['duration_trimmed']} -c:a libmp3lame -q:a 2 voice_trim.mp3")

    if len(sys.argv) > 3:
        json.dump(r, open(sys.argv[3], "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        print(f"\nТайминг записан: {sys.argv[3]}")


if __name__ == "__main__":
    main()
