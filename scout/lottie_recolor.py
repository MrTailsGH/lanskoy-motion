#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Перекраска Lottie в палитру канала Ланского (токены — design-tokens.json).

    python3 lottie_recolor.py <in.json|.lottie> --dump          # какие цвета внутри
    python3 lottie_recolor.py <in> <out.json> [опции]

Режим auto: каждый цвет (заливки, обводки, градиенты, анимированные цвета,
текст) относим к группе по оттенку и переносим на токен палитры, сохраняя
разницу в светлоте внутри группы — светотень рисунка остаётся.
    red     красный/розовый/пурпурный  -> red   (потеря)
    warm    оранжевый/жёлтый           -> green (деньги: монеты, купюры)
    green   зелёный                    -> green
    blue    бирюзовый/синий/фиолетовый -> teal  (бренд)
    neutral серые, почти чёрные/белые  -> keep
Опции:
    --as warm=ink,blue=c3        другая раскладка групп (токены: green red teal
                                 ink dim dim2 c1..c4, keep — не трогать)
    --map "#ED5729=c3,#FFFFFF=keep"  точные замены по ИСХОДНОМУ цвету (±12/255)
    --text "₹=₽"                 заменить символы в текстовых слоях
    --font "Golos Text Black"    шрифт текстовых слоёв (грузит сцена)
    --drop "GOOD Outlines,..."   убрать слои по имени (английские надписи)
    --unhide "₹"                 показать скрытый автором слой по имени
"""
import colorsys, io, json, os, sys, zipfile

# Палитра — из design-tokens.json в корне репозитория (раздел 6 регламента:
# зелёный — деньги, красный — потеря, бирюзовый — бренд; других значений нет).
FALLBACK = {"bg": "#0A0D0C", "ink": "#FFFFFF", "dim": "#6E7A76", "dim2": "#49544F",
            "green": "#2FD38E", "red": "#F0524D", "teal": "#3FB7C9",
            "c1": "#18201E", "c2": "#242D2B", "c3": "#38433F", "c4": "#4A5551"}


def palette():
    here = os.path.dirname(os.path.abspath(__file__))
    for p in (os.path.join(here, "..", "design-tokens.json"), os.path.join(here, "design-tokens.json")):
        if os.path.exists(p):
            t = json.load(open(p, encoding="utf-8"))
            pal = dict(FALLBACK)
            pal.update({k: v for k, v in t.get("цвет", {}).items() if not k.startswith("_")})
            pal.update({k: v for k, v in t.get("поверхность", {}).items() if not k.startswith("_")})
            return pal
    return dict(FALLBACK)


PAL = palette()
# группа исходного оттенка -> токен палитры (переопределяется --as)
DEFAULT_AS = {"red": "red", "warm": "green", "green": "green", "blue": "teal", "neutral": "keep"}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb2hex(c):
    return "#" + "".join(f"{max(0, min(255, round(v * 255))):02X}" for v in c[:3])


def load(path):
    raw = open(path, "rb").read()
    if raw[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(raw))
        n = next(n for n in z.namelist() if n.startswith("animations/") and n.endswith(".json"))
        return json.loads(z.read(n))
    return json.loads(raw)


# ---------- обход всех цветов: возвращает список «ячеек» (list, offset) с RGB 0..1

def cells(anim):
    out = []

    def color_prop(p):
        if not isinstance(p, dict):
            return
        k = p.get("k")
        if p.get("a") == 1 and isinstance(k, list):
            for kf in k:
                for key in ("s", "e"):
                    if isinstance(kf.get(key), list) and len(kf[key]) >= 3:
                        out.append((kf[key], 0))
        elif isinstance(k, list) and len(k) >= 3 and all(isinstance(v, (int, float)) for v in k[:3]):
            out.append((k, 0))

    def grad_prop(g):
        # g = {"p": n, "k": {"a":0,"k":[t,r,g,b, t,r,g,b, ..., t,a, ...]}}
        n = g.get("p", 0)
        k = g.get("k", {})
        seqs = []
        if k.get("a") == 1:
            for kf in k.get("k", []):
                for key in ("s", "e"):
                    if isinstance(kf.get(key), list):
                        seqs.append(kf[key])
        elif isinstance(k.get("k"), list):
            seqs.append(k["k"])
        for s in seqs:
            for i in range(n):
                if 4 * i + 3 < len(s):
                    out.append((s, 4 * i + 1))

    def visit(node):
        if isinstance(node, dict):
            ty = node.get("ty")
            if ty in ("fl", "st") and "c" in node:
                color_prop(node["c"])
            if ty in ("gf", "gs") and "g" in node:
                grad_prop(node["g"])
            if ty == 2 and isinstance(node.get("v"), dict):
                color_prop(node["v"])            # цвет в эффекте (Fill, Tint): параметр ty=2
            if ty == 1 and isinstance(node.get("sc"), str) and node["sc"].startswith("#"):
                out.append((node, "sc"))         # слой-заливка (solid): цвет строкой #rrggbb
            if ty == 5 and "t" in node:          # текстовый слой: цвет в документе
                for kf in node["t"].get("d", {}).get("k", []):
                    s = kf.get("s", {})
                    for key in ("fc", "sc"):
                        if isinstance(s.get(key), list):
                            out.append((s[key], 0))
            for v in node.values():
                visit(v)
        elif isinstance(node, list):
            for v in node:
                visit(v)

    visit(anim.get("layers", []))
    visit(anim.get("assets", []))
    return out


def get(c):
    arr, o = c
    if isinstance(o, str):
        return hex2rgb(arr[o])
    v = arr[o:o + 3]
    if max(v) > 1.0:                         # старые файлы хранят 0..255
        v = [x / 255 for x in v]
    return tuple(v)


def put(c, rgb):
    arr, o = c
    if isinstance(o, str):
        arr[o] = rgb2hex(rgb).lower()
        return
    scale = 255 if max(arr[o:o + 3]) > 1.0 else 1
    for i in range(3):
        arr[o + i] = round(rgb[i] * scale, 4)


def bucket(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    if s < 0.15 or l < 0.2 or l > 0.96:
        return "neutral"
    deg = h * 360
    if deg < 15 or deg >= 290:
        return "red"
    if deg < 70:
        return "warm"
    if deg < 172:
        return "green"
    return "blue"


def luma(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def recolor(anim, table):
    cs = cells(anim)
    groups = {}
    for c in cs:
        rgb = get(c)
        groups.setdefault(bucket(rgb), []).append((c, rgb))
    done = 0
    for g, items in groups.items():
        tgt = table.get(g, "keep")
        if tgt == "keep":
            continue
        th, tl, ts = colorsys.rgb_to_hls(*hex2rgb(PAL[tgt]))
        # светотень меряем яркостью (Rec.709), а не светлотой HLS: у жёлтого и
        # оранжевого светлота одна, а на глаз оранжевый — тень. Иначе монета
        # превращается в плоский круг.
        ys = sorted(luma(rgb) for _, rgb in items)
        mean = ys[len(ys) // 2]
        for c, rgb in items:
            nl = min(0.95, max(0.10, tl + (luma(rgb) - mean) * 0.9))
            put(c, colorsys.hls_to_rgb(th, nl, ts)); done += 1
    return done, len(cs)


def main():
    a = sys.argv[1:]
    anim = load(a[0])
    opt = lambda k, d="": a[a.index(k) + 1] if k in a else d
    if "--dump" in a:
        from collections import Counter
        cnt = Counter(rgb2hex(get(c)) for c in cells(anim))
        for h, n in cnt.most_common():
            print(h, n, bucket(hex2rgb(h)))
        return
    out = a[1]
    table = dict(DEFAULT_AS)
    for part in filter(None, opt("--as").split(",")):
        k, v = part.split("="); table[k.strip()] = v.strip()
    pairs = []
    for part in filter(None, opt("--map").split(",")):
        k, v = part.split("=")
        v = v.strip()
        pairs.append((hex2rgb(k.strip()), None if v == "keep" else hex2rgb(PAL.get(v, v))))
    fixed = []                       # точные замены — по исходным цветам, снимаем до auto
    for c in cells(anim):
        rgb = get(c)
        for src, dst in pairs:
            if max(abs(x - y) for x, y in zip(rgb, src)) <= 12 / 255:
                fixed.append((c, dst, rgb)); break
    done, total = recolor(anim, table)
    for c, dst, rgb in fixed:
        put(c, rgb if dst is None else dst)
    drop = [x.strip() for x in opt("--drop").split(",") if x.strip()]
    if drop:
        anim["layers"] = [L for L in anim["layers"] if L.get("nm") not in drop]
    show = [x.strip() for x in opt("--unhide").split(",") if x.strip()]
    for L in anim.get("layers", []):
        if L.get("nm") in show:
            L["hd"] = False
    subs = [p.split("=") for p in filter(None, opt("--text").split(","))]
    font = opt("--font")
    for L in anim.get("layers", []):
        if L.get("ty") == 5:
            for kf in L["t"]["d"]["k"]:
                for old, new in subs:
                    kf["s"]["t"] = kf["s"]["t"].replace(old, new)
                if font:
                    kf["s"]["f"] = font
    if font:
        anim.pop("chars", None)      # глифы исходного шрифта: без них берётся --font
    if font and anim.get("fonts"):
        for f in anim["fonts"]["list"]:
            f.update({"fName": font, "fFamily": font, "fStyle": "Regular", "fPath": "", "origin": 0})
    anim.setdefault("meta", {})["recolor"] = "lanskoy palette: design-tokens.json"
    json.dump(anim, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{out}: перекрашено {done} из {total} цветов, точных замен {len(fixed)}, убрано слоёв {len(drop)}")


if __name__ == "__main__":
    main()
