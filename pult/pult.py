#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pult.py — пульт цеха. Локальная страница вместо командной строки.

    python3 pult/pult.py            запустить и открыть браузер
    python3 pult/pult.py --port 8765 --no-browser

Только стандартная библиотека: ничего ставить не надо, работает и на
Windows, и в контейнере. Браузер не выполняет команды — он выбирает
задачу из списка ниже, сервер сам собирает командную строку.
"""
import os, sys, re, json, time, signal, threading, subprocess, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
CEH  = os.path.dirname(HERE)                    # корень репозитория
LOGI = os.path.join(HERE, 'logi')
PY   = sys.executable or 'python3'
os.makedirs(LOGI, exist_ok=True)

# ── что умеет пульт ─────────────────────────────────────────────────────
# Каждая задача — готовая команда. Браузер присылает только имя задачи и
# проверенные параметры, произвольную строку выполнить нельзя.

ROLIKI = ['I-01','I-02','I-03','I-04','I-05','V-01','V-02','V-03','V-04','V-05']

def zadacha_radar(p):
    return [PY, 'radar.py', '--report', 'RADAR.md'], os.path.join(CEH, 'radar')

def proxy(p):
    """Прокси для yt-dlp. ВПН-расширение в браузере сюда не считается:
    оно закрывает только трафик браузера, а качает отдельный процесс.
    Годится адрес локального порта ВПН-приложения или прокси."""
    a = (p.get('proxy') or '').strip()
    if not a: return []
    if not re.match(r'^(socks5h?|http|https)://[\w.\-]+:\d{2,5}$', a):
        raise ValueError('прокси пишется так: socks5://127.0.0.1:1080')
    return ['--proxy', a]


def zadacha_snimok(p):
    top = max(1, min(20, int(p.get('top') or 5)))
    cmd = [PY, 'snimok.py', '--top', str(top)] + proxy(p)
    if p.get('push'): cmd.append('--push')
    return cmd, CEH

def zadacha_razbor(p):
    url = (p.get('url') or '').strip()
    if not re.match(r'^https://(www\.)?(youtube\.com|youtu\.be)/[\w\-/?=&.]+$', url):
        raise ValueError('ссылка не похожа на ютуб')
    cmd = [PY, 'snimok.py', '--url', url] + proxy(p)
    if p.get('push'): cmd.append('--push')
    return cmd, CEH

VHOD = os.path.join(CEH, 'vhod')


def fayly_vhoda():
    if not os.path.isdir(VHOD): return []
    return sorted(f for f in os.listdir(VHOD)
                  if f.lower().endswith(('.mp4', '.mov', '.mkv', '.webm')))


def zadacha_fayl(p):
    f = (p.get('fayl') or '').strip()
    if f not in fayly_vhoda():
        raise ValueError('нет такого файла в папке vhod')
    cmd = [PY, 'snimok.py', '--fayl', os.path.join('vhod', f)]
    if p.get('push'): cmd.append('--push')
    return cmd, CEH


def zadacha_obnovit(p):
    # --ff-only: если на машине кто-то правил файлы руками, обновление
    # честно откажется, а не устроит слияние с конфликтами за спиной.
    return ['git', 'pull', '--ff-only'], CEH


def zadacha_svodka(p):
    return [PY, 'svodka.py', 'Primeri', '--out', 'Primeri/SVODKA.md'], CEH

def _rolik(p):
    r = (p.get('rolik') or '').strip()
    if r not in ROLIKI: raise ValueError('неизвестный ролик ' + r)
    return r

def zadacha_vyravnivanie(p):
    r = _rolik(p)
    return [PY, 'align.py', f'voice/{r}.mp3', f'text-{r}.txt', f'timing-{r}.json'], CEH

def zadacha_sborka(p):
    r = _rolik(p)
    return ['bash', 'build.sh', 'i' + r.split('-')[1]], CEH

def zadacha_zvuk(p):
    r = _rolik(p)
    return [PY, 'mixsfx.py', f'out/{r}.mp4', f'out/{r}_sfx.mp4'], CEH

ZADACHI = {
    'radar':        dict(имя='Радар трендов',        делает=zadacha_radar,
                         зачем='Обойти каналы ниши и пересчитать прирост, скорость, индекс.'),
    'snimok':       dict(имя='Снимок чужих роликов', делает=zadacha_snimok,
                         зачем='Скачать верхушку радара, замерить и удалить видео.'),
    'razbor':       dict(имя='Разбор по ссылке',     делает=zadacha_razbor,
                         зачем='Один конкретный ролик: склейки, переходы, звук, темп.'),
    'fayl':         dict(имя='Разобрать свой файл',   делает=zadacha_fayl,
                         зачем='Ролик уже скачан и лежит в папке vhod — измерить его.'),
    'obnovit':      dict(имя='Обновить из GitHub',   делает=zadacha_obnovit,
                         зачем='Забрать свежие сцены, скрипты и сам пульт.'),
    'svodka':       dict(имя='Пересобрать сводку',   делает=zadacha_svodka,
                         зачем='Собрать все замеры Primeri в одну таблицу.'),
    'vyravnivanie': dict(имя='Выравнивание дорожки', делает=zadacha_vyravnivanie,
                         зачем='Пословные тайминги из mp3 и текста озвучки.'),
    'sborka':       dict(имя='Собрать ролик',        делает=zadacha_sborka,
                         зачем='Сцена плюс дорожка на выходе MP4. Долго.'),
    'zvuk':         dict(имя='Свести звук',          делает=zadacha_zvuk,
                         зачем='Подложить шумы по ролям и прижать пики.'),
}

# ── запущенное ──────────────────────────────────────────────────────────
RABOTA = {}          # id задачи -> состояние
ZAMOK  = threading.Lock()

def zapustit(zid, param):
    with ZAMOK:
        r = RABOTA.get(zid)
        if r and r['proc'].poll() is None:
            raise ValueError('уже выполняется')
        cmd, cwd = ZADACHI[zid]['делает'](param)
        log = os.path.join(LOGI, f'{zid}.log')
        f = open(log, 'wb')
        f.write(('$ ' + ' '.join(cmd) + '\n\n').encode('utf-8')); f.flush()
        sreda = dict(os.environ, PYTHONUNBUFFERED='1', PYTHONIOENCODING='utf-8')
        kw = {}
        if os.name == 'nt': kw['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
        else: kw['start_new_session'] = True
        proc = subprocess.Popen(cmd, cwd=cwd, stdout=f, stderr=subprocess.STDOUT,
                                env=sreda, **kw)
        RABOTA[zid] = dict(proc=proc, log=log, файл=f, начало=time.time(),
                           команда=' '.join(cmd))
        return RABOTA[zid]

def ostanovit(zid):
    r = RABOTA.get(zid)
    if not r or r['proc'].poll() is not None: return False
    if os.name == 'nt':
        r['proc'].send_signal(signal.CTRL_BREAK_EVENT); time.sleep(1)
        if r['proc'].poll() is None: r['proc'].kill()
    else:
        try: os.killpg(os.getpgid(r['proc'].pid), signal.SIGTERM)
        except Exception: r['proc'].kill()
    return True

def sostoyanie_zadach():
    out = {}
    for zid, z in ZADACHI.items():
        r = RABOTA.get(zid)
        if not r:
            out[zid] = dict(статус='ждёт')
            continue
        rc = r['proc'].poll()
        out[zid] = dict(
            статус='идёт' if rc is None else ('готово' if rc == 0 else 'ошибка'),
            код=rc, секунд=round(time.time() - r['начало']), команда=r['команда'])
    return out

# ── что лежит на диске ──────────────────────────────────────────────────
def est(p):  return os.path.exists(os.path.join(CEH, p))
def kogda(p):
    f = os.path.join(CEH, p)
    return round(os.path.getmtime(f)) if os.path.exists(f) else None
def razmer(p):
    f = os.path.join(CEH, p)
    return os.path.getsize(f) if os.path.exists(f) else 0

def sostoyanie_rolikov():
    ряд = []
    for r in ROLIKI:
        n = r.split('-')[1]
        сцена = f'i{n}.html' if r.startswith('I') else None
        шаги = [
            ('текст',   est(f'text-{r}.txt')),
            ('дорожка', est(f'voice/{r}.mp3')),
            ('тайминги',est(f'timing-{r}.json')),
            ('сцена',   bool(сцена) and est(сцена)),
            ('ролик',   est(f'out/{r}.mp4')),
            ('звук',    est(f'out/{r}_sfx.mp4')),
        ]
        ряд.append(dict(имя=r, шаги=[dict(имя=a, есть=b) for a, b in шаги],
                        готов=sum(1 for _, b in шаги if b),
                        видео=(f'out/{r}_sfx.mp4' if est(f'out/{r}_sfx.mp4')
                               else f'out/{r}.mp4' if est(f'out/{r}.mp4') else None),
                        когда=kogda(f'out/{r}.mp4')))
    return ряд

def git(*а):
    try:
        r = subprocess.run(['git', '-C', CEH] + list(а), capture_output=True,
                           timeout=15)
        return r.stdout.decode('utf-8', 'replace').strip() if r.returncode == 0 else ''
    except Exception:
        return ''


СВОЙ_ВОЗРАСТ = {}


def versiya():
    """Что за сборка сейчас на машине и не устарел ли сам пульт.

    Сервер читает pult.py один раз при запуске: после обновления он
    продолжает работать по старому коду, пока его не перезапустят. Молча
    это не оставляем — страница должна сказать об этом прямо."""
    if not СВОЙ_ВОЗРАСТ:
        for ф in ('pult/pult.py', 'pult/index.html'):
            СВОЙ_ВОЗРАСТ[ф] = kogda(ф)
    устарел = any(kogda(ф) != т for ф, т in СВОЙ_ВОЗРАСТ.items())
    return dict(коммит=git('rev-parse', '--short', 'HEAD'),
                полный=git('rev-parse', 'HEAD'),
                ветка=git('rev-parse', '--abbrev-ref', 'HEAD'),
                когда=git('log', '-1', '--format=%cI'),
                заголовок=git('log', '-1', '--format=%s'),
                правлено=bool(git('status', '--porcelain')),
                устарел=устарел)


def sostoyanie_radara():
    h = os.path.join(CEH, 'radar', 'history.json')
    снимков = 0; каналов = 0
    try:
        d = json.load(open(h, encoding='utf-8'))
        снимков = len(d['snapshots']) if isinstance(d, dict) and 'snapshots' in d \
                  else (len(d) if isinstance(d, list) else len(d))
    except Exception: pass
    try:
        каналов = len(json.load(open(os.path.join(CEH,'radar','channels.json'), encoding='utf-8')))
    except Exception: pass
    return dict(отчёт=kogda('radar/RADAR.md'), снимков=снимков, каналов=каналов)

def korotko(м):
    """Из metrics.json — только то, что влезает в карточку."""
    дв = м.get('движение') or {}; зв = м.get('звук') or {}
    др = м.get('дрейф') or {}; сб = м.get('субтитры') or {}
    пер = м.get('переходы') or []
    расфокус = None
    if пер:
        зн = [п.get('расфокус_во_сколько_раз') for п in пер
              if isinstance(п, dict) and п.get('расфокус_во_сколько_раз')]
        расфокус = round(sum(зн)/len(зн), 1) if зн else None
    сек = др.get('за_секунд') or 1
    return {
        'длина, с':        м.get('длина'),
        'склеек':          len(м.get('склейки') or []),
        'покой':           (f"{round(дв.get('доля_покоя',0)*100)}%"
                            if дв.get('доля_покоя') is not None else None),
        'событий картинки':дв.get('событий'),
        'громкость LUFS':  зв.get('громкость_LUFS'),
        'звука в минуту':  зв.get('звуковых_событий_в_минуту'),
        'тишина':          (f"{round(зв.get('доля_тишины',0)*100)}%"
                            if зв.get('доля_тишины') is not None else None),
        'дрейф px/с':      (round((др.get('смещение_px') or 0)/сек, 1)
                            if др.get('смещение_px') is not None else None),
        'переходов':       len(пер) or None,
        'расфокус, раз':   расфокус,
        'темп, слов/мин':  сб.get('слов_в_минуту') or сб.get('темп'),
    }


def sostoyanie_primeri():
    корень = os.path.join(CEH, 'Primeri')
    папки = []
    if os.path.isdir(корень):
        for d in sorted(os.listdir(корень)):
            m = os.path.join(корень, d, 'metrics.json')
            if os.path.exists(m):
                try: чис = korotko(json.load(open(m, encoding='utf-8')))
                except Exception: чис = {}
                кадры = os.path.join(корень, d, 'kadry')
                п = sorted(os.listdir(кадры))[:1] if os.path.isdir(кадры) else []
                папки.append(dict(имя=d, числа=чис,
                                  кадр=f'Primeri/{d}/kadry/{п[0]}' if п else None))
    return папки

def instrumenty():
    def есть(имя):
        from shutil import which
        return bool(which(имя))
    return dict(ffmpeg=есть('ffmpeg'), bash=есть('bash'), node=есть('node'),
                ytdlp=есть('yt-dlp') or _modul('yt_dlp'), playwright=_modul('playwright'))

def _modul(m):
    try:
        subprocess.run([PY, '-c', 'import ' + m], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
        return True
    except Exception:
        return False

ИНСТР = {}
def instrumenty_kesh():
    if not ИНСТР: ИНСТР.update(instrumenty())
    return ИНСТР

def tekst(p, predel=200000):
    f = os.path.join(CEH, p)
    if not os.path.exists(f): return ''
    return open(f, encoding='utf-8', errors='replace').read()[:predel]

# ── сервер ──────────────────────────────────────────────────────────────
TIPY = {'.mp4':'video/mp4', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
        '.png':'image/png', '.md':'text/plain; charset=utf-8',
        '.json':'application/json; charset=utf-8', '.html':'text/html; charset=utf-8',
        '.mp3':'audio/mpeg', '.vtt':'text/vtt; charset=utf-8',
        '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8'}

class Pult(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *a): pass

    def otvet(self, код, тип, тело, заг=None):
        if isinstance(тело, str): тело = тело.encode('utf-8')
        self.send_response(код)
        self.send_header('Content-Type', тип)
        self.send_header('Content-Length', str(len(тело)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in (заг or {}).items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(тело)

    def json_otvet(self, d, код=200):
        self.otvet(код, 'application/json; charset=utf-8',
                   json.dumps(d, ensure_ascii=False))

    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path in ('/', '/index.html'):
                return self.otvet(200, 'text/html; charset=utf-8',
                                  open(os.path.join(HERE,'index.html'),'rb').read())
            if u.path == '/api/sostoyanie':
                return self.json_otvet(dict(
                    цех=CEH, ролики=sostoyanie_rolikov(), радар=sostoyanie_radara(),
                    primeri=sostoyanie_primeri(), задачи=sostoyanie_zadach(),
                    вход=fayly_vhoda(), версия=versiya(),
                    инструменты=instrumenty_kesh(),
                    список={k: dict(имя=v['имя'], зачем=v['зачем']) for k, v in ZADACHI.items()}))
            if u.path == '/api/log':
                zid = q.get('id',[''])[0]
                if zid not in ZADACHI: return self.json_otvet({'ошибка':'нет такой задачи'}, 404)
                путь = os.path.join(LOGI, zid + '.log')
                от = int(q.get('ot',['0'])[0])
                if not os.path.exists(путь): return self.json_otvet(dict(текст='', конец=0))
                with open(путь,'rb') as f:
                    f.seek(min(от, os.path.getsize(путь)))
                    кусок = f.read()
                return self.json_otvet(dict(текст=кусок.decode('utf-8','replace'),
                                            конец=от+len(кусок)))
            if u.path == '/api/tekst':
                return self.json_otvet(dict(текст=tekst(self._put(q.get('p',[''])[0]))))
            if u.path.startswith('/fayl/'):
                п = self._put(u.path[len('/fayl/'):])
                ф = os.path.join(CEH, п)
                if not os.path.exists(ф): return self.otvet(404, 'text/plain', 'нет файла')
                тип = TIPY.get(os.path.splitext(ф)[1].lower(), 'application/octet-stream')
                return self._otdat_fayl(ф, тип)
            return self.otvet(404, 'text/plain; charset=utf-8', 'нет такой страницы')
        except Exception as e:
            return self.json_otvet({'ошибка': str(e)}, 500)

    def do_POST(self):
        u = urlparse(self.path)
        длина = int(self.headers.get('Content-Length') or 0)
        тело = json.loads(self.rfile.read(длина) or b'{}')
        try:
            if u.path == '/api/pusk':
                zid = тело.get('id')
                if zid not in ZADACHI: return self.json_otvet({'ошибка':'нет такой задачи'}, 400)
                zapustit(zid, тело.get('параметры') or {})
                return self.json_otvet(dict(ладно=True))
            if u.path == '/api/stop':
                return self.json_otvet(dict(остановлено=ostanovit(тело.get('id'))))
            return self.json_otvet({'ошибка':'нет такой ручки'}, 404)
        except Exception as e:
            return self.json_otvet({'ошибка': str(e)}, 400)

    def _put(self, п):
        п = п.replace('\\','/').lstrip('/')
        полный = os.path.normpath(os.path.join(CEH, п))
        if not полный.startswith(CEH + os.sep):
            raise ValueError('путь за пределами цеха')
        return os.path.relpath(полный, CEH)

    def _otdat_fayl(self, ф, тип):
        # Кусками: видео в браузере перематывается запросом Range.
        всего = os.path.getsize(ф)
        диап = self.headers.get('Range')
        if диап and диап.startswith('bytes='):
            а, _, б = диап[6:].partition('-')
            а = int(а or 0); б = int(б) if б else всего - 1
            б = min(б, всего - 1)
            self.send_response(206)
            self.send_header('Content-Type', тип)
            self.send_header('Content-Range', f'bytes {а}-{б}/{всего}')
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Length', str(б - а + 1))
            self.end_headers()
            with open(ф,'rb') as f:
                f.seek(а); осталось = б - а + 1
                while осталось > 0:
                    к = f.read(min(262144, осталось))
                    if not к: break
                    self.wfile.write(к); осталось -= len(к)
            return
        self.send_response(200)
        self.send_header('Content-Type', тип)
        self.send_header('Content-Length', str(всего))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        with open(ф,'rb') as f:
            while True:
                к = f.read(262144)
                if not к: break
                self.wfile.write(к)


def main():
    порт = 8765
    if '--port' in sys.argv: порт = int(sys.argv[sys.argv.index('--port')+1])
    адрес = f'http://127.0.0.1:{порт}/'
    сервер = ThreadingHTTPServer(('127.0.0.1', порт), Pult)
    print('Пульт цеха:', адрес)
    print('Цех:', CEH)
    print('Закрыть — Ctrl+C в этом окне.')
    if '--no-browser' not in sys.argv:
        threading.Timer(1.0, lambda: webbrowser.open(адрес)).start()
    try:
        сервер.serve_forever()
    except KeyboardInterrupt:
        print('\nпульт остановлен')


if __name__ == '__main__':
    main()
