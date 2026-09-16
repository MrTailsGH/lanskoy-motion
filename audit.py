#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit.py — проверка вёрстки: титры укладываются в две строки и не наезжают
на карточку расчёта.

    python3 audit.py [i01.html]
"""
import sys, asyncio
from playwright.async_api import async_playwright
import browser

SCENE = sys.argv[1] if len(sys.argv) > 1 else "i01.html"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={"width":1080,"height":1920})
        await pg.goto(browser.scene_url(SCENE))
        await pg.wait_for_timeout(800)
        res = await pg.evaluate("""() => {
          const out=[];
          const lh=parseFloat(getComputedStyle(cap).lineHeight);
          for(const c of CUES){
            if(!c[1]) continue;
            seek(c[0]+0.5);
            const r=cap.getBoundingClientRect();
            const h=cap.scrollHeight;
            out.push({t:c[0], lines:Math.round(h/lh), bottom:Math.round(r.top+h),
                      text:cap.textContent.slice(0,34)});
          }
          seek(ROWON[2]);
          const cardTop=card.getBoundingClientRect().top;
          return {cues:out, cardTop:Math.round(cardTop)};
        }""")
        print("верх карточки:", res["cardTop"])
        bad = 0
        for c in res["cues"]:
            over = c["lines"] > 2 or c["bottom"] > res["cardTop"]
            if over: bad += 1
            print(("!! " if over else "OK "),
                  f'{c["t"]:>6.2f}  строк {c["lines"]}  низ {c["bottom"]:>4}  {c["text"]}')
        print("проблемных титров:", bad)
        await b.close()

asyncio.run(main())
