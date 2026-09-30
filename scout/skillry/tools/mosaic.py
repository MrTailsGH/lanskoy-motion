"""Листы по 16 лент: python3 mosaic.py "Motion graphics,Explainers" → mos/MotiExpl_00.jpg …"""
import json,os,math,sys
from PIL import Image,ImageDraw,ImageFont
d=json.load(open('items.json'))
cats=sys.argv[1].split(',')
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13) if os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf') else ImageFont.load_default()
rows=[]
for r in d:
    if r['category'] not in cats: continue
    j=f"frames/{r['slug']}.json"; im=f"frames/{r['slug']}.jpg"
    if not (os.path.exists(j) and os.path.exists(im)): continue
    m=json.load(open(j)); rows.append((r,m,im))
rows.sort(key=lambda x:x[0]['slug'])
H=96; LAB=250; W=1500; PER=16
os.makedirs('mos',exist_ok=True)
for pi in range(math.ceil(len(rows)/PER)):
    part=rows[pi*PER:(pi+1)*PER]
    img=Image.new('RGB',(W,len(part)*(H+6)),(18,18,18)); dr=ImageDraw.Draw(img)
    for i,(r,m,im) in enumerate(part):
        y=i*(H+6)
        s=Image.open(im); s=s.resize((int(s.width*H/s.height),H))
        if s.width>W-LAB: s=s.resize((W-LAB,int(H*(W-LAB)/s.width)))
        img.paste(s,(LAB,y))
        lab=f"{pi*PER+i:03d} {r['slug'][:30]}\n{r['category'][:6]} {m['dur']}s {m['w']}x{m['h']}\ncuts {m['cuts']} still {m['still']:.0%}\n{','.join(r['tech'])[:34]}"
        dr.multiline_text((4,y+4),lab,font=F,fill=(230,230,150),spacing=2)
    tag="".join(c[:4] for c in cats).replace(" ","")
    img.save(f"mos/{tag}_{pi:02d}.jpg",quality=78)
print(len(rows), math.ceil(len(rows)/PER))
