#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Замер перехода Lottie: когда он закрывает весь кадр вертикали.

    python3 lottie_cover.py <transition.json> [--write]

Переход — это анимация, которая на какое-то время закрывает экран целиком.
В этот момент сцена меняет акт, и зритель видит не склейку, а шторку.
Скрипт рисует анимацию в кадре 9:16 (как в ролике: обрезка по краям —
preserveAspectRatio slice — и запас 3% за край), покадрово меряет долю закрытых пикселей и
находит «окно закрытия» — кадры, где закрыто ≥ 99,5%.

Печатает кривую и окно. С --write пишет в сам файл meta.lanskoy:
    peak   — середина окна, секунды от начала анимации
    win    — [начало, конец] окна, секунды
    mode   — through: закрывает и сам же открывает (круг, полосы, шевроны);
             mirror: только закрывает или только открывает — до смены акта
             играет к пику, после — обратно (twist, splash)
    cover  — наибольшая доля закрытия
Его читает LOT.cut() в lottie-seek.js, чтобы поставить пик ровно на смену акта.
"""
import io, json, os, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
# LOT.cut() растягивает переход на 3% за край кадра: у многих файлов по краю
# остаётся полоска в пиксель. Меряем в тех же условиях, что и рисуем.
OVERSCAN = 1.03


def player():
    for p in (os.path.join(HERE, "..", "assets", "lottie", "lottie.min.js"),
              os.path.join(HERE, "node_modules", "lottie-web", "build", "player", "lottie.min.js"),
              "node_modules/lottie-web/build/player/lottie.min.js"):
        if os.path.exists(p):
            return os.path.abspath(p)
    sys.exit("нет lottie.min.js: он лежит в assets/lottie/")


def measure(anim, w=108, h=192):
    lib = player()
    tmp = os.path.abspath("_cover.html")
    open(tmp, "w").write(f'<html><body style="margin:0;background:transparent"><div id=c style="width:{w}px;height:{h}px;transform:scale({OVERSCAN})"></div>'
                         f'<script src="file://{lib}"></script></body></html>')
    cov = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--allow-file-access-from-files"])
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto("file://" + tmp)
        pg.evaluate("d=>{window.an=lottie.loadAnimation({container:document.getElementById('c'),renderer:'svg',loop:false,"
                    "autoplay:false,animationData:d,rendererSettings:{preserveAspectRatio:'xMidYMid slice'}})}", anim)
        pg.wait_for_timeout(150)
        for f in range(int(anim["ip"]), int(anim["op"])):
            pg.evaluate(f"window.an.goToAndStop({f},true)")
            a = np.asarray(Image.open(io.BytesIO(pg.screenshot(omit_background=True))).convert("RGBA"))[:, :, 3]
            cov.append(float((a >= 250).mean()))
        b.close()
    os.remove(tmp)
    return cov


def main():
    path = sys.argv[1]
    anim = json.load(open(path, encoding="utf-8"))
    fr, ip = anim["fr"], anim["ip"]
    cov = measure(anim)
    top = max(cov)
    thr = min(0.995, top - 0.002)
    idx = [i for i, c in enumerate(cov) if c >= thr]
    # самое длинное сплошное окно
    best, cur = [], []
    for i in idx:
        cur = cur + [i] if cur and i == cur[-1] + 1 else [i]
        if len(cur) > len(best):
            best = cur
    a, z = best[0], best[-1]
    mode = "through" if cov[0] < 0.5 and cov[-1] < 0.5 else "mirror"
    meta = {"peak": round((a + z) / 2 / fr, 3), "win": [round(a / fr, 3), round(z / fr, 3)],
            "mode": mode, "cover": round(top, 4), "dur": round(len(cov) / fr, 3)}
    line = "".join(" ▁▂▃▄▅▆▇█"[min(8, int(c * 8.99))] for c in cov[::max(1, len(cov) // 60)])
    print(os.path.basename(path), json.dumps(meta, ensure_ascii=False))
    print("  закрытие:", line)
    if top < 0.99:
        print("  ВНИМАНИЕ: кадр не закрывается целиком — при смене акта будет видна склейка")
    if "--write" in sys.argv:
        anim.setdefault("meta", {})["lanskoy"] = meta
        json.dump(anim, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
