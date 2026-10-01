#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pack.py — вписывает шрифты в тест №5 «Неон-рубль».

    python3 kiber/pack.py

Сцена открывается через file://, а Chromium не грузит по file:// ни шрифты,
ни модули из соседних файлов. Поэтому:
  • @font-face уходят в сцену как data: URI между /* FONTS-START */ … /* FONTS-END */
    (источник — fonts/fonts.css и .woff2 рядом: Tektur, Russo One, Unbounded,
    JetBrains Mono — OFL, Google Fonts);
  • three.js 0.169 с дополнениями (EffectComposer, UnrealBloomPass, Reflector…)
    собран esbuild в один IIFE — vendor/three-bundle.js (точка входа
    vendor/three-entry.js) и грузится обычным <script src>: классические
    скрипты по file:// Chromium открывает, модули — нет.
Пересборка бандла:  npm i three@0.169.0 esbuild@0.24.0 &&
    npx esbuild vendor/three-entry.js --bundle --minify --format=iife --outfile=vendor/three-bundle.js
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
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'kiber.html')
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
