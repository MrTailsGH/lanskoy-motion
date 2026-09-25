#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scout.py — разведка приёмов ВНЕ YouTube.

YouTube сюда не входит: чужие шортсы снимает snimok.py (на домашней машине),
замеряет razbor.py, выводы лежат в PRIYOMY.md. Эта папка — про всё остальное.

Скрипт собирает свежее только там, куда контейнер Claude пускают без браузера:

    python3 scout.py            # список свежих публикаций в markdown
    python3 scout.py --json     # то же в json

Источники, проверено 25.09.2026:
    Codrops              — разборы веб-анимации и переходов с кодом  (HTML-страница; RSS отдаёт 410)
    Vimeo Staff Picks    — лучшие короткие фильмы недели, визуал     (RSS)

Всё остальное — TikTok, Instagram Reels, Dribbble, Behance, LottieFiles —
из контейнера закрыто (403, антибот-заглушка или вход обязателен) и
смотрится только через браузер Brave пользователя. Порядок — в README.md.

Зависимостей нет, только стандартная библиотека.
"""

import json, re, sys, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "ignore")


def codrops(limit=12):
    h = fetch("https://tympanus.net/codrops/")
    out = []
    for m in re.finditer(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', h, re.S):
        title = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if title:
            out.append({"src": "Codrops", "title": title, "url": m.group(1), "date": ""})
        if len(out) >= limit:
            break
    return out


def vimeo_staff_picks(limit=10):
    x = fetch("https://vimeo.com/channels/staffpicks/videos/rss")
    out = []
    for it in x.split("<item>")[1:limit + 1]:
        t = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", it, re.S)
        l = re.search(r"<link>(.*?)</link>", it)
        d = re.search(r"<pubDate>(.*?)</pubDate>", it)
        out.append({"src": "Vimeo Staff Picks",
                    "title": t.group(1).strip() if t else "",
                    "url": l.group(1).strip() if l else "",
                    "date": d.group(1)[5:16] if d else ""})
    return out


def main():
    items, errors = [], []
    for name, fn in (("Codrops", codrops), ("Vimeo Staff Picks", vimeo_staff_picks)):
        try:
            items += fn()
        except Exception as e:
            errors.append(f"{name}: {e}")

    if "--json" in sys.argv:
        print(json.dumps({"items": items, "errors": errors}, ensure_ascii=False, indent=1))
        return 0

    src = None
    for it in items:
        if it["src"] != src:
            src = it["src"]
            print(f"\n## {src}\n")
        date = f"{it['date']} · " if it["date"] else ""
        print(f"- {date}[{it['title']}]({it['url']})")
    for e in errors:
        print(f"\n**Не открылось:** {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
