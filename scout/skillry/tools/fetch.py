"""Качает страницы записей из slugs.txt в items/ (3 потока, пауза 0,4 с)."""
import urllib.request, time, os, concurrent.futures as cf
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128 Safari/537.36"}
slugs=open('slugs.txt').read().split()
def get(s):
    p=f'items/{s}.html'
    if os.path.exists(p) and os.path.getsize(p)>10000: return s,'cached'
    for a in range(3):
        try:
            d=urllib.request.urlopen(urllib.request.Request(f'https://skillry.dev/ai-videos/opus-5-5/{s}',headers=UA),timeout=40).read()
            open(p,'wb').write(d); time.sleep(0.4); return s,len(d)
        except Exception as e: err=e; time.sleep(3)
    return s,'ERR '+str(err)
with cf.ThreadPoolExecutor(3) as ex:
    res=list(ex.map(get,slugs))
bad=[r for r in res if str(r[1]).startswith('ERR')]
print(len(res),'bad',len(bad),bad[:5])
