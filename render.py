import asyncio, time, os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-device-scale-factor=1","--font-render-hinting=none",
                                        "--disable-lcd-text","--hide-scrollbars"])
        pg=await b.new_page(viewport={"width":1080,"height":1920},device_scale_factor=1)
        await pg.goto("file:///home/claude/scene/i01.html")
        await pg.wait_for_timeout(900)
        meta=await pg.evaluate("window.META")
        N=int(meta["FRAMES"]); FPS=meta["FPS"]
        t0=time.time()
        for i in range(N):
            fp=f"frames/f{i:05d}.png"
            if os.path.exists(fp) and os.path.getsize(fp)>0: continue
            await pg.evaluate("t=>window.seek(t)", i/FPS)
            await pg.screenshot(path=fp)
            if i and i%200==0:
                el=time.time()-t0
                print(f"{i}/{N}  {el:.0f}s  осталось ~{el/i*(N-i):.0f}s", flush=True)
        print(f"готово {N} кадров за {time.time()-t0:.0f}s")
        await b.close()
asyncio.run(main())
