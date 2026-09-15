import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1080,"height":1920})
        await pg.goto("file:///home/claude/scene/i01.html"); await pg.wait_for_timeout(800)
        res=await pg.evaluate("""() => {
          const out=[];
          const lh=parseFloat(getComputedStyle(cap).lineHeight);
          for(const c of CUES){
            if(!c[1]) continue;
            seek(c[0]+0.5);
            const r=cap.getBoundingClientRect();
            const h=cap.scrollHeight;
            out.push({t:c[0], lines:Math.round(h/lh), bottom:Math.round(r.top+h), text:cap.textContent.slice(0,34)});
          }
          // нижняя граница титра против верхних краёв блоков
          seek(16.0); const cardTop=card.getBoundingClientRect().top;
          return {cues:out, cardTop:Math.round(cardTop)};
        }""")
        print("верх карточки:", res["cardTop"])
        bad=0
        for c in res["cues"]:
            over = c["lines"]>2 or c["bottom"]>res["cardTop"]
            if over: bad+=1
            print(("!! " if over else "OK "), f'{c["t"]:>5}  строк {c["lines"]}  низ {c["bottom"]:>4}  {c["text"]}')
        print("проблемных титров:", bad)
        await b.close()
asyncio.run(main())
