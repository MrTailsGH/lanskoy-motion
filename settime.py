#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
settime.py — подставить тайминг дорожки в сцену.

Сцена держит всё время в одном объекте T наверху файла, между метками
«ТАЙМИНГ · начало» и «ТАЙМИНГ · конец». Этот скрипт переписывает только
этот кусок, ничего больше в файле не трогая.

Два режима:

    python3 settime.py i01.html timing.json
        подставить настоящую раскладку — то, что выдал align.py

    python3 settime.py i01.html --estimate text-I-01.txt
        подставить ОЦЕНКУ по темпу Станислава, пока дорожки нет.
        Сцену можно строить и смотреть до записи; когда дорожка
        придёт, оценка заменяется первой командой.

    python3 settime.py i01.html timing.json --tail 1.4
        придержать картинку на 1,4 с после последнего слова.

Про хвост. Длина ролика по-прежнему не назначается — её задаёт дорожка. Но
CTA надо успеть прочитать, а ElevenLabs иногда срезает тишину в конце
вплотную к последнему слову. Тогда финальный кадр держится своим ходом:
голос кончился, картинка ещё секунду стоит. Это не растягивание ролика под
картинку, это пауза после точки.
"""

import json, re, sys, os

WPM      = 125.0   # темп Станислава, слов в минуту (замерено на двух дорожках)
LEAD     = 0.30    # тишина перед первым словом
TAIL     = 0.45    # тишина после последнего

BEG = "/* ═══ ТАЙМИНГ · начало ══════════════════════════════════════════ */"
END = "/* ═══ ТАЙМИНГ · конец ═══════════════════════════════════════════ */"


def block_js(src, dur, B):
    rows = ",\n".join(
        f"  [{s:>6.2f}, {e:>6.2f}]   /* {i:>2} */" for i, (s, e) in enumerate(B, 1))
    return (BEG + "\n"
            "const T = {\n"
            f"  src: {json.dumps(src, ensure_ascii=False)},\n"
            f"  DUR: {dur:.2f},\n"
            "  B: [\n" + rows + "\n  ]\n"
            "};\n" + END)


def from_timing(path, tail=0.0):
    d = json.load(open(path, encoding='utf-8'))
    B = [(float(a), float(b)) for a, b in d['B']]
    src = d.get('audio', os.path.basename(path))
    if tail:
        src += f" + хвост {tail:.2f} с"
    return src, float(d['DUR']) + tail, B


def estimate(text_path):
    """Оценка раскладки по тексту: слоги × темп + приоры пауз из align.py."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from align import parse_text, PAUSE          # numpy нужен только align.py

    blocks = parse_text(text_path)
    words  = [w for b in blocks for w in b]
    syl    = sum(w['syl'] for w in words)
    gaps   = sum(PAUSE[w['mark']] for w in words)
    # темп подбираем так, чтобы средняя скорость вышла ровно WPM
    total    = len(words) / (WPM / 60.0)
    speech   = total - gaps
    if speech <= 0:
        raise SystemExit("текст слишком короткий для такой оценки")
    syl_dur  = speech / syl

    t, B = LEAD, []
    for b in blocks:
        s = t
        for w in b:
            t += w['syl'] * syl_dur
            e = t
            t += PAUSE[w['mark']]
        B.append((round(s, 2), round(e, 2)))
    dur = t - PAUSE['BLOCK'] + TAIL
    src = (f"ОЦЕНКА по темпу {WPM:.0f} слов/мин — дорожки ещё нет. "
           f"Заменить на timing.json от align.py")
    return src, dur, B


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    scene = sys.argv[1]
    tail = 0.0
    if '--tail' in sys.argv:
        i = sys.argv.index('--tail')
        if len(sys.argv) <= i + 1:
            print("не указано, сколько держать хвост"); sys.exit(1)
        tail = float(sys.argv[i + 1].replace(',', '.'))
    if sys.argv[2] == '--estimate':
        if len(sys.argv) < 4:
            print("не указан файл текста"); sys.exit(1)
        src, dur, B = estimate(sys.argv[3])
    else:
        src, dur, B = from_timing(sys.argv[2], tail)

    html = open(scene, encoding='utf-8').read()
    if BEG not in html or END not in html:
        print(f"в {scene} нет меток тайминга — это не сцена нового образца")
        sys.exit(1)
    new = block_js(src, dur, B)
    html = re.sub(re.escape(BEG) + r".*?" + re.escape(END), lambda m: new, html,
                  flags=re.S)
    open(scene, 'w', encoding='utf-8').write(html)

    print(f"{scene}: {len(B)} блоков, длина {dur:.2f} с")
    print(f"источник: {src}")
    for i, (s, e) in enumerate(B, 1):
        pause = "" if i == 1 else f"пауза {s - B[i-2][1]:.2f}"
        print(f"  {i:>2}  {s:>6.2f} … {e:>6.2f}   {e-s:>5.2f} с   {pause}")


if __name__ == '__main__':
    try:
        main()
    except BrokenPipeError:
        pass          # вывод обрезали через head — это не ошибка
