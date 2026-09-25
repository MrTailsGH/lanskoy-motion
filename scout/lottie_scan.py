#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Разбор Lottie-анимации: точные тайминги и кривые разгона + контактный лист.

    python3 lottie_scan.py <url .lottie|.json> <out-префикс> [название]

Выдаёт <out>.json (паспорт, кривые, длительности, каскады) и <out>.png (кадры).
"""
import io, json, math, os, sys, zipfile, urllib.request, collections

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36"}
PROP = {"p": "позиция", "s": "масштаб", "r": "поворот", "o": "прозрачность", "a": "якорь",
        "e": "конец штриха", "st": "начало штриха", "t": "текст", "ks": "форма"}


def load(url):
    raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
    if raw[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(raw))
        name = next(n for n in z.namelist() if n.startswith("animations/") and n.endswith(".json"))
        return json.loads(z.read(name))
    return json.loads(raw)


def bez(o, i):
    def first(v):
        return v[0] if isinstance(v, list) else v
    try:
        return (round(first(o["x"]), 2), round(first(o["y"]), 2), round(first(i["x"]), 2), round(first(i["y"]), 2))
    except Exception:
        return None


def name_curve(c):
    if c is None:
        return "hold/нет"
    x1, y1, x2, y2 = c
    if abs(x1 - y1) < 0.05 and abs(x2 - y2) < 0.05:
        return "linear"
    if y2 >= 0.99 and x2 <= 0.35 and x1 >= 0.3:
        return "ease-in-out сильный"
    if y1 > 1.0 or y2 > 1.0:
        return "с перелётом (back)"
    if x1 <= 0.2 and y1 >= 0.5:
        return "ease-out резкий старт"
    if x2 >= 0.8 and y2 <= 0.5:
        return "ease-in медленный старт"
    return "ease-in-out"


def walk(anim):
    fr = anim.get("fr", 30)
    segs, starts = [], []

    def visit(node, path, layer_ip):
        if isinstance(node, dict):
            if node.get("a") == 1 and isinstance(node.get("k"), list):
                kf = node["k"]
                key = path.split(".")[-1]
                for a, b in zip(kf, kf[1:]):
                    if "t" in a and "t" in b:
                        dur = (b["t"] - a["t"]) / fr
                        c = bez(a.get("o", {}), a.get("i", {})) if "o" in a and "i" in a else None
                        if dur > 0:
                            segs.append({"prop": PROP.get(key, key), "start": round(a["t"] / fr, 3),
                                         "dur": round(dur, 3), "curve": c, "kind": name_curve(c),
                                         "hold": bool(a.get("h"))})
            for k, v in node.items():
                visit(v, path + "." + k, layer_ip)
        elif isinstance(node, list):
            for v in node:
                visit(v, path, layer_ip)

    for L in anim.get("layers", []):
        starts.append(round(L.get("ip", 0) / fr, 3))
        visit(L, "L", L.get("ip", 0))
    for asset in anim.get("assets", []):
        for L in asset.get("layers", []) or []:
            visit(L, "A", 0)
    return segs, sorted(starts)


def summarize(anim, segs, starts):
    fr = anim.get("fr", 30)
    dur = (anim.get("op", 0) - anim.get("ip", 0)) / fr
    moving = [s for s in segs if not s["hold"]]
    kinds = collections.Counter(s["kind"] for s in moving)
    curves = collections.Counter(s["curve"] for s in moving if s["curve"])
    props = collections.Counter(s["prop"] for s in moving)
    durs = sorted(s["dur"] for s in moving)
    uniq = sorted(set(starts))
    gaps = [round(b - a, 3) for a, b in zip(uniq, uniq[1:]) if b - a > 0]
    return {
        "fps": fr, "dur_s": round(dur, 2), "size": [anim.get("w"), anim.get("h")],
        "layers": len(anim.get("layers", [])), "moves": len(moving),
        "move_dur_median_s": durs[len(durs) // 2] if durs else None,
        "move_dur_p10_p90": [durs[len(durs) // 10], durs[len(durs) * 9 // 10]] if len(durs) >= 10 else durs,
        "kinds": kinds.most_common(), "top_curves": [(f"cubic-bezier{c}", n) for c, n in curves.most_common(5)],
        "props": props.most_common(), "layer_start_steps_s": gaps[:12],
    }


RENDER = """
<!doctype html><html><body style="margin:0;background:#fff">
<div id="c" style="width:{w}px;height:{h}px"></div>
<script src="file://{lib}"></script>
<script>
window.anim = lottie.loadAnimation({{container: document.getElementById('c'), renderer:'svg',
  loop:false, autoplay:false, animationData: {data}}});
window.ready = new Promise(r => window.anim.addEventListener('DOMLoaded', r));
</script></body></html>
"""


def render(anim, out_png, title, n=30, tile=160):
    from playwright.sync_api import sync_playwright
    from PIL import Image, ImageDraw
    w, h = anim.get("w", 512), anim.get("h", 512)
    scale = tile / max(w, h)
    lib = os.path.abspath("node_modules/lottie-web/build/player/lottie.min.js")
    page_html = RENDER.format(w=w, h=h, lib=lib, data=json.dumps(anim))
    tmp = os.path.abspath("_r.html")
    open(tmp, "w").write(page_html)
    ip, op, fr = anim.get("ip", 0), anim.get("op", 60), anim.get("fr", 30)
    frames = [ip + (op - 1 - ip) * k / (n - 1) for k in range(n)]
    shots = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--allow-file-access-from-files"])
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto("file://" + tmp)
        pg.evaluate("window.ready")
        for f in frames:
            pg.evaluate(f"window.anim.goToAndStop({f}, true)")
            shots.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
        b.close()
    tw, th = int(w * scale), int(h * scale)
    cols = 10
    rows = math.ceil(n / cols)
    img = Image.new("RGB", (cols * tw, 22 + rows * (th + 14)), (22, 22, 22))
    d = ImageDraw.Draw(img)
    d.text((6, 5), title[:170], fill=(235, 235, 235))
    for k, (s, f) in enumerate(zip(shots, frames)):
        x, y = (k % cols) * tw, 22 + (k // cols) * (th + 14)
        img.paste(s.resize((tw, th)), (x, y))
        d.text((x + 3, y + th + 1), f"{(f - ip) / fr:.2f}", fill=(190, 190, 190))
    img.save(out_png)
    os.remove(tmp)


if __name__ == "__main__":
    url, pref = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else pref
    anim = load(url)
    segs, starts = walk(anim)
    rep = summarize(anim, segs, starts)
    render(anim, pref + ".png", f"{title}  |  {rep['dur_s']} с, {rep['fps']} fps")
    json.dump({"summary": rep, "segments": segs[:400]}, open(pref + ".json", "w"), ensure_ascii=False, indent=1)
    print(title, json.dumps(rep, ensure_ascii=False))
