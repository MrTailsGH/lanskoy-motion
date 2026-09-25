// sheet.js — контактный лист ролика прямо на странице TikTok / Instagram.
//
// Выполнять в консоли страницы ролика (Claude — через javascript_tool):
//     <весь этот файл>
//     await window.__sheet({})            // 30 кадров по всей длине
//     await window.__sheet({count: 20})   // другое число кадров
//
// Возвращает rect — область листа в координатах скриншота. Дальше один
// скриншот этой области. Ссылки на сами видео расширение не отдаёт, это его
// защита, её не обходить: кадры рисуются из видео на странице.
//
// Видео берётся то, что стоит в центре экрана. На TikTok на странице их два —
// следующее подгружается заранее, и «самое большое» может оказаться чужим.

window.__pick = () => {
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const vs = [...document.querySelectorAll('video')];
  const inView = vs.filter(v => {
    const r = v.getBoundingClientRect();
    return r.left < cx && r.right > cx && r.top < cy && r.bottom > cy;
  });
  return inView[0] || vs.find(v => !v.paused) || vs[0];
};

window.__sheet = async ({ count = 30, cols = 13, tw = 112, frameW = 1568 } = {}) => {
  const v = window.__pick();
  if (!v) return { err: 'no video' };
  v.muted = true; v.pause();
  const dur = v.duration;
  const step = Math.max(0.5, dur / count);
  const th = Math.round(tw * (v.videoHeight || 16) / (v.videoWidth || 9));
  const rows = Math.ceil(Math.min(count, Math.floor(dur / step) + 1) / cols);

  let c = document.getElementById('__cs');
  if (!c) { c = document.createElement('canvas'); c.id = '__cs'; document.documentElement.appendChild(c); }
  c.width = cols * tw; c.height = rows * (th + 14);
  const cssW = innerWidth - 8;
  Object.assign(c.style, {
    position: 'fixed', left: '0px', top: '0px', zIndex: 2147483647, background: '#111',
    display: 'block', width: cssW + 'px', height: Math.round(cssW * c.height / c.width) + 'px',
  });

  const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.font = '12px sans-serif';
  let drawn = 0;
  for (let k = 0; k < count; k++) {
    const t = k * step;
    if (t > dur - 0.05) break;
    const ok = await new Promise(r => {
      const to = setTimeout(() => r(false), 3000);
      v.onseeked = () => { clearTimeout(to); r(true); };
      v.currentTime = t;
    });
    await new Promise(r => setTimeout(r, 90));
    const x = (k % cols) * tw, y = Math.floor(k / cols) * (th + 14);
    try { g.drawImage(v, x, y, tw, th); drawn++; } catch (e) { /* кадр не отрисовался */ }
    g.fillStyle = ok ? '#ccc' : '#f55';          // красная метка — перемотка не дождалась кадра
    g.fillText(t.toFixed(1) + 'с', x + 3, y + th + 12);
  }
  const r = c.getBoundingClientRect();
  // frameW — ширина кадра скриншота ("coordinate frame" в ответе screenshot),
  // она зависит от окна браузера: встречались 1400, 1536, 1568.
  const k = frameW / innerWidth;
  return { dur: +dur.toFixed(1), step: +step.toFixed(2), drawn,
           rect: [0, 0, Math.round(r.width * k), Math.round(r.height * k)] };
};
