#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""glify.py — контуры букв Golos Text Black для объёмных цифр сцены.

    python3 i01-3d/glify.py

TextGeometry из three.js ждёт шрифт в формате typeface (контуры командами
m/l/q). Делаем его сами из системного TTF через fontTools — и только для
нужных знаков: цифры, ₽, %, +, −, пробел. Пишется i01-3d/golos-black.js
(window.GOLOS_BLACK), грузится обычным <script src>: по file:// fetch закрыт.
"""
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = '/usr/share/fonts/truetype/golos/GolosText_900Black.ttf'
CHARS = '0123456789 ₽%+−-?'


class Pen(BasePen):
    def __init__(self, gs):
        super().__init__(gs)
        self.o = []

    def _moveTo(self, p):
        self.o += ['m', round(p[0]), round(p[1])]

    def _lineTo(self, p):
        self.o += ['l', round(p[0]), round(p[1])]

    def _qCurveToOne(self, c, p):
        # в typeface у q сначала конечная точка, потом управляющая
        self.o += ['q', round(p[0]), round(p[1]), round(c[0]), round(c[1])]

    def _curveToOne(self, c1, c2, p):
        self.o += ['b', round(p[0]), round(p[1]), round(c1[0]), round(c1[1]), round(c2[0]), round(c2[1])]

    def _closePath(self):
        pass


def main():
    f = TTFont(SRC)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f['head'].unitsPerEm
    out = {}
    for ch in CHARS:
        name = cmap.get(ord(ch))
        if not name:
            print('нет знака', ch)
            continue
        pen = Pen(gs)
        gs[name].draw(pen)
        out[ch] = {'ha': gs[name].width, 'x_min': 0, 'x_max': gs[name].width,
                   'o': ' '.join(str(v) for v in pen.o)}
    hh = f['hhea']
    face = {'glyphs': out, 'familyName': 'Golos Text Black', 'resolution': upm,
            'ascender': hh.ascent, 'descender': hh.descent,
            'underlinePosition': -100, 'underlineThickness': 50,
            'boundingBox': {'xMin': f['head'].xMin, 'yMin': f['head'].yMin,
                            'xMax': f['head'].xMax, 'yMax': f['head'].yMax},
            'original_font_information': {'format': 0, 'fontFamily': 'Golos Text'}}
    dst = os.path.join(HERE, 'golos-black.js')
    open(dst, 'w', encoding='utf-8').write(
        '/* контуры Golos Text Black (OFL) для TextGeometry — собрано glify.py */\n'
        'window.GOLOS_BLACK=' + json.dumps(face, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(dst, len(out), 'знаков')


if __name__ == '__main__':
    main()
