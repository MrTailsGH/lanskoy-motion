#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pack.py — вписывает Golos Text (500, 600, 900) в сцену И-01 в 3D.

    python3 i01-3d/pack.py

По file:// Chromium не грузит шрифты из соседних файлов, поэтому @font-face
уходят в сцену как data: URI между /* FONTS-START */ … /* FONTS-END */.
Семейство одно — «G», начертание выбирается весом. Шрифты — OFL, лежат в
i01-3d/fonts/ (копия из /usr/share/fonts/truetype/golos, её ставит setup.sh).
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FACES = [(500, 'GolosText_500Medium.ttf'), (600, 'GolosText_600SemiBold.ttf'), (900, 'GolosText_900Black.ttf')]


def main():
    path = os.path.join(HERE, 'i01-3d.html')
    s = open(path, encoding='utf-8').read()
    css = []
    for w, fn in FACES:
        data = base64.b64encode(open(os.path.join(HERE, 'fonts', fn), 'rb').read()).decode()
        css.append("@font-face{font-family:'G';font-weight:%d;src:url(data:font/ttf;base64,%s) format('truetype')}" % (w, data))
    s, n = re.subn(r'/\* FONTS-START \*/.*?/\* FONTS-END \*/',
                   lambda m: '/* FONTS-START */\n' + '\n'.join(css) + '\n/* FONTS-END */', s, flags=re.S)
    assert n == 1, 'нет меток FONTS-START/END'
    open(path, 'w', encoding='utf-8').write(s)
    print(path, os.path.getsize(path) // 1024, 'КБ')


if __name__ == '__main__':
    main()
