#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pack.py — вписывает пиксельные шрифты в тест №6 «Пиксель-3D».

    python3 piks3d/pack.py

Сцена открывается через file://, а Chromium не грузит по file:// шрифты
из соседних файлов. Поэтому @font-face уходят в сцену как data: URI между
/* FONTS-START */ … /* FONTS-END */ (источник — fonts/fonts.css и .woff2:
Press Start 2P, Pixelify Sans — OFL, Google Fonts). three.js берётся из
../kiber/vendor/three-bundle.js обычным <script src>.
"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(HERE, 'fonts')


def faces():
    css = open(os.path.join(FD, 'fonts.css'), encoding='utf-8').read()
    out = []
    for b in re.findall(r'@font-face \{.*?\}', css, re.S):
        fn = re.search(r'url\(([^)]+)\)', b).group(1)
        data = base64.b64encode(open(os.path.join(FD, fn), 'rb').read()).decode()
        out.append(re.sub(r'url\([^)]+\)', 'url(data:font/woff2;base64,' + data + ')', b))
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'piks3d.html')
    s = open(path, encoding='utf-8').read()
    f = faces()
    s, n1 = re.subn(r'/\* FONTS-START \*/.*?/\* FONTS-END \*/',
                    lambda m: '/* FONTS-START */\n' + '\n'.join(f) + '\n/* FONTS-END */', s, flags=re.S)
    if not n1:
        sys.exit(f'{path}: нет меток FONTS')
    open(path, 'w', encoding='utf-8').write(s)
    print(f'{path}: шрифтов {len(f)}, {len(s) // 1024} КБ')


if __name__ == '__main__':
    main()
