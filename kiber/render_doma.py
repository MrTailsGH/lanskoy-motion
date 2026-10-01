#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""render_doma.py — рендер теста №5 «Неон-рубль» на домашнем компьютере с видеокартой.

    python kiber/render_doma.py                    # полный ролик, 120 с
    python kiber/render_doma.py --cut teaser       # тизер, 10 с
    python kiber/render_doma.py --cut teaser2      # второй тизер, 10 с, плавный
    python kiber/render_doma.py --workers 2        # два окна браузера параллельно
    python kiber/render_doma.py --check            # только показать, какая видеокарта взялась

Сцена — kiber/kiber.html (three.js, WebGL2). В контейнере Claude она
считается на программной видеокарте SwiftShader: 2–3 с на кадр. Дома с
настоящей видеокартой — в десятки раз быстрее, но только если Chrome
действительно взял GPU: скрипт печатает строку рендера, и если там
«SwiftShader» — видеокарта не подхватилась (см. RENDER.md).

Кадры пишутся JPEG 95 в kiber/kadry/<cut>/, уже готовые пропускаются —
рендер можно прервать и продолжить. Потом, если есть ffmpeg и звук,
собирается MP4 (x264, CRF 16, AAC 192k).

Нужно: Python 3.10+, pip install playwright numpy,
playwright install chromium (или --channel chrome для обычного Chrome).
"""
import argparse, asyncio, os, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GPU_ARGS = ["--force-device-scale-factor=1", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars",
            "--ignore-gpu-blocklist", "--enable-gpu", "--enable-gpu-rasterization", "--enable-zero-copy"]
if sys.platform.startswith("win"):
    GPU_ARGS += ["--use-angle=d3d11"]
elif sys.platform == "darwin":
    GPU_ARGS += ["--use-angle=metal"]
else:
    GPU_ARGS += ["--use-angle=vulkan", "--enable-features=Vulkan"]


async def worker(scene_url, out, frames, channel, blur, idx, total_left):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        kw = {"args": GPU_ARGS, "headless": True}
        if channel:
            kw["channel"] = channel
        br = await p.chromium.launch(**kw)
        pg = await br.new_page(viewport={"width": 1080, "height": 1920})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(scene_url)
        await pg.wait_for_function("window.READY===true", timeout=600000)
        if errs:
            print("ошибки сцены:", *errs[:3], sep="\n  ")
        BL = await pg.evaluate("window.BLUR||[]") if blur else []
        for i in frames:
            fp = out / f"f{i:05d}.jpg"
            if fp.exists() and fp.stat().st_size > 0:
                continue
            t = i / 30
            # размытие движения: подкадры усредняет сама сцена (window.seekMB)
            if any(s <= t < e for s, e in BL):
                await pg.evaluate("t=>window.seekMB(t,4)", t)
            else:
                await pg.evaluate("t=>window.seek(t)", t)
            await pg.screenshot(path=str(fp), type="jpeg", quality=95)
            total_left[0] -= 1
            if total_left[0] % 30 == 0:
                print(f"  осталось кадров: {total_left[0]}", flush=True)
        await br.close()


async def check(scene_url, channel):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        kw = {"args": GPU_ARGS, "headless": True}
        if channel:
            kw["channel"] = channel
        br = await p.chromium.launch(**kw)
        pg = await br.new_page()
        r = await pg.evaluate("""()=>{const c=document.createElement('canvas').getContext('webgl2');if(!c)return 'нет WebGL2';
          const d=c.getExtension('WEBGL_debug_renderer_info');return c.getParameter(d?d.UNMASKED_RENDERER_WEBGL:c.RENDERER);}""")
        await br.close()
        return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut", default="full", choices=["full", "teaser", "teaser2"])
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--channel", default=None, help="chrome — взять установленный Google Chrome")
    ap.add_argument("--no-blur", action="store_true", help="без размытия движения на погружении")
    ap.add_argument("--audio", default=None, help="wav для сборки MP4")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    scene = HERE / "kiber.html"
    url = scene.as_uri() + ("" if a.cut == "full" else "?cut=" + a.cut)
    gpu = asyncio.run(check(url, a.channel))
    print("видеокарта:", gpu)
    if "SwiftShader" in gpu:
        print("ВНИМАНИЕ: программная отрисовка, GPU не подхватился — см. kiber/RENDER.md")
    if a.check:
        return
    n = 3600 if a.cut == "full" else 300
    out = HERE / "kadry" / a.cut
    out.mkdir(parents=True, exist_ok=True)
    todo = [i for i in range(n) if not (out / f"f{i:05d}.jpg").exists()]
    print(f"кадров: {n}, осталось: {len(todo)}, потоков: {a.workers}")
    left = [len(todo)]

    async def run():
        parts = [todo[k::a.workers] for k in range(a.workers)]
        await asyncio.gather(*[worker(url, out, part, a.channel, not a.no_blur, k, left) for k, part in enumerate(parts) if part])
    asyncio.run(run())
    if not shutil.which("ffmpeg"):
        print("ffmpeg не найден — кадры в", out)
        return
    audio = a.audio
    if not audio and a.cut != "full":
        audio = str(HERE / f"{a.cut.upper()}.wav")
        subprocess.run([sys.executable, str(HERE / "tizer_zvuk.py"), audio, a.cut], check=True)
    mp4 = HERE / f"NEON_{a.cut}_9x16.mp4"
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", "30", "-i", str(out / "f%05d.jpg")]
    if audio and os.path.exists(audio):
        cmd += ["-i", audio, "-map", "0:v", "-map", "1:a", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4)]
    subprocess.run(cmd, check=True)
    print("готово:", mp4)


if __name__ == "__main__":
    main()
