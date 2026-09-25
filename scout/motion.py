#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Разбор чужой анимации по настоящему видео: контактный лист + замер движения.

    python3 motion.py <url|файл> <out-префикс> [--sheet-fps 4] [--title ...]

Даёт:
  <out>.png   — контактный лист, кадры с отметкой времени
  <out>.json  — паспорт (длина, fps, размер) и события движения:
                начало, конец, длительность, пик — по разнице соседних кадров
Замер движения грубее, чем razbor.py, но показывает главное: сколько длится
одно событие анимации и сколько покоя между событиями.
"""
import json, os, subprocess, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36",
      "Referer": "https://dribbble.com/"}


def fetch(src, dst):
    if os.path.exists(src):
        return src
    req = urllib.request.Request(src, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r, open(dst, "wb") as f:
        f.write(r.read())
    return dst


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                          "-show_entries", "stream=width,height,r_frame_rate:format=duration",
                          "-of", "json", path], capture_output=True, text=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"w": s["width"], "h": s["height"], "fps": round(int(num) / int(den), 2),
            "dur": round(float(j["format"]["duration"]), 2)}


CROP = None  # (x0,y0,x1,y1) доли кадра


def frames(path, fps, width):
    """Кадры как numpy-массивы в градациях серого (для замера) и RGB (для листа)."""
    info = probe(path)
    vf = f"fps={fps}"
    cw, ch = info["w"], info["h"]
    if CROP:
        x0, y0, x1, y1 = CROP
        cw, ch = int(info["w"] * (x1 - x0)) // 2 * 2, int(info["h"] * (y1 - y0)) // 2 * 2
        vf += f",crop={cw}:{ch}:{int(info['w'] * x0)}:{int(info['h'] * y0)}"
    vf += f",scale={width}:-2"
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", vf,
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    h = int(round(ch * width / cw / 2) * 2)
    n = len(raw) // (width * h * 3)
    arr = np.frombuffer(raw[: n * width * h * 3], np.uint8).reshape(n, h, width, 3)
    return arr


def events(path, info, fps=20, thr_k=3.0, min_gap=0.15):
    arr = frames(path, fps, 160).astype(np.float32).mean(axis=3)
    d = np.abs(np.diff(arr, axis=0)).mean(axis=(1, 2))
    if len(d) == 0:
        return [], 0.0
    base = np.median(d)
    thr = max(base * thr_k, 0.35)
    moving = d > thr
    evs, i = [], 0
    while i < len(moving):
        if moving[i]:
            j = i
            while j + 1 < len(moving) and (moving[j + 1] or
                   (j + 2 < len(moving) and moving[j + 2] and (1 / fps) < min_gap)):
                j += 1
            evs.append({"start": round(i / fps, 2), "end": round((j + 1) / fps, 2),
                        "dur": round((j + 1 - i) / fps, 2),
                        "peak": round(float(d[i:j + 1].max()), 2)})
            i = j + 1
        else:
            i += 1
    still = round(1 - moving.mean(), 3)
    return evs, still


def sheet(path, info, out, sheet_fps, title="", cols=10, width=150):
    arr = frames(path, sheet_fps, width)
    if len(arr) > 80:                       # не больше 80 кадров на лист
        idx = np.linspace(0, len(arr) - 1, 80).astype(int)
        times = idx / sheet_fps
        arr = arr[idx]
    else:
        times = np.arange(len(arr)) / sheet_fps
    h = arr.shape[1]
    rows = (len(arr) + cols - 1) // cols
    img = Image.new("RGB", (cols * width, 24 + rows * (h + 16)), (22, 22, 22))
    d = ImageDraw.Draw(img)
    d.text((6, 6), title[:170], fill=(235, 235, 235))
    for k, fr in enumerate(arr):
        x, y = (k % cols) * width, 24 + (k // cols) * (h + 16)
        img.paste(Image.fromarray(fr), (x, y))
        d.text((x + 4, y + h + 2), f"{times[k]:.2f}", fill=(190, 190, 190))
    img.save(out)
    return img.size


if __name__ == "__main__":
    src, pref = sys.argv[1], sys.argv[2]
    a = sys.argv[3:]
    sf = float(a[a.index("--sheet-fps") + 1]) if "--sheet-fps" in a else 4
    if "--crop" in a:
        CROP = tuple(float(x) for x in a[a.index("--crop") + 1].split(","))
    tw = int(a[a.index("--tile") + 1]) if "--tile" in a else 150
    title = a[a.index("--title") + 1] if "--title" in a else os.path.basename(pref)
    tmp = tempfile.mkdtemp()
    path = fetch(src, os.path.join(tmp, "v.mp4"))
    info = probe(path)
    evs, still = events(path, info)
    size = sheet(path, info, pref + ".png", sf, width=tw,
                 title=f"{title}  |  {info['dur']} с, {info['fps']} fps  |  лист {sf} кадр/с")
    durs = [e["dur"] for e in evs]
    rep = {"info": info, "still_share": still, "events": evs,
           "event_count": len(evs),
           "event_median_s": round(float(np.median(durs)), 2) if durs else None,
           "sheet": pref + ".png", "sheet_size": size}
    json.dump(rep, open(pref + ".json", "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in rep.items() if k != "events"}, ensure_ascii=False))
    print("события:", " ".join(f"{e['start']}–{e['end']}({e['dur']})" for e in evs[:40]))
