#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
svyaz.py — проверить, как Python видит сеть: через ВПН или напрямую.

    python3 svyaz.py

Отвечает на один вопрос: дойдёт ли отсюда скачивание роликов. Показывает
адрес, с которого Python выходит наружу, и пробует рукопожатие с YouTube.

Зачем отдельно: ВПН-приложение может закрывать браузер, но не закрывать
Python. Гонять ради этой проверки весь воркфлоу — три минуты; здесь пять
секунд.
"""
import json, os, socket, ssl, subprocess, sys, urllib.request
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
СЛУЖБЫ = [('http://ip-api.com/json/?fields=query,country,isp', ('query', 'country', 'isp')),
          ('https://ipinfo.io/json', ('ip', 'country', 'org')),
          ('https://api.ipify.org?format=json', ('ip', None, None))]


def adres():
    """Адрес, с которого Python выходит наружу. Не браузер — именно Python."""
    for url, поля in СЛУЖБЫ:
        try:
            with urllib.request.urlopen(url, timeout=8) as r:
                d = json.load(r)
            return tuple(d.get(п) if п else None for п in поля)
        except Exception:
            continue
    return (None, None, None)


def rukopozhatie(хост='www.youtube.com', порт=443, таймаут=8):
    """Дошло ли до TLS. Обрыв здесь — это фильтрация по дороге."""
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((хост, порт), timeout=таймаут) as s:
            with ctx.wrap_socket(s, server_hostname=хост) as t:
                return True, t.version()
    except Exception as e:
        return False, f'{type(e).__name__}: {e}'


def stranitsa(url='https://www.youtube.com/@kokorevinvest/shorts'):
    """Отдаёт ли YouTube обычный HTML — этим живёт радар.

    Читать надо целиком: разметка `ytInitialData` лежит в конце, и обрезка
    на первых двухстах килобайтах давала «страница не отдалась» там, где
    страница прекрасно отдавалась. Поймано на машине Егора 20.09.2026."""
    try:
        зап = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(зап, timeout=15) as r:
            тело = r.read(4_000_000).decode('utf-8', 'replace')
    except Exception as e:
        return 'нет', f'{type(e).__name__}: {e}'
    есть = any(м in тело for м in ('ytInitialData', 'shortsLockupViewModel',
                                   '"videoRenderer"'))
    return ('да' if есть else 'без разметки'), len(тело)


def proba_ytdlp():
    """Решающая проверка: видит ли yt-dlp сам ролик. Ничего не качает —
    спрашивает только название."""
    # На Windows yt-dlp.exe часто не в PATH — тогда это не ненулевой код,
    # а FileNotFoundError, и проверка падала бы вместо ответа.
    зов = None
    try:
        if subprocess.run(['yt-dlp', '--version'],
                          capture_output=True).returncode == 0:
            зов = ['yt-dlp']
    except Exception:
        pass
    if зов is None:
        try:
            import yt_dlp  # noqa: F401
            зов = [sys.executable, '-m', 'yt_dlp']
        except ImportError:
            return None, 'yt-dlp не установлен'
    r = subprocess.run(зов + ['--no-warnings', '--skip-download',
                              '--print', '%(title)s', '--socket-timeout', '15',
                              'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
                       capture_output=True)
    имя = r.stdout.decode('utf-8', 'replace').strip()
    if r.returncode == 0 and имя:
        return True, имя
    беда = r.stderr.decode('utf-8', 'replace').strip().splitlines()
    return False, (беда[-1] if беда else 'без объяснения')


def main():
    print(f'Python:  {sys.executable}')
    ip, страна, кто = adres()
    if ip:
        print(f'Адрес:   {ip}' + (f'  ({страна}' + (f', {кто}' if кто else '') + ')'
                                  if страна else ''))
        if страна and страна not in ('RU', 'Russia'):
            print('         ← не домашняя страна: значит Python идёт через ВПН')
        elif страна:
            print('         ← домашний адрес: ВПН этот процесс НЕ закрывает')
    else:
        print('Адрес:   узнать не вышло — наружу вообще не пускает')

    ладно, чем = rukopozhatie()
    print(f'YouTube: рукопожатие ' + ('прошло, ' + str(чем) if ладно else 'оборвалось'))
    if not ладно:
        print(f'         {чем}')

    стр, сколько = stranitsa()
    if стр == 'да':
        print(f'Страница: отдалась, {сколько} знаков — радару хватит')
    elif стр == 'без разметки':
        print(f'Страница: пришла ({сколько} знаков), но разметки радара в ней нет')
    else:
        print(f'Страница: не пришла — {сколько}')

    вышло, чем = proba_ytdlp()
    if вышло is None:
        print(f'Проба:   {чем}')
    elif вышло:
        print(f'Проба:   yt-dlp видит ролик — «{чем}»')
    else:
        print(f'Проба:   yt-dlp не смог\n         {чем[:200]}')

    print()
    if вышло:
        print('Вывод: скачивание роликов отсюда пройдёт.')
    elif вышло is None and ладно and стр == 'да':
        print('Вывод: сеть в порядке, но проверить скачивание нечем — '
              'поставьте yt-dlp:  pip install -U yt-dlp')
    elif стр == 'да' and not вышло:
        print('Вывод: радар работать будет, скачивание — нет. '
              'Причина выше, в строке «Проба».')
    else:
        print('Вывод: скачивание отсюда не пройдёт.\n'
              'Лечится так: в ВПН-приложении включить режим на всю систему\n'
              '(в Browsec это «Полная защита») и ПЕРЕЗАПУСТИТЬ то, что качает:\n'
              'пульт — закрыть чёрное окно и открыть заново, раннер — run.cmd.\n'
              'Список программ помогает не всегда: у Python в списке одна\n'
              'программа-посредник, а в сеть ходит другая, настоящая.')


if __name__ == '__main__':
    main()
