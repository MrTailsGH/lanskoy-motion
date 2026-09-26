#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Вписать Lottie-анимации в сцену, чтобы она осталась одним файлом.

    python3 assets/lottie/lottie_pack.py i06.html

В сцене одна строка говорит, какие анимации нужны:

    <!-- LOTTIE coin-rub,check,chart-grow -->

Сразу за ней скрипт вписывает (или перевписывает при повторном запуске)
блок <script id="lottie-pack"> с плеером lottie-web (полная сборка — облегчённая
lottie_light не рисует эффекты Fill, на них держатся цвета переходов), помощником
lottie-seek.js, переходами perehody.js и данными window.LOTTIE[name] из assets/lottie/<name>.json.
Руками блок не править — следующий запуск перезапишет, как tokens.py.

Имена — файлы этой папки без .json. Каталог с превью — README.md рядом.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TAG = re.compile(r"<!--\s*LOTTIE\s+([\w,\s-]+?)\s*-->")
BLOCK = re.compile(r'\s*<script id="lottie-pack">.*?</script>', re.S)


def pack(names):
    lib = open(os.path.join(HERE, "lottie.min.js"), encoding="utf-8").read()
    helper = open(os.path.join(HERE, "lottie-seek.js"), encoding="utf-8").read()
    helper += "\n" + open(os.path.join(HERE, "perehody.js"), encoding="utf-8").read()
    data = {}
    for n in names:
        p = os.path.join(HERE, n + ".json")
        if not os.path.exists(p):
            sys.exit(f"нет анимации {n}: {p}")
        data[n] = json.load(open(p, encoding="utf-8"))
    js = "window.LOTTIE=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";"
    body = "\n".join([lib, helper, js]).replace("</script", "<\\/script")
    return f'\n<script id="lottie-pack">/* вписано lottie_pack.py: {", ".join(names)} */\n{body}\n</script>'


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    html = open(path, encoding="utf-8").read()
    m = TAG.search(html)
    if not m:
        sys.exit("в сцене нет строки <!-- LOTTIE имя,имя -->")
    names = [x.strip() for x in m.group(1).split(",") if x.strip()]
    head, tail = html[:m.end()], html[m.end():]
    tail = BLOCK.sub("", tail, count=1) if tail.lstrip().startswith('<script id="lottie-pack">') else tail
    html = head + pack(names) + tail
    open(path, "w", encoding="utf-8").write(html)
    print(f"{path}: вписано {len(names)} анимаций ({', '.join(names)}), {len(html) // 1024} КБ")


if __name__ == "__main__":
    main()
