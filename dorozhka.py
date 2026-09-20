#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dorozhka.py — принять дорожку из Eleven Labs и довести сцену до рендера.

    python3 dorozhka.py I-01
    python3 dorozhka.py I-03 --tail 2.0

Делает подряд то, что раньше делалось четырьмя командами:

    выравнивание  align.py    → пословные тайминги и таблица границ
    раскладка     settime.py  → блоки из таймингов уезжают в сцену
    проверки      audit.py    → контракт сцены: чистая функция seek
                  overlap.py  → наложения на экране

**Таблица границ печатается целиком и её надо прочитать.** Порядок цеха:
раскладку смотрит человек до рендера, а не после. Если хоть одна граница
не попала в паузу, дальше идти нельзя — правится текст блока, а не цифры.
"""
import os, subprocess, sys
# Windows-консоль отдаёт cp1251 и роняет печать со стрелкой.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable or 'python3'


def шаг(заголовок, cmd):
    print(f"\n── {заголовок} ──", flush=True)
    r = subprocess.run([PY] + cmd, cwd=HERE)
    if r.returncode != 0:
        sys.exit(f'{заголовок}: не вышло (код {r.returncode})')


def main():
    args = sys.argv[1:]
    если = [a for a in args if not a.startswith('--')]
    if not если:
        print(__doc__); sys.exit(1)
    имя = если[0].upper()
    хвост = args[args.index('--tail') + 1] if '--tail' in args else '1.4'

    дорожка = os.path.join('voice', имя + '.mp3')
    текст = f'text-{имя}.txt'
    тайминги = f'timing-{имя}.json'
    сцена = 'i' + имя.split('-')[1] + '.html'

    for ф, что in ((дорожка, 'дорожка из Eleven Labs'), (текст, 'текст озвучки')):
        if not os.path.isfile(os.path.join(HERE, ф)):
            sys.exit(f'нет файла {ф} — {что}')

    шаг('выравнивание', ['align.py', дорожка, текст, тайминги])
    if not os.path.isfile(os.path.join(HERE, сцена)):
        print(f'\nсцены {сцена} ещё нет — тайминги готовы, раскладывать некуда')
        return
    шаг('раскладка в сцену', ['settime.py', сцена, тайминги, '--tail', хвост])
    шаг('проверка контракта', ['audit.py', сцена])
    шаг('проверка наложений', ['overlap.py', сцена])
    print(f"\nготово. Границы выше — прочитать глазами, потом собирать ролик.")


if __name__ == '__main__':
    main()
