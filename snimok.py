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

Что делает: скачивает ролик, прогоняет `razbor.py`, кладёт в
`Primeri/<канал>-<id>/` кадры, субтитры и `metrics.json`, **удаляет
видео**. В репозиторий едет полмегабайта на ролик, а не двадцать.

Нужны: yt-dlp и ffmpeg в PATH, Python 3.9+.
"""
import json, os, re, shutil, subprocess, sys, tempfile

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


def grab(item):
    name = f"{slug(item['канал'])}-{item['id']}"
    dest = os.path.join(OUT, name)
    if os.path.isfile(os.path.join(dest, 'metrics.json')):
        print(f"  {name}: уже разобран, пропускаю")
        return None
    os.makedirs(dest, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        mp4 = os.path.join(tmp, 'v.mp4')
        r = subprocess.run(YTDLP + ['-q', '--no-warnings',
                            '-f', 'bv*[height<=1920][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
                            '--merge-output-format', 'mp4',
                            '--write-auto-subs', '--write-subs', '--sub-langs', 'ru,en',
                            '--convert-subs', 'vtt',
                            '-o', os.path.join(tmp, 'v.%(ext)s'), item['url']],
                           capture_output=True)
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
            print(f"  {name}: не скачался — {err[:140]}")
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


def main():
    args = sys.argv[1:]
    global YTDLP
    YTDLP = ytdlp_cmd(); need_ffmpeg()
    os.makedirs(OUT, exist_ok=True)

    if '--url' in args:
        url = args[args.index('--url') + 1]
        vid = re.search(r'([\w-]{8,})\s*$', url.rstrip('/')).group(1)
        items = [{'id': vid, 'название': 'вручную', 'канал': 'вручную', 'url': url}]
    else:
        top = int(args[args.index('--top') + 1]) if '--top' in args else 5
        items = from_radar(top)
        print(f'из радара взято роликов: {len(items)}')

    done = [n for n in (grab(i) for i in items) if n]
    if not done:
        print('нового нет'); return

    subprocess.run([sys.executable, os.path.join(HERE, 'svodka.py'),
                    OUT, '--out', os.path.join(OUT, 'SVODKA.md')], check=False)

    if '--push' in args:
        subprocess.run(['git', '-C', HERE, 'add', 'Primeri'], check=False)
        subprocess.run(['git', '-C', HERE, 'commit', '-m',
                        f'Разбор чужих роликов: {", ".join(done)}'], check=False)
        subprocess.run(['git', '-C', HERE, 'push'], check=False)
        print('отправлено в репозиторий')
    else:
        print('готово. Отправить: git add Primeri && git commit && git push '
              '(или запускать с --push)')


if __name__ == '__main__':
    main()
