#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
otpravit.py — отправить в репозиторий то, что пульт наработал на машине.

    python3 otpravit.py                 посмотреть и отправить
    python3 otpravit.py --posmotret     только показать, ничего не делать

Радар, приёмка, выравнивание и сведение пишут файлы **на этой машине**.
Сами они никуда не едут: `snimok.py --push` отправляет только разборы
чужих роликов, остальное ждёт здесь. Эта команда собирает всё разом.

Зачем это нужно, помимо сохранности: пульт обновляется через
`git pull --ff-only`, а он отказывается работать, когда на машине лежат
неотправленные правки тех же файлов. Копится молча — отваливается разом.
"""
import os, re, subprocess, sys
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))


def git(*а, тихо=False):
    r = subprocess.run(['git', '-C', HERE] + list(а), capture_output=True)
    вывод = r.stdout.decode('utf-8', 'replace').strip()
    if not тихо and вывод:
        print(вывод)
    return r.returncode, вывод


def chto_izmenilos():
    _, порядок = git('status', '--porcelain', тихо=True)
    файлы = [с[3:].strip('"') for с in порядок.splitlines() if с.strip()]
    return файлы


# Человеческие названия для того, что чаще всего меняется.
ГРУППЫ = [
    (r'^radar/',        'радар'),
    (r'^Primeri/',      'разборы чужих роликов'),
    (r'^priemka/',      'приёмка'),
    (r'^timing-',       'тайминги дорожек'),
    (r'^i\d\d\.html$',  'сцены'),
    (r'^text-',         'тексты озвучки'),
    (r'^voice/',        'дорожки'),
    (r'^out/',          'готовые ролики'),
]


def gruppy(файлы):
    найдено = []
    прочее = 0
    for имя in файлы:
        для = next((н for ш, н in ГРУППЫ if re.match(ш, имя)), None)
        if для:
            if для not in найдено:
                найдено.append(для)
        else:
            прочее += 1
    if прочее:
        найдено.append(f'прочее ({прочее})')
    return найдено


def main():
    файлы = chto_izmenilos()
    if not файлы:
        print('отправлять нечего: на машине всё то же, что в репозитории')
        return
    print(f'не отправлено файлов: {len(файлы)}')
    for имя in файлы[:20]:
        print(f'  {имя}')
    if len(файлы) > 20:
        print(f'  … и ещё {len(файлы) - 20}')
    что = gruppy(файлы)
    print(f'\nэто: {", ".join(что)}')

    if '--posmotret' in sys.argv:
        print('\nтолько посмотреть — ничего не отправляю')
        return

    print('\n── отправляю ──')
    git('add', '-A')
    код, _ = git('diff', '--cached', '--quiet', тихо=True)
    if код == 0:
        print('нечего коммитить (всё в игноре)')
        return
    заголовок = 'Пульт: ' + ', '.join(что)
    код, _ = git('commit', '-m', заголовок,
                 '-m', 'Отправлено с домашней машины кнопкой в пульте.')
    if код != 0:
        sys.exit('коммит не вышел — смотрите вывод выше')
    # Сначала забрать чужое: раннер коммитит разборы в ту же ветку.
    код, _ = git('pull', '--rebase', 'origin', 'main')
    if код != 0:
        sys.exit('не удалось совместить с тем, что в репозитории.\n'
                 'Это значит, что один и тот же файл правили и здесь, и там.\n'
                 'Пришлите мне вывод выше, разберу.')
    код, _ = git('push', 'origin', 'HEAD:main')
    if код != 0:
        sys.exit('отправить не вышло — смотрите вывод выше')
    print('\nготово: всё на GitHub')


if __name__ == '__main__':
    main()
