#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
snimok.py — принести чужие ролики из радара и оставить от них замеры.

Запускать НА ДОМАШНЕЙ МАШИНЕ: из облачного контейнера YouTube закрыт
сетевой политикой, а `yt-dlp` с датацентрового адреса упирается в
«Sign in to confirm you're not a bot». С обычного домашнего адреса всё
работает.

    python3 snimok.py                 пять самых горячих из RADAR.md
    python3 snimok.py --top 10        десять
    python3 snimok.py --push          сразу закоммитить и отправить
    python3 snimok.py --url ССЫЛКА    один конкретный ролик
    python3 snimok.py --fayl vhod/x.mp4   уже скачанный файл
    python3 snimok.py --proxy socks5://127.0.0.1:1080   через прокси

Что делает: скачивает ролик, прогоняет `razbor.py`, кладёт в
`Primeri/<канал>-<id>/` кадры, субтитры и `metrics.json`, **удаляет
видео**. В репозиторий едет полмегабайта на ролик, а не двадцать.

Нужны: yt-dlp и ffmpeg в PATH, Python 3.9+.
"""
import json, os, re, shutil, subprocess, sys, tempfile
# Windows-консоль отдаёт cp1251, и первая же стрелка «→» роняет скрипт
# с UnicodeEncodeError. Проверено на раннере 20.09.2026: разбор дошёл до
# конца, а упала печать результата. Переключаем поток на UTF-8 сразу.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
RADAR = os.path.join(HERE, 'radar', 'RADAR.md')
OUT = os.path.join(HERE, 'Primeri')


def ytdlp_cmd():
    """Как звать yt-dlp. На Windows pip кладёт yt-dlp.exe в Scripts, а эта
    папка часто не в PATH — установка прошла, а команды нет. Тогда зовём
    модулем через тот же интерпретатор: работает всегда, править
    переменные среды не нужно."""
    exe = shutil.which('yt-dlp')
    if exe:
        return [exe]
    try:
        import yt_dlp  # noqa: F401
        return [sys.executable, '-m', 'yt_dlp']
    except ImportError:
        sys.exit('yt-dlp не установлен. Поставить:  pip install -U yt-dlp')


def need_ffmpeg():
    if shutil.which('ffmpeg'):
        return
    sys.exit('нет ffmpeg в PATH — без него нечем мерить ролик.\n'
             'Windows:  winget install Gyan.FFmpeg   (и заново открыть терминал)\n'
             'macOS:    brew install ffmpeg')


def slug(s):
    s = re.sub(r'[^\w\s-]', '', s, flags=re.U).strip().lower()
    return re.sub(r'[\s_]+', '-', s)[:40] or 'rolik'


def from_radar(top):
    """Ссылки из свежего отчёта радара, в порядке появления: сначала
    раздел прироста — то, что греется прямо сейчас."""
    if not os.path.isfile(RADAR):
        sys.exit('нет radar/RADAR.md — сначала прогон радара')
    txt = open(RADAR, encoding='utf-8').read()
    seen, items = set(), []
    for m in re.finditer(r'\[([^\]]+)\]\(https://youtube\.com/shorts/([\w-]+)\)\s*\|\s*([^|]+)\|', txt):
        title, vid, chan = m.group(1).strip(), m.group(2), m.group(3).strip()
        if vid in seen:
            continue
        seen.add(vid)
        items.append({'id': vid, 'название': title, 'канал': chan,
                      'url': f'https://youtube.com/shorts/{vid}'})
        if len(items) >= top:
            break
    return items


YTDLP = ['yt-dlp']


def proxy():
    """Ссылка на прокси или ВПН, если YouTube из дома не открывается.
    Берётся из ключа --proxy или из переменной среды SNIMOK_PROXY
    (в GitHub это секрет с тем же именем)."""
    a = sys.argv[1:]
    if '--proxy' in a:
        return a[a.index('--proxy') + 1]
    return os.environ.get('SNIMOK_PROXY', '').strip()


# Сеть либо есть, либо нет: ждать по минуте на ролик незачем.
SET = ['--socket-timeout', '20', '--retries', '3', '--fragment-retries', '3']


def iz_fayla(путь):
    """Ролик уже скачан — измерить его и разложить как остальные.

    Нужно там, где YouTube закрыт: браузер с ВПН приносит файл, а пульт
    его меряет. Субтитры подхватываются, если лежат рядом с тем же именем
    (`rolik.mp4` и `rolik.ru.vtt`), но без них тоже считается всё, кроме
    темпа речи."""
    if not os.path.isfile(путь):
        sys.exit(f'нет файла {путь}')
    основа = os.path.splitext(os.path.basename(путь))[0]
    name = slug(основа)
    dest = os.path.join(OUT, name)
    if os.path.isfile(os.path.join(dest, 'metrics.json')):
        print(f'  {name}: уже разобран, пропускаю')
        return None
    os.makedirs(dest, exist_ok=True)
    рядом = os.path.dirname(os.path.abspath(путь))
    for f in sorted(os.listdir(рядом)):
        if f.startswith(основа) and f.lower().endswith(('.vtt', '.srt')):
            shutil.copy(os.path.join(рядом, f), os.path.join(dest, 'subs' +
                        os.path.splitext(f)[1].lower()))
            break
    subprocess.run([sys.executable, os.path.join(HERE, 'razbor.py'), путь, dest],
                   check=False)
    if not os.path.isfile(os.path.join(dest, 'metrics.json')):
        sys.exit(f'{name}: разбор не дал чисел — файл битый или это не видео')
    json.dump({'id': основа, 'название': основа, 'канал': 'свой файл',
               'url': ''}, open(os.path.join(dest, 'meta.json'), 'w',
                                encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  {name}: готово')
    return name


def grab(item):
    name = f"{slug(item['канал'])}-{item['id']}"
    dest = os.path.join(OUT, name)
    if os.path.isfile(os.path.join(dest, 'metrics.json')):
        print(f"  {name}: уже разобран, пропускаю")
        return None
    os.makedirs(dest, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        mp4 = os.path.join(tmp, 'v.mp4')
        ключи = SET + (['--proxy', proxy()] if proxy() else [])
        общее = ['-q', '--no-warnings',
                 '-f', 'bv*[height<=1920][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
                 '--merge-output-format', 'mp4', '--sleep-requests', '1',
                 '-o', os.path.join(tmp, 'v.%(ext)s'), item['url']]
        субтитры = ['--write-auto-subs', '--write-subs', '--sub-langs', 'ru,en',
                    '--convert-subs', 'vtt']
        r = subprocess.run(YTDLP + ключи + субтитры + общее, capture_output=True)

        # Субтитры — не ролик. Из них берётся только темп речи, и терять
        # из-за них всё скачивание нельзя. Поймано 20.09.2026: «HTTP Error
        # 429: Too Many Requests» на английских субтитрах уронил ролик,
        # который прекрасно качался. Общий адрес ВПН ловит 429 легко.
        if not os.path.isfile(mp4):
            первая = r.stderr.decode('utf-8', 'ignore')
            if 'subtitle' in первая.lower() or '429' in первая:
                print(f"  {name}: субтитры не дались, беру ролик без них")
                r = subprocess.run(YTDLP + ключи + общее, capture_output=True)

        if not os.path.isfile(mp4):
            err = r.stderr.decode('utf-8', 'ignore')
            # Две разные беды, и лечатся они по-разному, поэтому и
            # сообщения разные. Проверено запуском в контейнере 20.09.2026.
            if 'Tunnel connection failed' in err or 'proxy' in err.lower():
                sys.exit('YouTube закрыт сетевой политикой этого окружения '
                         '(403 на CONNECT). snimok.py надо запускать на домашней '
                         'машине — из облака ролики не скачать.')
            if 'not a bot' in err or 'Sign in to confirm' in err:
                sys.exit('YouTube требует подтверждения, что вы не бот. Так бывает '
                         'с датацентрового адреса; с домашнего работает.')
            # Обрыв рукопожатия — это не наша поломка и не поломка yt-dlp:
            # так выглядит фильтрация трафика по дороге. Замерено на машине
            # Егора 20.09.2026: оба ролика, одна и та же ошибка.
            if ('UNEXPECTED_EOF' in err or 'EOF occurred in violation' in err
                    or 'SSLError' in err or 'Connection reset' in err
                    or 'Temporary failure in name resolution' in err):
                sys.exit('Связь с YouTube рвётся на рукопожатии — трафик фильтруют '
                         'по дороге.\nЛечится одним из двух:\n'
                         '  1) включить ВПН на всю систему и перезапустить раннер '
                         '(служба берёт маршруты при старте);\n'
                         '  2) задать прокси: snimok.py --proxy socks5://127.0.0.1:1080\n'
                         '     или переменную среды SNIMOK_PROXY (в GitHub — секрет '
                         'с этим именем).')
            print(f"  {name}: не скачался — {err[:140]}")
            os.rmdir(dest) if not os.listdir(dest) else None
            return None
        for f in os.listdir(tmp):                      # субтитры кладём рядом
            if f.endswith('.vtt'):
                shutil.copy(os.path.join(tmp, f), os.path.join(dest, 'subs.vtt'))
                break
        subprocess.run([sys.executable, os.path.join(HERE, 'razbor.py'), mp4, dest],
                       check=False)
    json.dump(item, open(os.path.join(dest, 'meta.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f"  {name}: готово")
    return name


def svesti(done, отправлять):
    """Пересобрать сводку и, если просили, отправить в репозиторий."""
    subprocess.run([sys.executable, os.path.join(HERE, 'svodka.py'),
                    OUT, '--out', os.path.join(OUT, 'SVODKA.md')], check=False)
    if отправлять:
        subprocess.run(['git', '-C', HERE, 'add', 'Primeri'], check=False)
        subprocess.run(['git', '-C', HERE, 'commit', '-m',
                        f'Разбор чужих роликов: {", ".join(done)}'], check=False)
        subprocess.run(['git', '-C', HERE, 'push'], check=False)
        print('отправлено в репозиторий')
    else:
        print('готово. Отправить: git add Primeri && git commit && git push '
              '(или запускать с --push)')


def main():
    args = sys.argv[1:]
    global YTDLP
    os.makedirs(OUT, exist_ok=True)

    # Готовый файл качать нечем — yt-dlp тут не нужен, только ffmpeg.
    if '--fayl' in args:
        need_ffmpeg()
        done = [n for n in [iz_fayla(args[args.index('--fayl') + 1])] if n]
        if not done:
            print('нечего разбирать: этот файл уже разобран')
            return
        svesti(done, '--push' in args)
        return

    YTDLP = ytdlp_cmd(); need_ffmpeg()

    if '--url' in args:
        url = args[args.index('--url') + 1]
        vid = re.search(r'([\w-]{8,})\s*$', url.rstrip('/')).group(1)
        items = [{'id': vid, 'название': 'вручную', 'канал': 'вручную', 'url': url}]
    else:
        top = int(args[args.index('--top') + 1]) if '--top' in args else 5
        items = from_radar(top)
        print(f'из радара взято роликов: {len(items)}')

    было = [i for i in items
            if os.path.isfile(os.path.join(OUT, f"{slug(i['канал'])}-{i['id']}",
                                           'metrics.json'))]
    done = [n for n in (grab(i) for i in items) if n]
    if not done:
        if len(было) == len(items):
            print('нового нет: всё из верхушки радара уже разобрано')
            return
        # Ролики были, но ни один не дошёл — это отказ, а не тишина.
        # Иначе шаг «Снять ролики» зеленеет на пустом месте, как 20.09.2026.
        sys.exit(f'ни один ролик не скачался ({len(items) - len(было)} попыток). '
                 'Выше написано, почему.')

    svesti(done, '--push' in args)


if __name__ == '__main__':
    main()
