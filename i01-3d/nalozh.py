"""nalozh.py — замер наложений в И-01 3D, по каждому кадру.

    python3 i01-3d/nalozh.py

Сцена в режиме ?boxes=1 не рисует 3D, а отдаёт рамки: каждого текста и
плашки плоского слоя, строк ленты чека (в её собственных координатах) и
проекции 3D-предметов. Скрипт ищет пересечения больше 3 px. Пустой отчёт —
наложений нет. Текст внутри своей плашки, обводка и заливка одной плашки
и монетки одной стайки наложением не считаются.
"""
import asyncio, sys, json
sys.path.insert(0,'/home/user/lanskoy-motion')
from playwright.async_api import async_playwright
import browser
SCENE='/home/user/lanskoy-motion/i01-3d/i01-3d.html'
PAD=3
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(**browser.launch_args());pg=await b.new_page(viewport={"width":1080,"height":1920})
        errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(browser.scene_url(SCENE)+'?boxes=1');await pg.wait_for_function("window.READY===true",timeout=120000)
        info=await pg.evaluate("({DUR:window.META.DUR,BLUR:window.BLUR})")
        # окна, где наложение задумано: наплыв актов и монета через кадр
        hits={}
        n=int(info['DUR']*30)
        for i in range(n+1):
            t=i/30
            bx=await pg.evaluate("t=>window.boxesAt(t)",t)
            for a in range(len(bx)):
                for c in range(a+1,len(bx)):
                    A,B=bx[a],bx[c]
                    if A['k']=='3D' and B['k']=='3D' and A['n']==B['n'] and A['n'] in ('монетка','купюра'): continue  # своя стайка
                    if all(abs(A[q]-B[q])<4 for q in ('x0','y0','x1','y1')): continue  # та же плашка дважды: обводка и заливка
                    if A['k']=='плашка' and B['k']=='текст' or B['k']=='плашка' and A['k']=='текст':
                        # текст внутри своей плашки — не наложение
                        P,Tt=(A,B) if A['k']=='плашка' else (B,A)
                        if Tt['x0']>=P['x0']-2 and Tt['x1']<=P['x1']+2 and Tt['y0']>=P['y0']-12 and Tt['y1']<=P['y1']+12: continue
                    ix=min(A['x1'],B['x1'])-max(A['x0'],B['x0'])-2*PAD
                    iy=min(A['y1'],B['y1'])-max(A['y0'],B['y0'])-2*PAD
                    if ix>0 and iy>0:
                        key=(A['k']+':'+A['n'][:28],B['k']+':'+B['n'][:28])
                        hits.setdefault(key,[]).append((t,round(ix),round(iy)))
        for k,v in sorted(hits.items(),key=lambda kv:kv[1][0][0]):
            ts=[x[0] for x in v]
            print(f"{ts[0]:6.1f}–{ts[-1]:5.1f} с  ×{len(v):3d}  {k[0]}  ⟷  {k[1]}   макс {max(x[1] for x in v)}×{max(x[2] for x in v)} px")
        print('ошибки:',errs[:3])
        await b.close()
asyncio.run(main())
