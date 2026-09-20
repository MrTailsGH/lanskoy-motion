#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SHORTS RADAR — мониторинг YouTube Shorts в нише канала Ланского.

Что делает:
  1. По списку каналов забирает вкладку /shorts прямо из HTML YouTube
     (без API-ключа, без yt-dlp, без браузера) — id, заголовок, просмотры.
  2. По RSS-ленте канала забирает даты публикаций последних 15 роликов.
  3. Складывает снимок в history.json.
  4. Считает три метрики и печатает отчёт в markdown:
       СКОРОСТЬ  — просмотров в сутки с момента выхода (только для роликов с известной датой)
       ДЕЛЬТА    — сколько просмотров ролик набрал с прошлого запуска (что греется ПРЯМО СЕЙЧАС)
       ИНДЕКС    — просмотры / медиана канала (выброс независимо от размера канала)

Запуск:
    python3 radar.py                      # обычный прогон
    python3 radar.py --add @handle ...    # добавить каналы в слежку
    python3 radar.py --report report.md   # записать отчёт в файл

Файлы рядом со скриптом: channels.json (список слежки), history.json (снимки).
Ничего, кроме стандартной библиотеки, не требуется.
"""

import json, os, re, sys, time, urllib.request, urllib.parse
from datetime import datetime, timezone
# Windows-консоль отдаёт cp1251, и первая же стрелка «→» роняет скрипт
# с UnicodeEncodeError. Проверено на раннере 20.09.2026: разбор дошёл до
# конца, а упала печать результата. Переключаем поток на UTF-8 сразу.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
CHANNELS = os.path.join(HERE, "channels.json")
HISTORY = os.path.join(HERE, "history.json")

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}

# Стартовый список слежки. Первый — подтверждённый прямой конкурент.
DEFAULT_CHANNELS = [
    {"handle": "@kokorevinvest",      "note": "прямой конкурент, деньги/экономика, 203 тыс."},
    {"handle": "@capitalvolkova",     "note": "финансы, 160 тыс."},
    {"handle": "@taxesusa",           "note": "налоги США, 72 тыс. — берём формат, не тему"},
    {"handle": "@ekaterina_nalogi",   "note": "налоги РФ, 64 тыс."},
    {"handle": "@SvetlanaTolkacheva", "note": "финграмотность, 55 тыс."},
    {"handle": "@EvgeniySivkov",      "note": "налоги и бизнес, 34 тыс."},
    {"handle": "@kuznecova_prava",    "note": "юрист для бизнеса, 26 тыс."},
    {"handle": "@turov_and_part",     "note": "налоги и бизнес, 17,5 тыс."},
]


# ---------------------------------------------------------------- сеть

def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "ignore")
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


# ---------------------------------------------------------------- разбор

VIEW_RE = re.compile(r"([\d\s .,]+)\s*(тыс\.|млн|млрд|K|M|B)?\s*просмотр", re.I)
MULT = {None: 1, "тыс.": 1_000, "млн": 1_000_000, "млрд": 1_000_000_000,
        "K": 1_000, "M": 1_000_000, "B": 1_000_000_000}


def parse_views(s):
    """'84 тыс. просмотров' -> 84000 ; '1,2 млн просмотров' -> 1200000"""
    if not s:
        return None
    m = VIEW_RE.search(s.replace(" ", " "))
    if not m:
        return None
    num = m.group(1).replace(" ", "").replace(" ", "").replace(",", ".")
    num = num.rstrip(".")
    try:
        val = float(num)
    except ValueError:
        return None
    return int(round(val * MULT.get(m.group(2), 1)))


def initial_data(html):
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html, re.S)
    if not m:
        m = re.search(r'window\["ytInitialData"\]\s*=\s*(\{.*?\});', html, re.S)
    return json.loads(m.group(1)) if m else None


def collect_shorts(node, out):
    """Обходит ytInitialData и собирает карточки шортсов."""
    if isinstance(node, dict):
        vm = node.get("shortsLockupViewModel")
        if vm:
            vid = ""
            ent = vm.get("entityId", "")
            if ent.startswith("shorts-shelf-item-"):
                vid = ent[len("shorts-shelf-item-"):]
            if not vid:
                vid = (vm.get("onTap", {}).get("innertubeCommand", {})
                         .get("reelWatchEndpoint", {}).get("videoId", ""))
            om = vm.get("overlayMetadata", {}) or {}
            title = (om.get("primaryText") or {}).get("content", "")
            views = parse_views((om.get("secondaryText") or {}).get("content", ""))
            if vid and title:
                out[vid] = {"id": vid, "title": title, "views": views}
        for v in node.values():
            collect_shorts(v, out)
    elif isinstance(node, list):
        for v in node:
            collect_shorts(v, out)


def channel_id_of(html):
    m = re.search(r'"channelId":"(UC[\w-]{22})"', html) or \
        re.search(r"channel_id=(UC[\w-]{22})", html)
    return m.group(1) if m else None


def rss_dates(channel_id):
    """videoId -> дата публикации ISO. RSS отдаёт последние 15 загрузок, ключ не нужен."""
    try:
        xml = fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}")
    except Exception:
        return {}
    dates = {}
    for entry in xml.split("<entry>")[1:]:
        vid = re.search(r"<yt:videoId>([\w-]+)</yt:videoId>", entry)
        pub = re.search(r"<published>([^<]+)</published>", entry)
        if vid and pub:
            dates[vid.group(1)] = pub.group(1)
    return dates


# ---------------------------------------------------------------- сбор

def scan_channel(ch):
    handle = ch["handle"]
    html = fetch(f"https://www.youtube.com/{handle}/shorts")
    data = initial_data(html)
    if not data:
        raise RuntimeError("ytInitialData не найдена — YouTube поменял разметку")
    shorts = {}
    collect_shorts(data, shorts)
    cid = channel_id_of(html)
    name = ""
    m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    if m:
        name = m.group(1)
    dates = rss_dates(cid) if cid else {}
    for vid, rec in shorts.items():
        rec["published"] = dates.get(vid)
    return {"handle": handle, "name": name, "channel_id": cid,
            "note": ch.get("note", ""), "shorts": shorts}


def load(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- метрики

def days_since(iso):
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    return max(0.25, (datetime.now(timezone.utc) - d).total_seconds() / 86400)


def median(xs):
    xs = sorted(x for x in xs if x)
    if not xs:
        return 0
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def fmt(n):
    if n is None:
        return "—"
    n = int(n)
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f} млн".replace(".", ",")
    if n >= 1_000:
        return f"{n/1_000:.0f} тыс."
    return str(n)


# ---------------------------------------------------------------- отчёт

def build_report(scan, prev_snapshot):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    rows = []
    for ch in scan:
        med = median([s["views"] for s in ch["shorts"].values()])
        for vid, s in ch["shorts"].items():
            age = days_since(s.get("published"))
            prev = (prev_snapshot.get(ch["handle"], {}) or {}).get(vid)
            delta = (s["views"] - prev) if (prev is not None and s["views"] is not None) else None
            rows.append({
                "channel": ch["name"] or ch["handle"],
                "handle": ch["handle"],
                "id": vid,
                "title": s["title"],
                "views": s["views"],
                "age": age,
                "speed": (s["views"] / age) if (age and s["views"]) else None,
                "delta": delta,
                "index": (s["views"] / med) if (med and s["views"]) else None,
                "median": med,
            })

    L = []
    L.append(f"# SHORTS RADAR — {now}\n")
    L.append(f"Каналов в слежке: {len(scan)}. Роликов снято: {len(rows)}.\n")

    def table(title, key, note, top=12, extra=None):
        sel = [r for r in rows if r.get(key)]
        sel.sort(key=lambda r: r[key], reverse=True)
        if not sel:
            L.append(f"## {title}\n\n{note}\n\n_Данных пока нет._\n")
            return
        L.append(f"## {title}\n\n{note}\n")
        L.append("| | Ролик | Канал | " + (extra or "Значение") + " | Всего |")
        L.append("|---|---|---|---|---|")
        for i, r in enumerate(sel[:top], 1):
            if key == "speed":
                val = f"{fmt(r['speed'])}/сут · {r['age']:.0f} дн."
            elif key == "delta":
                val = "+" + fmt(r["delta"])
            else:
                val = f"×{r['index']:.1f}"
            t = r["title"].split("#")[0].strip()[:70]
            L.append(f"| {i} | [{t}](https://youtube.com/shorts/{r['id']}) | {r['channel'][:22]} | {val} | {fmt(r['views'])} |")
        L.append("")

    table("1. Что греется прямо сейчас", "delta",
          "Прирост просмотров с прошлого прогона. Самая честная картина тренда: "
          "накопленные просмотры говорят о прошлом, прирост — о настоящем.",
          extra="Прирост")

    table("2. Скорость с момента выхода", "speed",
          "Просмотров в сутки. Даты берутся из RSS, поэтому считаются только последние "
          "15 загрузок каждого канала — то есть свежее.",
          extra="Скорость")

    table("3. Выбросы относительно своего канала", "index",
          "Просмотры, делённые на медиану канала. Ролик с ×5 у маленького канала "
          "интереснее, чем миллион у большого: значит, сработала именно тема, а не аудитория.",
          extra="Индекс")

    L.append("## 4. Свежие ролики (до 7 дней)\n")
    fresh = [r for r in rows if r["age"] and r["age"] <= 7]
    fresh.sort(key=lambda r: r["age"])
    if fresh:
        L.append("| Ролик | Канал | Возраст | Просмотры | Скорость |")
        L.append("|---|---|---|---|---|")
        for r in fresh[:20]:
            t = r["title"].split("#")[0].strip()[:70]
            sp = f"{fmt(r['speed'])}/сут" if r["speed"] else "—"
            L.append(f"| [{t}](https://youtube.com/shorts/{r['id']}) | {r['channel'][:22]} | {r['age']:.1f} дн. | {fmt(r['views'])} | {sp} |")
    else:
        L.append("_За неделю ничего нового не вышло._")
    L.append("")

    L.append("## 5. Каналы\n")
    L.append("| Канал | Роликов снято | Медиана | Максимум |")
    L.append("|---|---|---|---|")
    for ch in scan:
        vs = [s["views"] for s in ch["shorts"].values() if s["views"]]
        L.append(f"| {(ch['name'] or ch['handle'])[:30]} | {len(ch['shorts'])} | "
                 f"{fmt(median(vs))} | {fmt(max(vs) if vs else 0)} |")
    L.append("")
    L.append("---\n\n_Данные сняты со страниц YouTube. Метрика «прирост» появляется со второго прогона._")
    return "\n".join(L)


# ---------------------------------------------------------------- main

def main():
    args = sys.argv[1:]
    channels = load(CHANNELS, DEFAULT_CHANNELS)

    if "--add" in args:
        i = args.index("--add")
        added = 0
        for h in args[i + 1:]:
            if h.startswith("-"):
                break
            h = h if h.startswith("@") else "@" + h
            if not any(c["handle"].lower() == h.lower() for c in channels):
                channels.append({"handle": h, "note": "добавлен вручную"})
                added += 1
        save(CHANNELS, channels)
        print(f"Добавлено каналов: {added}. Всего в слежке: {len(channels)}.")
        return

    save(CHANNELS, channels)
    hist = load(HISTORY, {"snapshots": []})
    prev = hist["snapshots"][-1]["data"] if hist["snapshots"] else {}

    scan, failed = [], []
    for ch in channels:
        try:
            r = scan_channel(ch)
            scan.append(r)
            print(f"  {ch['handle']:24} шортсов: {len(r['shorts']):3}", file=sys.stderr)
        except Exception as e:
            failed.append((ch["handle"], str(e)[:80]))
            print(f"  {ch['handle']:24} ОШИБКА: {str(e)[:60]}", file=sys.stderr)
        time.sleep(1.2)

    # Провалившийся прогон не должен портить историю. Снимок без роликов,
    # записанный поверх нормального, обнуляет прирост — главную метрику
    # радара, — и следующий удачный прогон покажет рост «с нуля».
    # Так уже случилось 18.09.2026: контейнер без доступа к youtube.com
    # получил 403 на все 24 канала и записал пустой снимок вместе с пустым
    # отчётом. Поэтому теперь пустой результат — это ошибка, а не результат.
    total = sum(len(h["shorts"]) for h in scan)
    if total == 0:
        print("Ни один канал не открылся — история и отчёт не тронуты.", file=sys.stderr)
        print("Если это 403 на CONNECT, у контейнера закрыт доступ к youtube.com.",
              file=sys.stderr)
        sys.exit(1)

    # Частичный обвал тоже опасен: пропавшие каналы выпадут из прироста.
    # Меньше половины прошлого объёма — повод остановиться и посмотреть.
    prev_total = sum(len(v) for v in prev.values())
    if prev_total and total < prev_total // 2:
        print(f"Снято {total} роликов против {prev_total} в прошлом прогоне — "
              f"похоже на сбой сети. История и отчёт не тронуты.", file=sys.stderr)
        sys.exit(1)

    snapshot = {h["handle"]: {v: s["views"] for v, s in h["shorts"].items()} for h in scan}
    hist["snapshots"].append({
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data": snapshot,
    })
    hist["snapshots"] = hist["snapshots"][-60:]
    save(HISTORY, hist)

    report = build_report(scan, prev)
    if failed:
        report += "\n\n**Не открылись:** " + ", ".join(f"{h} ({e})" for h, e in failed) + "\n"

    if "--report" in args:
        path = args[args.index("--report") + 1]
        with open(path, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Отчёт записан: {path}", file=sys.stderr)
    else:
        print(report)


if __name__ == "__main__":
    main()
