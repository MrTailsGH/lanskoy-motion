#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
svodka.py — свести замеры всех разобранных роликов в одну таблицу.

    python3 svodka.py [папка] [--out Primeri/SVODKA.md]

Читает `metrics.json` из каждой подпапки и печатает, что у чужих
роликов общего: сколько склеек, какой длины переходы, сколько покоя,
как громко. Это и есть ответ на вопрос «чем сделано то, что взлетело».

Зависимостей нет.
"""
import json, os, statistics as st, sys
# Windows-консоль отдаёт cp1251, и первая же стрелка «→» роняет скрипт
# с UnicodeEncodeError. Проверено на раннере 20.09.2026: разбор дошёл до
# конца, а упала печать результата. Переключаем поток на UTF-8 сразу.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass


def load(root):
    out = []
    for name in sorted(os.listdir(root)):
        p = os.path.join(root, name, 'metrics.json')
        if os.path.isfile(p):
            m = json.load(open(p, encoding='utf-8'))
            m['папка'] = name
            out.append(m)
    return out


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 2) if xs else None


def main():
    root = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'Primeri'
    out = sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else None
    ms = load(root)
    if not ms:
        sys.exit(f'в {root} нет ни одного metrics.json — сначала razbor.py')

    L = ['# Сводка по чужим роликам', '',
         f'Разобрано роликов: {len(ms)}. Замеры — `razbor.py`, числа не на глаз.', '',
         '| Ролик | Длина | Склеек | Событий | Средн. событие | Покой | LUFS | Звук/мин |',
         '|---|---|---|---|---|---|---|---|']
    for m in ms:
        d, s = m['движение'], m['звук']
        L.append(f"| {m['папка']} | {m['длина']} с | {len(m['склейки'])} | {d['событий']} | "
                 f"{d['средняя_длительность']} с | {int(d['доля_покоя']*100)}% | "
                 f"{s['громкость_LUFS']} | {s['звуковых_событий_в_минуту']} |")

    L += ['', '## Что у них общего', '']
    rows = [
        ('жёстких склеек на ролик', med([len(m['склейки']) for m in ms])),
        ('событий движения', med([m['движение']['событий'] for m in ms])),
        ('длительность события, с', med([m['движение']['средняя_длительность'] for m in ms])),
        ('доля почти неподвижных кадров', med([m['движение']['доля_покоя'] for m in ms])),
        ('громкость, LUFS', med([m['звук']['громкость_LUFS'] for m in ms])),
        ('звуковых событий в минуту', med([m['звук']['звуковых_событий_в_минуту'] for m in ms])),
        ('длина ролика, с', med([m['длина'] for m in ms])),
    ]
    rech = [m['речь']['темп_слов_в_секунду'] for m in ms if m.get('речь')]
    if rech:
        rows.append(('темп речи, слов в секунду', med(rech)))
    L += ['| Показатель | Медиана |', '|---|---|']
    L += [f'| {k} | {v} |' for k, v in rows]

    tr = [t for m in ms for t in m.get('переходы', []) if t.get('расфокус_во_сколько_раз')]
    if tr:
        L += ['', '## Переходы', '',
              f'Разобрано переходов: {len(tr)}. '
              f'Медианное падение резкости на уходе — в '
              f'{med([t["расфокус_во_сколько_раз"] for t in tr])} раза. '
              'Это расфокус: половина ощущения мягкости приходится на него, '
              'а не на прозрачность.', '',
              '| Ролик | t | Яркость до → в провале | Резкость до → в провале |',
              '|---|---|---|---|']
        for m in ms:
            for t in m.get('переходы', []):
                if not t.get('расфокус_во_сколько_раз'): continue
                L.append(f"| {m['папка']} | {t['t']} с | {t['яркость_до']} → {t['яркость_в_провале']} "
                         f"| {t['резкость_до']} → {t['резкость_в_провале']} |")

    dr = [m['дрейф']['смещение_px'] for m in ms if m.get('дрейф')]
    if dr:
        L += ['', '## Дрейф', '',
              f'Медианное смещение картинки в покое — {med(dr)} px за три секунды. '
              'Кадр у них не замирает никогда; глазом это не читается, '
              'но ощущение стоп-кадра снимает.']

    L += ['', '---', '',
          'Файл собирается автоматически: `svodka.py` по всем `metrics.json`. '
          'Руками не править — перезапишется.']
    text = '\n'.join(L) + '\n'
    if out:
        open(out, 'w', encoding='utf-8').write(text)
        print(f'→ {out} ({len(ms)} роликов)')
    else:
        print(text)


if __name__ == '__main__':
    main()
