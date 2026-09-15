import sys, asyncio
from playwright.async_api import async_playwright
TIMES=[float(x) for x in sys.argv[1].split(",")]
OUT=sys.argv[2]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-device-scale-factor=1","--font-render-hinting=none"])
        pg=await b.new_page(viewport={"width":1080,"height":1920},device_scale_factor=1)
        await pg.goto("file:///home/claude/scene/i01.html")
        await pg.wait_for_timeout(700)
        for t in TIMES:
            await pg.evaluate("t=>window.seek(t)", t)
            await pg.screenshot(path=f"{OUT}/t{t:06.2f}.png")
        print(await pg.evaluate("JSON.stringify(window.META)"))
        await b.close()
asyncio.run(main())
