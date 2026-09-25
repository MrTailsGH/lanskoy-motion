#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCOUT — разведка приёмов для роликов канала Ланского.

Главное умение: Claude ДЕЙСТВИТЕЛЬНО СМОТРИТ чужие ролики, а не читает заголовки.

Как это возможно без API-ключей и без браузера: YouTube отдаёт раскадровку
(storyboard) — сетку кадров по всей длине ролика, примерно кадр в секунду.
Она доступна через yt-dlp с клиентом web_safari даже там, где сам видеопоток
закрыт бот-проверкой. Скрипт скачивает раскадровку, режет на кадры и собирает
контактный лист — одну картинку, на которой виден весь ролик целиком.
Claude открывает этот лист и разбирает: структуру, вёрстку, палитру, ритм
монтажа, момент смены сцен, где появляется число, чем закрывается.

Запуск:
    python3 scout.py watch <videoId> [<videoId> ...]   # собрать контактные листы
    python3 scout.py targets [N]                       # выбрать N целей по радару
    python3 scout.py tech                              # свежие техприёмы (Codrops, Vimeo)
    python3 scout.py scan [N]                          # targets + watch + tech разом

Требуется: yt-dlp (pip), Pillow. Для части клиентов нужен JS-движок:
    pip install --break-system-packages -U yt-dlp
    npm install -g deno

Контактные листы кладутся в ./sheets/ — их место на диске пользователя,
в репозиторий они не коммитятся (чужие кадры).
"""

import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SHEETS = os.path.join(HERE, "sheets")
RADAR_DIR = os.path.join(os.path.dirname(HERE), "radar")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8"}

# Размер плитки берётся из метаданных формата sb0, а не жёстко: у вертикали и
# горизонтали он разный. Значения ниже — только запасные.
TILE_W, TILE_H = 101, 180
# Бот-проверка YouTube срабатывает выборочно и по-разному на разных клиентах,
# поэтому идём по списку, пока какой-нибудь не отдаст раскадровку.
CLIENTS = ["web_safari", "mweb", "web", "ios", "tv_simply"]


# ------------------------------------------------------------------ сеть

def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "ignore")
        except Exception as e:
            last = e
    raise last


# ------------------------------------------------------- раскадровка

def _env():
    e = dict(os.environ)
    e["PATH"] = e.get("PATH", "") + ":/home/claude/.npm-global/bin"
    return e


def probe(video_id):
    """Метаданные + размер плитки раскадровки. Перебирает клиентов до успеха."""
    url = f"https://www.youtube.com/shorts/{video_id}"
    last = ""
    for c in CLIENTS:
        r = subprocess.run(["yt-dlp", "--no-warnings", "--skip-download", "--dump-json",
                            "--extractor-args", f"youtube:player_client={c}", url],
                           capture_output=True, text=True, timeout=180, env=_env())
        if r.returncode == 0 and r.stdout.strip():
            j = json.loads(r.stdout.splitlines()[0])
            sb = next((f for f in j.get("formats", []) if f.get("format_id") == "sb0"), None)
            return {"client": c,
                    "title": j.get("title", ""),
                    "channel": j.get("uploader", "") or j.get("channel", ""),
                    "views": j.get("view_count"),
                    "duration": j.get("duration"),
                    "published": j.get("upload_date", ""),
                    "tile": (sb.get("width"), sb.get("height")) if sb else None}
        last = (r.stderr or "").strip()[:160]
        time.sleep(1.5)
    raise RuntimeError(last or "ни один клиент не отдал метаданные")


def probe_patient(video_id, rounds=3, pause=70):
    """То же, но с паузами. YouTube душит по IP, и отказ чаще всего временный:
    подряд идущие запросы он начинает отбивать бот-проверкой, а через минуту-две
    снова пускает. Поэтому смотреть ролики надо пачками по 2–4, а не десятками."""
    last = ""
    for i in range(rounds):
        try:
            return probe(video_id)
        except Exception as e:
            last = str(e)
            if i < rounds - 1:
                print(f"    {video_id}: отказ, жду {pause} с", file=sys.stderr)
                time.sleep(pause)
    raise RuntimeError(last)


def storyboard_frames(video_id, workdir, client, tile):
    """Скачивает раскадровку и возвращает список кадров (PIL.Image) по порядку."""
    from PIL import Image
    tw, th = tile or (TILE_W, TILE_H)
    out = os.path.join(workdir, "board.mhtml")
    cmd = ["yt-dlp", "--no-warnings", "--quiet",
           "--extractor-args", f"youtube:player_client={client}",
           "-f", "sb0", "-o", out, f"https://www.youtube.com/shorts/{video_id}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=240, env=_env())
    if not os.path.exists(out):
        raise RuntimeError((r.stderr or r.stdout or "раскадровка не скачалась").strip()[:200])

    raw = open(out, "rb").read()
    sheets, start = [], 0
    while True:                                  # вырезаем JPEG по сигнатурам
        a = raw.find(b"\xff\xd8\xff", start)
        if a < 0:
            break
        b = raw.find(b"\xff\xd9", a)
        if b < 0:
            break
        p = os.path.join(workdir, f"s{len(sheets)}.jpg")
        open(p, "wb").write(raw[a:b + 2])
        sheets.append(p)
        start = b + 2

    frames = []
    for p in sheets:
        im = Image.open(p)
        cols, rows = im.size[0] // tw, im.size[1] // th
        for r_ in range(rows):
            for c in range(cols):
                fr = im.crop((c * tw, r_ * th, (c + 1) * tw, (r + 1) * th)) if False else \
                     im.crop((c * tw, r_ * th, (c + 1) * tw, (r_ + 1) * th))
                if fr.convert("L").getextrema()[1] > 8:   # пустые плитки в хвосте
                    frames.append(fr)
    return frames


def contact_sheet(frames, out_path, title="", scale=1.7, cols=10):
    """Собирает кадры в один контактный лист с номерами."""
    from PIL import Image, ImageDraw
    if not frames:
        raise RuntimeError("кадров нет")
    w, h = int(frames[0].size[0] * scale), int(frames[0].size[1] * scale)
    rows = (len(frames) + cols - 1) // cols
    head = 26 if title else 0
    sheet = Image.new("RGB", (cols * w, head + rows * (h + 16)), (22, 22, 22))
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((6, 7), title[:150], fill=(235, 235, 235))
    for i, fr in enumerate(frames):
        x = (i % cols) * w
        y = head + (i // cols) * (h + 16)
        sheet.paste(fr.resize((w, h), Image.LANCZOS), (x, y))
        d.text((x + 4, y + h + 2), str(i), fill=(190, 190, 190))
    sheet.save(out_path)
    return sheet.size


def watch(video_ids):
    os.makedirs(SHEETS, exist_ok=True)
    done = []
    for vid in video_ids:
        wd = tempfile.mkdtemp(prefix="sb_")
        try:
            m = probe_patient(vid)
            frames = storyboard_frames(vid, wd, m["client"], m.get("tile"))
            secs = int(m.get("duration") or 0)
            per = (secs / len(frames)) if (secs and frames) else 0
            title = f"{vid}  {m.get('channel','')}  |  {m.get('title','')}"
            if secs:
                title += f"  |  {secs} c, кадр ≈ {per:.1f} c"
            out = os.path.join(SHEETS, f"{vid}.png")
            size = contact_sheet(frames, out, title)
            done.append({"id": vid, "frames": len(frames), "sheet": out,
                         "seconds_per_frame": round(per, 2), **m})
            time.sleep(2)
            print(f"  {vid}: {len(frames)} кадров, {size[0]}x{size[1]} -> {out}", file=sys.stderr)
        except Exception as e:
            print(f"  {vid}: ОШИБКА {e}", file=sys.stderr)
            done.append({"id": vid, "error": str(e)[:200]})
        finally:
            shutil.rmtree(wd, ignore_errors=True)
    return done


# ------------------------------------------------------------ выбор целей

def targets(n=6):
    """Берёт из отчёта радара самые сильные выбросы и свежие взлёты."""
    rep = os.path.join(RADAR_DIR, "RADAR.md")
    if not os.path.exists(rep):
        raise RuntimeError(f"нет отчёта радара: {rep}. Сначала: cd ../radar && python3 radar.py --report RADAR.md")
    text = open(rep, encoding="utf-8").read()
    ids, seen = [], set()
    for m in re.finditer(r"\[([^\]]+)\]\(https://youtube\.com/shorts/([\w-]+)\)", text):
        vid = m.group(2)
        if vid not in seen:
            seen.add(vid)
            ids.append({"id": vid, "title": m.group(1)})
    return ids[:n]


# ------------------------------------------------------- техприёмы

def tech():
    """Свежие разборы приёмов там, где нас пускают без браузера."""
    out = []
    try:
        h = fetch("https://tympanus.net/codrops/")
        for m in re.finditer(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', h, re.S)  :
            t = re.sub(r"<[^>]+>", "", m.group(2)).strip()
            if t:
                out.append({"src": "Codrops", "title": t, "url": m.group(1)})
            if len(out) >= 12:
                break
    except Exception as e:
        out.append({"src": "Codrops", "error": str(e)[:120]})
    try:
        h = fetch("https://vimeo.com/channels/staffpicks")
        for m in re.finditer(r'"name":"([^"]{6,90})","url":"(https://vimeo\.com/\d+)"', h):
            out.append({"src": "Vimeo Staff Picks", "title": m.group(1), "url": m.group(2)})
            if len([x for x in out if x.get("src", "").startswith("Vimeo")]) >= 10:
                break
    except Exception as e:
        out.append({"src": "Vimeo", "error": str(e)[:120]})
    return out


# ------------------------------------------------------------------ main

def main():
    a = sys.argv[1:]
    cmd = a[0] if a else "scan"

    if cmd == "watch":
        a = [x for x in a if x != "--"]
        if len(a) < 2:
            print("нужен хотя бы один videoId", file=sys.stderr)
            return 1
        print(json.dumps(watch(a[1:]), ensure_ascii=False, indent=1))

    elif cmd == "targets":
        n = int(a[1]) if len(a) > 1 else 6
        print(json.dumps(targets(n), ensure_ascii=False, indent=1))

    elif cmd == "tech":
        print(json.dumps(tech(), ensure_ascii=False, indent=1))

    elif cmd == "scan":
        n = int(a[1]) if len(a) > 1 else 6
        tg = targets(n)
        print(f"целей: {len(tg)}", file=sys.stderr)
        res = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "watched": watch([t["id"] for t in tg]),
               "tech": tech()}
        print(json.dumps(res, ensure_ascii=False, indent=1))

    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
