#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tokens.py — разнести оформление из design-tokens.json по сценам.

    python3 tokens.py                 все сцены i0*.html
    python3 tokens.py i03.html

Сцена обязана оставаться одним самодостаточным файлом: её открывает iframe
при рендере, никаких внешних зависимостей у неё быть не должно. Поэтому
токены не подключаются, а вписываются — между метками, как тайминг.
Руками их в сцене не править: следующий запуск перезапишет.
"""

import glob, json, os, re, sys

BEG = "/* ═══ ОФОРМЛЕНИЕ · начало ═══ вписано tokens.py, руками не править ═══ */"
END = "/* ═══ ОФОРМЛЕНИЕ · конец ════════════════════════════════════════════ */"

HERE = os.path.dirname(os.path.abspath(__file__))


def block(t):
    c, s, d, r, m = (t['цвет'], t['поверхность'], t['разделитель'],
                     t['скругление'], t['движение'])
    return f"""{BEG}
/* Структура — из HeroUI: лесенка поверхностей, разделитель прозрачностью,
   шкала скруглений, асимметричное движение. Цвета свои: они несут смысл
   по разделу 6 регламента. Источник — design-tokens.json. */
const C={{bg:'{c['bg']}',ink:'{c['ink']}',dim:'{c['dim']}',dim2:'{c['dim2']}',
         green:'{c['green']}',red:'{c['red']}',teal:'{c['teal']}',
         card:'{s['c1']}',line:'{d['line']}'}};
const S={{c1:'{s['c1']}',c2:'{s['c2']}',c3:'{s['c3']}',c4:'{s['c4']}'}};
const LINE2='{d['line2']}';
const RAD={{sm:{r['sm']},md:{r['md']},lg:{r['lg']},full:{r['full']}}};
const MOT={{in:{m['in']},out:{m['out']}}};
{END}"""


def apply(path, t):
    h = open(path, encoding='utf-8').read()
    blk = block(t)

    if BEG in h and END in h:
        h = re.sub(re.escape(BEG) + r".*?" + re.escape(END), lambda _: blk, h, flags=re.S)
    else:
        # первый заход: выкидываем старое объявление цветов и вписываем блок
        # сразу после META — до помощников, которые уже читают MOT
        h = re.sub(r"const C=\{bg:.*?\};\n", "", h, flags=re.S, count=1)
        anchor = "window.META={FPS,DUR,FRAMES};\n"
        if anchor not in h:
            sys.exit(f"{path}: не нашёл window.META, куда вписывать")
        h = h.replace(anchor, anchor + "\n" + blk + "\n", 1)

    # скругления — по шкале, а не на глаз
    h = re.sub(r"borderRadius:'(28|30)px'", "borderRadius:px(RAD.lg)", h)
    h = re.sub(r"borderRadius:'(22|26)px'", "borderRadius:px(RAD.full)", h)
    h = re.sub(r"borderRadius:'14px'", "borderRadius:px(RAD.sm)", h)
    # уход акта — общая длительность из токенов
    h = h.replace("const FADE=0.22;", "const FADE=MOT.out;")

    open(path, 'w', encoding='utf-8').write(h)
    return h


def main():
    t = json.load(open(os.path.join(HERE, 'design-tokens.json'), encoding='utf-8'))
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, 'i0*.html')))
    for f in files:
        apply(f, t)
        print(f"{os.path.basename(f)}: оформление вписано")


if __name__ == '__main__':
    main()
