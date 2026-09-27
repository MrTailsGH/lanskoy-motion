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
          for(const c of CUES){
            if(!c[1]) continue;
            seek(c[0]+0.5);
            /* Мерить содержимое, а не коробку: у титра фиксированная высота
               200 px, и scrollHeight всегда давал 200, а межстрочие бралось
               один раз от кегля первого титра. Поэтому число строк зависело
               от того, каким кеглем встал первый титр (27.09.2026: И-02 —
               18 ложных тревог, И-01 — ноль по счастливой случайности). */
            const keep=cap.style.height;
            cap.style.height='auto';
            const lh=parseFloat(getComputedStyle(cap).lineHeight);
            const r=cap.getBoundingClientRect();
            const h=cap.offsetHeight;
            cap.style.height=keep;
            out.push({t:c[0], lines:Math.round(h/lh), bottom:Math.round(r.top+h),
                      size:parseFloat(getComputedStyle(cap).fontSize),
                      text:cap.textContent.slice(0,34)});
          }
          /* Верх основного блока под титром. У сцен он называется по-разному:
             карточка расчёта, лента цикла, шкала. Берём тот, что есть,
             иначе — границу сетки из регламента, раздел 5. */
          const main = (typeof card!=='undefined' && card)
                    || (typeof cyc!=='undefined' && cyc)
                    || (typeof scale!=='undefined' && scale) || null;
          let top = 516;
          if(main){
            seek(typeof ROWON!=='undefined' ? ROWON[ROWON.length-1] : 10);
            const r = main.getBoundingClientRect();
            if(r.height>0) top = r.top;
          }
          /* строка расчёта в подвале: одна строка, иначе хвост ложится на
             подпись «ЛАНСКОЙ» (И-05, 27.09.2026 — поймал пользователь) */
          let foot=null;
          if(typeof fCalc!=='undefined'){
            const lh=parseFloat(getComputedStyle(fCalc).fontSize)*1.3;
            foot={lines:Math.round(fCalc.getBoundingClientRect().height/lh), text:fCalc.textContent.slice(0,40)};
          }
          return {cues:out, cardTop:Math.round(top), foot};
        }""")
        print("верх карточки:", res["cardTop"])
        bad = 0
        for c in res["cues"]:
            over = c["lines"] > 2 or c["bottom"] > res["cardTop"]
            if over: bad += 1
            print(("!! " if over else "OK "),
                  f'{c["t"]:>6.2f}  строк {c["lines"]}  кегль {c["size"]:>3.0f}  низ {c["bottom"]:>4}  {c["text"]}')
        f = res.get("foot")
        if f:
            ok = f["lines"] <= 1
            if not ok: bad += 1
            print(("OK " if ok else "!! ") + f'подвал  строк {f["lines"]}  {f["text"]}')
        print("проблемных титров:", bad)
        await b.close()

asyncio.run(main())
