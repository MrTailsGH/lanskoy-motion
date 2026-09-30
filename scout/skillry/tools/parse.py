"""Разбирает items/*.html → items.json: промпт, пометка «часть промпта», технологии, длительности, пост, медиа."""
import re, json, glob, os, html
from bs4 import BeautifulSoup
out=[]
for p in sorted(glob.glob('items/*.html')):
    slug=os.path.basename(p)[:-5]
    h=open(p,encoding='utf-8').read(); soup=BeautifulSoup(h,'html.parser')
    r={'slug':slug}
    t=soup.title.text if soup.title else ''
    m=re.search(r'@(\S+)',t); r['author']=m.group(1) if m else ''
    main=soup.find('main') or soup
    # prompt
    pre=None
    btn=[b for b in main.find_all('button') if 'Copy prompt' in b.get_text()]
    if btn:
        pre=btn[0].find_next('pre')
        note=btn[0].find_next('p')
        r['prompt_note']=note.get_text(' ',strip=True) if note else ''
    r['prompt']=pre.get_text('\n',strip=False).strip() if pre else ''
    # tech tags: li after pre
    tags=[]
    if pre:
        ul=pre.find_next('ul')
        if ul: tags=[li.get_text(' ',strip=True) for li in ul.find_all('li')]
    r['tech']=tags
    # category: first span with tabler icon before "Play both"
    cat=''
    for sp in main.find_all('span'):
        tx=sp.get_text(strip=True)
        if tx in ('Explainers','Motion','3D','Interactive','Motion graphics','3D & WebGL') or (sp.find('svg') and len(tx)<25 and 'class' in sp.attrs and 'rounded-full' in ' '.join(sp.get('class',[]))):
            cat=tx; break
    r['category']=cat
    # durations
    txt=main.get_text('\n',strip=True)
    d=re.findall(r'\n(\d+:\d\d)\n',txt)
    r['dur_original']=d[0] if d else ''; r['dur_remake']=d[1] if len(d)>1 else ''
    # original post link
    a=[x for x in main.find_all('a') if 'View original post' in x.get_text()]
    r['post_url']=a[0].get('href') if a else ''
    # skills recommended
    sk=[]
    for a in main.find_all('a',href=True):
        if a['href'].startswith('/skills/') and a['href'].count('/')==2:
            nm=a.get_text(' ',strip=True)
            sk.append({'href':a['href'],'text':nm[:160]})
    seen=set(); r['skills']=[s for s in sk if not (s['href'] in seen or seen.add(s['href']))]
    media=sorted(set(re.findall(rf'https://media\.skillry\.dev/opus-5-5/{re.escape(slug)}/[^"\' )&]+',h)))
    r['media']=media
    # own caption: find in other pages later; description meta
    md=soup.find('meta',attrs={'name':'description'}); r['meta_desc']=md['content'] if md else ''
    out.append(r)
# captions from cards on all pages: card anchor -> caption text
cap={}
for p in glob.glob('items/*.html')+['page.html']:
    soup=BeautifulSoup(open(p,encoding='utf-8').read(),'html.parser')
    for a in soup.find_all('a',href=True):
        m=re.fullmatch(r'/ai-videos/opus-5-5/([a-z0-9-]+)',a['href'])
        if m:
            tx=a.get_text('\n',strip=True)
            if len(tx)>len(cap.get(m.group(1),'')): cap[m.group(1)]=tx
for r in out: r['card']=cap.get(r['slug'],'')
json.dump(out,open('items.json','w'),ensure_ascii=False,indent=1)
import collections
print(len(out), collections.Counter(r['category'] for r in out).most_common(10))
print('prompt empty',sum(1 for r in out if not r['prompt']), 'notes',collections.Counter(r.get('prompt_note','')[:60] for r in out).most_common(5))
print(collections.Counter(t for r in out for t in r['tech']).most_common(30))
print('no card',sum(1 for r in out if not r['card']))
