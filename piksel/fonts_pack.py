#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fonts_pack.py — вписывает пиксельные шрифты в тест №3 «Пиксель».

    python3 piksel/fonts_pack.py piksel/piksel.html

Сцена открывается через file://, а Chromium не грузит по file:// шрифты
из соседних файлов (CORS). Поэтому @font-face уходят в сцену как data: URI
между метками /* FONTS-START */ и /* FONTS-END */. Источник — fonts/fonts.css
и файлы .woff2 рядом с ним (Press Start 2P, Pixelify Sans,
лицензия OFL, Google Fonts).
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
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'piksel.html')
    s = open(path, encoding='utf-8').read()
    f = faces()
    s2, n = re.subn(r'/\* FONTS-START \*/.*?/\* FONTS-END \*/',
                    lambda m: '/* FONTS-START */\n' + '\n'.join(f) + '\n/* FONTS-END */', s, flags=re.S)
    if not n:
        sys.exit(f'{path}: нет меток /* FONTS-START */ … /* FONTS-END */')
    open(path, 'w', encoding='utf-8').write(s2)
    print(f'{path}: вписано начертаний {len(f)}, {len(s2) // 1024} КБ')


if __name__ == '__main__':
    main()
