#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hooki.py — чем чужие ролики держат первые секунды, и чем держим мы.

    python3 hooki.py                    отчёт в Primeri/HOOKI.md
    python3 hooki.py --sek 3            другое окно хука (по умолчанию 3 с)

Берёт то, что уже лежит в репозитории: субтитры разобранных чужих роликов
(`Primeri/*/subs.vtt`, пословные тайминги) и наши тайминги
(`timing-*.json`). Ничего не качает.

Меряет по каждому ролику:

    хук            — что сказано в первые три секунды
    до числа       — на какой секунде впервые звучит число
    вопрос         — начинается ли с вопросительного слова
    темп на входе  — слов в минуту в первые десять секунд
    темп всего     — слов в минуту по всему ролику

Что из этого следует, машина не решает: она приносит числа, выводы
пишутся в `PRIYOMY.md` руками.
"""
import json, os, re, sys
for _п in (sys.stdout, sys.stderr):
    try: _п.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
CHUZHIE = os.path.join(HERE, 'Primeri')

ВОПРОС = ('почему', 'зачем', 'сколько', 'что', 'как', 'кто', 'куда', 'когда',
          'какой', 'какая', 'какие', 'откуда', 'чем', 'why', 'how', 'what',
          'who', 'where', 'when')
ЧИСЛО = re.compile(r'\d')
# Числительные словами: в озвучке цифр не пишут, а число звучит.
СЛОВОМ = ('ноль', 'один', 'одна', 'два', 'две', 'три', 'четыре', 'пять',
          'шесть', 'семь', 'восемь', 'девять', 'десять', 'сто', 'двести',
          'триста', 'тысяч', 'тысяча', 'тысячи', 'миллион', 'миллиард',
          'процент', 'половина', 'треть', 'четверть', 'первый', 'первая')

ВРЕМЯ = re.compile(r'(\d\d):(\d\d):(\d\d)\.(\d\d\d)')


def сек(м):
    ч, мин, с, мс = (int(x) for x in м.groups())
    return ч * 3600 + мин * 60 + с + мс / 1000


def slova_iz_vtt(путь):
    """Пословная дорожка из субтитров.

    Автосубтитры приходят «бегущей строкой»: каждая реплика повторяет
    предыдущую целиком. Спасают встроенные метки времени у слов — берём
    только их, а не текст реплик, иначе всё утраивается.
    """
    текст = open(путь, encoding='utf-8', errors='replace').read()
    слова = []
    for кусок in текст.split('\n\n'):
        м = ВРЕМЯ.search(кусок)
        if not м:
            continue
        старт = сек(м)
        внутри = re.findall(r'<(\d\d:\d\d:\d\d\.\d\d\d)><c>([^<]*)</c>', кусок)
        if внутри:
            # Первое слово реплики метки не имеет — оно звучит на старте.
            первое = re.split(r'<\d\d:', кусок.split('\n')[-1])[0]
            первое = re.sub(r'<[^>]+>', '', первое).strip()
            if первое:
                слова.append((старт, первое))
            for т, w in внутри:
                м2 = ВРЕМЯ.search(т)
                w = w.strip()
                if w and м2:
                    слова.append((сек(м2), w))
    # Одно и то же слово приходит в нескольких репликах — оставляем по метке.
    видели, чисто = set(), []
    for t, w in sorted(слова):
        ключ = (round(t, 2), w.lower())
        if ключ in видели:
            continue
        видели.add(ключ)
        чисто.append((t, w))
    return чисто


def slova_iz_timinga(путь):
    d = json.load(open(путь, encoding='utf-8'))
    return [(float(w['t']), w['w']) for w in (d.get('words') or [])], \
           float(d.get('DUR') or 0)


def chislo(слово):
    н = слово.lower().strip('.,!?»«"')
    return bool(ЧИСЛО.search(н)) or any(н.startswith(к) for к in СЛОВОМ)


def razbor(слова, длина, окно=3.0):
    if not слова:
        return None
    хук = ' '.join(w for t, w in слова if t < окно)
    первое = next((t for t, w in слова if chislo(w)), None)
    вход = [w for t, w in слова if t < 10.0]
    первое_слово = слова[0][1].lower().strip('.,!?»«"')
    return dict(
        хук=хук.strip(),
        до_числа=round(первое, 1) if первое is not None else None,
        вопрос=первое_слово in ВОПРОС,
        темп_входа=round(len(вход) / 10 * 60) if вход else 0,
        темп_всего=round(len(слова) / длина * 60) if длина else 0,
        слов=len(слова),
        длина=round(длина, 1),
    )


def chuzhie(окно):
    ряд = []
    if not os.path.isdir(CHUZHIE):
        return ряд
    for d in sorted(os.listdir(CHUZHIE)):
        vtt = os.path.join(CHUZHIE, d, 'subs.vtt')
        m = os.path.join(CHUZHIE, d, 'metrics.json')
        if not (os.path.isfile(vtt) and os.path.isfile(m)):
            continue
        длина = json.load(open(m, encoding='utf-8')).get('длина') or 0
        имя = d
        try:
            мета = json.load(open(os.path.join(CHUZHIE, d, 'meta.json'),
                                  encoding='utf-8'))
            имя = мета.get('название') or d
        except Exception:
            pass
        р = razbor(slova_iz_vtt(vtt), длина, окно)
        if р:
            р['имя'] = имя[:52]
            ряд.append(р)
    return ряд


def nashi(окно):
    ряд = []
    for ф in sorted(os.listdir(HERE)):
        m = re.match(r'^timing-([IV]-\d\d)\.json$', ф)
        if not m:
            continue
        слова, длина = slova_iz_timinga(os.path.join(HERE, ф))
        р = razbor(слова, длина, окно)
        if р:
            р['имя'] = m.group(1)
            ряд.append(р)
    return ряд


def таблица(ряд, L):
    L.append('| Ролик | Хук — первые секунды | До числа | Вопрос | Темп входа | Темп всего |')
    L.append('|---|---|---|---|---|---|')
    for р in ряд:
        L.append(f"| {р['имя']} | {р['хук'][:70]} | "
                 f"{str(р['до_числа']) + ' с' if р['до_числа'] is not None else '—'} | "
                 f"{'да' if р['вопрос'] else '—'} | "
                 f"{р['темп_входа']} сл/мин | {р['темп_всего']} сл/мин |")
    L.append('')


def main():
    окно = 3.0
    if '--sek' in sys.argv:
        окно = float(sys.argv[sys.argv.index('--sek') + 1].replace(',', '.'))
    их, наши = chuzhie(окно), nashi(окно)

    L = ['# Хуки: первые секунды чужих роликов и наших\n',
         f'Окно хука — {окно:g} с. Считано из субтитров разобранных роликов и '
         f'наших таймингов. Ничего не скачивалось.\n']
    L.append('## Чужие\n')
    if их:
        таблица(их, L)
    else:
        L.append('_Субтитров нет ни у одного разбора._\n')
    L.append('## Наши\n')
    таблица(наши, L) if наши else L.append('_Нет таймингов._\n')

    if их and наши:
        L.append('## Сравнение\n')
        def сред(р, к):
            # Медиана, а не среднее: два подкаста без чисел первые полминуты
            # утаскивают среднее так, что число перестаёт что-либо значить.
            зн = sorted(x[к] for x in р if x[к] is not None)
            if not зн:
                return None
            n = len(зн)
            return round(зн[n // 2] if n % 2 else (зн[n // 2 - 1] + зн[n // 2]) / 2, 1)
        L.append('Медианы, а не средние: выбросы в первых секундах у '
                 'подкастов иначе всё перекашивают.\n')
        L.append('| | Чужие | Наши |')
        L.append('|---|---|---|')
        L.append(f"| роликов | {len(их)} | {len(наши)} |")
        L.append(f"| до первого числа | {сред(их,'до_числа')} с | {сред(наши,'до_числа')} с |")
        L.append(f"| темп входа | {сред(их,'темп_входа')} сл/мин | {сред(наши,'темп_входа')} сл/мин |")
        L.append(f"| темп всего | {сред(их,'темп_всего')} сл/мин | {сред(наши,'темп_всего')} сл/мин |")
        в_их = sum(1 for x in их if x['вопрос'])
        в_наши = sum(1 for x in наши if x['вопрос'])
        L.append(f"| начинают с вопроса | {в_их} из {len(их)} | {в_наши} из {len(наши)} |")
        L.append('')

    путь = os.path.join(CHUZHIE, 'HOOKI.md')
    if '--out' in sys.argv:
        путь = sys.argv[sys.argv.index('--out') + 1]
    open(путь, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L))
    print(f'→ {путь}')


if __name__ == '__main__':
    main()
