"""Лента из 8 кадров и замер склеек/покоя по original.mp4 каждой записи (items.json → frames/)."""
import json,os,subprocess,urllib.request,concurrent.futures as cf,numpy as np,tempfile,shutil
from PIL import Image
d=json.load(open('items.json'))
os.makedirs('frames',exist_ok=True)
UA={"User-Agent":"Mozilla/5.0"}
def probe(p):
    o=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate:format=duration','-of','json',p],capture_output=True,text=True).stdout
    j=json.loads(o); s=j['streams'][0]; n,dn=s['r_frame_rate'].split('/')
    return s['width'],s['height'],round(int(n)/int(dn),2),float(j['format']['duration'])
def work(r):
    slug=r['slug']; outj=f'frames/{slug}.json'
    if os.path.exists(outj): return slug,'cached'
    url=[m for m in r['media'] if m.endswith('/original.mp4')]
    if not url: return slug,'nourl'
    tmp=tempfile.mkdtemp(); p=os.path.join(tmp,'v.mp4')
    try:
        open(p,'wb').write(urllib.request.urlopen(urllib.request.Request(url[0],headers=UA),timeout=90).read())
        w,h,fps,dur=probe(p)
        # 8 frames evenly
        N=8; tiles=[]
        for k in range(N):
            t=dur*(k+0.5)/N
            fp=os.path.join(tmp,f'f{k}.jpg')
            subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.3f}','-i',p,'-frames:v','1','-vf','scale=-2:200','-y',fp])
            if os.path.exists(fp): tiles.append(Image.open(fp).convert('RGB'))
        if tiles:
            W=sum(t.width for t in tiles); strip=Image.new('RGB',(W,200))
            x=0
            for t in tiles: strip.paste(t,(x,0)); x+=t.width
            strip.save(f'frames/{slug}.jpg',quality=80)
        # motion: grayscale 10fps small
        raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-vf','fps=10,scale=64:-2,format=gray','-f','rawvideo','-'],capture_output=True).stdout
        hh=int(round(64*h/w/2)*2); n=len(raw)//(64*hh)
        a=np.frombuffer(raw[:n*64*hh],np.uint8).reshape(n,hh,64).astype(np.int16)
        diff=np.abs(np.diff(a,axis=0)).mean(axis=(1,2)) if n>1 else np.array([0])
        cuts=int((diff>40).sum()); still=float((diff<1.5).mean())
        json.dump({'w':w,'h':h,'fps':fps,'dur':round(dur,2),'cuts':cuts,'still':round(still,3),'motion_med':round(float(np.median(diff)),2)},open(outj,'w'))
        return slug,'ok'
    except Exception as e:
        return slug,'ERR '+str(e)[:80]
    finally: shutil.rmtree(tmp,ignore_errors=True)
order=sorted(d,key=lambda r:{'Motion graphics':0,'Explainers':1,'3D scenes':2,'Games':3}[r['category']])
with cf.ThreadPoolExecutor(4) as ex:
    res=list(ex.map(work,order))
print(sum(1 for r in res if r[1] in('ok','cached')), [r for r in res if r[1] not in('ok','cached')][:10])
