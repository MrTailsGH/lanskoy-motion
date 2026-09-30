"""Собирает базу знаний skillry: KATALOG.md, katalog.json (без промптов) и приватный PROMPTY.md."""
import json, ast, os, glob, statistics as st, collections, re

d = json.load(open('items.json'))
summ = {}
for f in sorted(glob.glob('sum/out_*.tsv')):
    for ln in open(f, encoding='utf-8'):
        p = ln.rstrip('\n').split('\t')
        if len(p) == 4:
            summ[p[0]] = (p[1], int(p[2]), p[3])
vis = {}
for ln in open('vis.tsv', encoding='utf-8'):
    p = ln.rstrip('\n').split('\t')
    if len(p) == 3:
        vis[p[0]] = (int(p[1]), p[2])

CAT = {'Motion graphics': 'Моушн', 'Explainers': 'Эксплейнер', '3D scenes': '3D', 'Games': 'Игра'}
rows = []
for x in d:
    s = x['slug']
    tech = ast.literal_eval(x['tech']) if isinstance(x['tech'], str) else x['tech']
    m = {}
    if os.path.exists(f'frames/{s}.json'):
        m = json.load(open(f'frames/{s}.json'))
    sm, rel, use = summ.get(s, ('', 0, '—'))
    v = vis.get(s)
    if v:
        rel = max(rel, v[0])
    w, h = m.get('w'), m.get('h')
    fmt = '—'
    if w and h:
        fmt = 'верт' if h > w * 1.1 else ('кв' if abs(h - w) <= w * 0.1 else 'гор')
    rows.append(dict(
        slug=s, author=x['author'], category=x['category'], cat_ru=CAT.get(x['category'], x['category']),
        dur=x['dur_original'], w=w, h=h, fmt=fmt, cuts=m.get('cuts'), still=m.get('still'),
        motion_med=m.get('motion_med'), tech=tech, partial=x['prompt_note'].startswith('The author shared part'),
        prompt_len=len(x['prompt'] or ''), summary=sm, rel=rel, borrow=use, seen=(v[1] if v else ''),
        url=f"https://skillry.dev/ai-videos/opus-5-5/{s}", post=x['post_url'],
        mp4=f"https://media.skillry.dev/opus-5-5/{s}/original.mp4",
    ))

os.makedirs('kb', exist_ok=True)
json.dump(rows, open('kb/katalog.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- статистика
def fmt_pct(v): return f"{v*100:.0f}%" if v is not None else '—'
def secs(t):
    a = t.split(':'); return int(a[0]) * 60 + int(a[1])
S = []
S.append(f"Всего записей: **{len(rows)}**. Замерено видео: **{sum(1 for r in rows if r['cuts'] is not None)}** "
         f"(одно не скачалось — `faroukzy-138551`, 4:00).")
cc = collections.Counter(r['category'] for r in rows)
S.append('Категории: ' + ', '.join(f"{CAT[k]} {v}" for k, v in cc.most_common()) + '.')
tc = collections.Counter(t for r in rows for t in r['tech'])
S.append('Технологии: ' + ', '.join(f"{k} {v}" for k, v in tc.most_common()) + '.')
fc = collections.Counter(r['fmt'] for r in rows)
S.append(f"Формат: горизонталь {fc['гор']}, вертикаль {fc['верт']}, квадрат {fc['кв']}.")
ds = [secs(r['dur']) for r in rows if r['dur']]
S.append(f"Длина: медиана {st.median(ds):.0f} с, 15 с ровно — {sum(1 for x in ds if x == 15)} шт. (шаблон «шоурил моушн-дизайнера»), "
         f"длиннее минуты — {sum(1 for x in ds if x > 60)}.")
for cat in ['Motion graphics', 'Explainers', '3D scenes', 'Games']:
    rr = [r for r in rows if r['category'] == cat and r['cuts'] is not None]
    S.append(f"- {CAT[cat]}: медиана склеек {st.median([r['cuts'] for r in rr]):.0f}, "
             f"доля покоя {st.median([r['still'] for r in rr])*100:.0f}%.")
S.append(f"Промпт выложен частично: {sum(r['partial'] for r in rows)} из {len(rows)}.")
rc = collections.Counter(r['rel'] for r in rows)
S.append(f"Полезность для канала: ★★ {rc[2]}, ★ {rc[1]}, без звезды {rc[0]}.")
open('kb/stats.md', 'w').write('\n'.join(S) + '\n')

# ---- каталог
STAR = {2: '★★', 1: '★', 0: ''}
def esc(t): return (t or '').replace('|', '/').replace('\n', ' ')
L = []
L.append('# Каталог skillry.dev / Opus 5.5 — все 475 записей\n')
L.append('Метаданные и короткое описание по-русски. Сами промпты здесь не выложены — '
         'они у пользователя локально (`C:\\MotionCapture\\skillry\\PROMPTY.md`) и на странице по ссылке.\n')
L.append('**★★** — прямо про деньги, цифры, графики или приём, который сразу ложится на нашу инфографику; '
         '**★** — переносимая техника (типографика, переходы, UI-карточки, частицы); без звезды — для справки.\n')
L.append('Столбцы: **формат** (верт/гор/кв), **скл** — склеек за ролик, **покой** — доля кадров почти без движения '
         '(замер `vids.py` по original.mp4), **½** — автор выложил только часть промпта. '
         'Поле «видно» — что на кадрах на самом деле (промпт часто не совпадает с роликом).\n')
L.append('## Сводка\n')
L += S
L.append('')
L.append('## ★★ Сначала смотреть\n')
L.append('| Запись | Кат | Длина | Формат | Что это | Что взять |')
L.append('|---|---|---|---|---|---|')
for r in sorted([r for r in rows if r['rel'] == 2], key=lambda r: (r['fmt'] != 'верт', r['slug'])):
    what = r['seen'] or r['summary']
    L.append(f"| [{r['slug']}]({r['url']}) | {r['cat_ru']} | {r['dur']} | {r['fmt']} | {esc(what)} | {esc(r['borrow'])} |")
L.append('')
for cat in ['Motion graphics', 'Explainers', '3D scenes', 'Games']:
    rr = sorted([r for r in rows if r['category'] == cat], key=lambda r: r['slug'])
    L.append(f"## {CAT[cat]} — {len(rr)}\n")
    L.append('| ★ | Запись | Длина | Формат | Скл | Покой | Тех | Что это | Что взять |')
    L.append('|---|---|---|---|---|---|---|---|---|')
    for r in rr:
        what = esc(r['summary']) + (f" · **видно:** {esc(r['seen'])}" if r['seen'] else '')
        L.append(f"| {STAR[r['rel']]} | [{r['slug']}]({r['url']}){' ½' if r['partial'] else ''} | {r['dur']} | "
                 f"{r['fmt']} | {r['cuts'] if r['cuts'] is not None else '—'} | {fmt_pct(r['still'])} | "
                 f"{', '.join(r['tech'])} | {what} | {esc(r['borrow'])} |")
    L.append('')
open('kb/KATALOG.md', 'w', encoding='utf-8').write('\n'.join(L))

# ---- приватный файл с полными промптами (не в репозиторий)
P = ['# skillry.dev / Opus 5.5 — полные промпты (личная копия, не публиковать)\n',
     'Порядок: сначала ★★, потом ★, потом остальные; внутри — по имени. '
     'Тексты принадлежат авторам записей, взяты со страниц skillry.dev для изучения.\n']
byslug = {x['slug']: x for x in d}
for r in sorted(rows, key=lambda r: (-r['rel'], r['slug'])):
    x = byslug[r['slug']]
    P.append(f"\n---\n\n## {STAR[r['rel']]} {r['slug']} — {r['cat_ru']}, {r['dur']}, {r['fmt']}\n")
    P.append(f"Автор: @{r['author']} · {r['url']} · пост: {r['post']} · видео: {r['mp4']}")
    P.append(f"Тех: {', '.join(r['tech'])}{' · промпт частичный' if r['partial'] else ''}")
    if r['summary']: P.append(f"Кратко: {r['summary']}")
    if r['seen']: P.append(f"Видно на кадрах: {r['seen']}")
    P.append('\n```text\n' + (x['prompt'] or '').replace('```', "'''") + '\n```')
open('kb/PROMPTY.md', 'w', encoding='utf-8').write('\n'.join(P))
print(open('kb/stats.md').read())
print(os.path.getsize('kb/KATALOG.md'), os.path.getsize('kb/PROMPTY.md'), os.path.getsize('kb/katalog.json'))
