#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
priemka.py — померить свои ролики теми же линейками, что и чужие.

    python3 priemka.py            все готовые ролики из out/
    python3 priemka.py I-01       один
    python3 priemka.py --out priemka/PRIEMKA.md

Норма берётся не с потолка: она считается из разборов чужих роликов в
`Primeri/`. Растёт набор примеров — уточняется норма. Исключение одно:
громкость. Её задаёт площадка, а не примеры: −14 LUFS, и все три
разобранных чужих ролика стоят на −14,3 неслучайно.

Замеры кладутся в `priemka/<имя>/`, отчёт — в `priemka/PRIEMKA.md`.
"""
import json, os, re, statistics as st, subprocess, sys
# Windows-консоль отдаёт cp1251, и первая же стрелка «→» роняет скрипт
# с UnicodeEncodeError. Переключаем поток на UTF-8 сразу.
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
CHUZHIE = os.path.join(HERE, 'Primeri')
OUT = os.path.join(HERE, 'priemka')
GROMKOST = -14.0       # норма площадки, не из примеров


def zamery(папка):
    ряд = []
    if not os.path.isdir(папка):
        return ряд
    for d in sorted(os.listdir(папка)):
        п = os.path.join(папка, d, 'metrics.json')
        if os.path.isfile(п):
            try:
                м = json.load(open(п, encoding='utf-8'))
                м['папка'] = d
                ряд.append(м)
            except Exception:
                pass
    return ряд


def chislo(м, путь):
    """Достать значение по пути вида 'звук.громкость_LUFS'."""
    узел = м
    for ключ in путь.split('.'):
        if not isinstance(узел, dict):
            return None
        узел = узел.get(ключ)
    return узел


# Что меряем, как достаём, как называем и куда смотреть.
# «больше» — значение должно быть не ниже нижней границы нормы,
# «диапазон» — попасть между крайними значениями чужих роликов.
ПРОВЕРКИ = [
    ('громкость, LUFS',   'звук.громкость_LUFS',              'цель',     0.9),
    ('покой',             'движение.доля_покоя',              'диапазон', 0.03),
    ('склеек',            None,                               'диапазон', 0),
    ('движение, с',       'движение.средняя_длительность',    'больше',   0.0),
    ('звука в минуту',    'звук.звуковых_событий_в_минуту',   'больше',   0.0),
    ('тишина',            'звук.доля_тишины',                 'диапазон', 0.05),
]


def isklyuchennye():
    """Какие разборы в норму не идут и почему.

    Норма считается по нашей полке: русская вертикальная инфографика про
    деньги. Ролик другого жанра раздвигает границы так, что они перестают
    что-либо значить: рисованная анимация с долей покоя 26% превратила
    норму «73–82%» в «26–82%», куда влезает вообще всё."""
    try:
        d = json.load(open(os.path.join(CHUZHIE, 'norma.json'), encoding='utf-8'))
        return d.get('исключить') or {}
    except Exception:
        return {}


def norma(чужие):
    """Границы по каждой проверке — из чужих роликов нашей полки."""
    вон = isklyuchennye()
    чужие = [м for м in чужие if м.get('папка') not in вон]
    н = {}
    for имя, путь, вид, допуск in ПРОВЕРКИ:
        зн = [len(м.get('склейки') or []) if путь is None else chislo(м, путь)
              for м in чужие]
        зн = [float(z) for z in зн if isinstance(z, (int, float))]
        if not зн:
            continue
        н[имя] = dict(мин=min(зн), макс=max(зн), сред=round(st.median(зн), 2),
                      вид=вид, допуск=допуск, путь=путь)
    if 'громкость, LUFS' in н:
        н['громкость, LUFS'].update(сред=GROMKOST, мин=GROMKOST, макс=GROMKOST)
    return н


def sverit(м, н):
    """Сверить один ролик с нормой. Возвращает строки отчёта."""
    строки = []
    for имя, путь, вид, допуск in ПРОВЕРКИ:
        if имя not in н:
            continue
        гр = н[имя]
        v = len(м.get('склейки') or []) if путь is None else chislo(м, путь)
        if not isinstance(v, (int, float)):
            continue
        v = float(v)
        if вид == 'цель':
            ладно = abs(v - гр['сред']) <= допуск
            норма = f"{гр['сред']:.1f}"
        elif вид == 'больше':
            ладно = v >= гр['мин'] - допуск
            норма = f"от {гр['мин']:g}"
        else:
            ладно = гр['мин'] - допуск <= v <= гр['макс'] + допуск
            норма = (f"{гр['мин']:g}–{гр['макс']:g}" if гр['мин'] != гр['макс']
                     else f"{гр['мин']:g}")
        строки.append(dict(имя=имя, значение=round(v, 2), норма=норма, ладно=ладно))
    return строки


def izmerit(mp4, имя):
    папка = os.path.join(OUT, имя)
    os.makedirs(папка, exist_ok=True)
    свежо = (os.path.isfile(os.path.join(папка, 'metrics.json')) and
             os.path.getmtime(os.path.join(папка, 'metrics.json')) > os.path.getmtime(mp4))
    if not свежо:
        subprocess.run([sys.executable, os.path.join(HERE, 'razbor.py'), mp4, папка],
                       check=False)
    п = os.path.join(папка, 'metrics.json')
    if not os.path.isfile(п):
        return None
    м = json.load(open(п, encoding='utf-8'))
    м['папка'] = имя
    return м


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    чужие = zamery(CHUZHIE)
    вон = isklyuchennye()
    чужие_в_норме = [м for м in чужие if м.get('папка') not in вон]
    for папка, почему in вон.items():
        print(f'вне нормы: {папка}\n  {почему}')
    if len(чужие_в_норме) < 2:
        sys.exit('нормы не из чего считать: в Primeri меньше двух разборов.\n'
                 'Сначала разберите чужие ролики — snimok.py или кнопка в пульте.')
    н = norma(чужие)
    os.makedirs(OUT, exist_ok=True)

    # Судим готовый ролик, а не промежуточный: если есть сведённый со
    # звуком — меряем его, иначе тот, что есть. Иначе половина расхождений
    # в отчёте — про файл, который никто не публикует.
    папка_out = os.path.join(HERE, 'out')
    лучшее = {}
    for ф in sorted(os.listdir(папка_out)) if os.path.isdir(папка_out) else []:
        м = re.match(r'^([IV]-\d\d)(_sfx)?\.mp4$', ф)
        if not м:
            continue
        if args and м.group(1) not in args:
            continue
        имя, со_звуком = м.group(1), bool(м.group(2))
        if имя not in лучшее or со_звуком:
            лучшее[имя] = (имя + (' со звуком' if со_звуком else ' без звука'),
                           os.path.join(папка_out, ф), имя)
    наши = [лучшее[k] for k in sorted(лучшее)]
    if not наши:
        sys.exit('в out/ нет ни одного готового ролика')

    отчёт = ['# Приёмка своих роликов\n',
             f'Норма посчитана из {len(чужие_в_норме)} разобранных чужих роликов '
             f'нашей полки (всего разборов {len(чужие)}). '
             f'Громкость задаёт площадка: {GROMKOST:.0f} LUFS.\n']
    всего_бед = 0
    for показ, mp4, папка in наши:
        м = izmerit(mp4, папка)
        if not м:
            print(f'{показ}: замерить не вышло'); continue
        строки = sverit(м, н)
        беды = [с for с in строки if not с['ладно']]
        всего_бед += len(беды)
        знак = '✓' if not беды else f'✕ {len(беды)}'
        print(f"\n{показ}  {знак}")
        отчёт.append(f'\n## {показ}  {знак}\n')
        отчёт.append('| | Замер | Норма | |')
        отчёт.append('|---|---|---|---|')
        for с in строки:
            print(f"  {с['имя']:<18} {с['значение']:>8}   норма {с['норма']:<10}"
                  f" {'✓' if с['ладно'] else '✕'}")
            отчёт.append(f"| {с['имя']} | {с['значение']} | {с['норма']} | "
                         f"{'✓' if с['ладно'] else '✕'} |")

    путь = os.path.join(OUT, 'PRIEMKA.md')
    if '--out' in sys.argv:
        путь = sys.argv[sys.argv.index('--out') + 1]
    open(путь, 'w', encoding='utf-8').write('\n'.join(отчёт) + '\n')
    print(f"\n→ {путь}  (расхождений {всего_бед})")


if __name__ == '__main__':
    main()
