#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
overlap.py — проверка, что два акта не оказываются на экране разом.

    python3 overlap.py i01.html

Пробегает всю сцену с шагом в кадр и смотрит, сколько крупных блоков видно
одновременно. Наложение обещания на разрыв в И-01 заметил глазом
пользователь; такие вещи должна ловить проверка, а не просмотр.
"""
import sys, asyncio
from playwright.async_api import async_playwright
import browser

SCENE = sys.argv[1] if len(sys.argv) > 1 else "i01.html"
LIMIT = 0.12          # ниже этого акт считается погасшим

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**browser.launch_args())
        pg = await b.new_page(viewport={"width":1080,"height":1920})
        await pg.goto(browser.scene_url(SCENE))
        await pg.wait_for_timeout(700)
        bad = await pg.evaluate("""(LIMIT) => {
          /* Акты объявлены в сцене через const, а такие переменные в
             window не попадают: window['hook'] всегда undefined. Проверка
             из-за этого годами видела ноль актов и всегда отвечала «наложений
             нет» — поймано 23.09.2026. Теперь сцена может сама перечислить
             акты в window.ACTS; если не перечислила, имена разрешаются через
             Function — она выполняется в глобальной области и видит const. */
          const names = ['in0','in1','hook','card','cyc','tot','bars','scale',
                         'msp','form','grow','mrg','cls','pills','cta',
                         'split','white','raise'];
          const достать = n => { try { return new Function(
              'return typeof '+n+'!=="undefined" ? '+n+' : null')(); }
            catch(e){ return null; } };
          const реестр = window.ACTS || {};
          const acts = Object.keys(реестр).length ? Object.keys(реестр)
                     : names.filter(n => достать(n));
          const взять = n => реестр[n] || достать(n);
          if(!acts.length) return [{t:-1, акты:['НЕ НАЙДЕНО НИ ОДНОГО АКТА']}];
          const out=[];
          const N=Math.round(META.DUR*META.FPS);
          for(let f=0; f<N; f++){
            const t=f/META.FPS;
            seek(t);
            const lit=acts.filter(n=>{
              const e=взять(n);
              if(e.style.display==='none') return false;
              return parseFloat(e.style.opacity||1) > LIMIT;
            });
            if(lit.length>1) out.push({t:+t.toFixed(2), акты:lit});
          }
          return out;
        }""", LIMIT)
        if not bad:
            print(f"{SCENE}: наложений нет")
        else:
            # схлопываем подряд идущие кадры в отрезки
            runs, cur = [], None
            for r in bad:
                key = ' + '.join(r['акты'])
                if cur and cur['акты']==key and r['t']-cur['до'] < 0.08:
                    cur['до']=r['t']
                else:
                    if cur: runs.append(cur)
                    cur={'акты':key,'от':r['t'],'до':r['t']}
            runs.append(cur)
            print(f"{SCENE}: наложений — {len(runs)}")
            for r in runs:
                print(f"  {r['от']:>6.2f} … {r['до']:>6.2f}  ({r['до']-r['от']:.2f} с)  {r['акты']}")
        await b.close()

asyncio.run(main())
