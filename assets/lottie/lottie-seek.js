/* lottie-seek.js — Lottie внутри сцены Ланского, кадр = чистая функция t.
 *
 * Сцена обязана быть функцией одного t (раздел 2 OPERATIONS.md), поэтому
 * анимации никогда не «играют»: autoplay выключен, кадр ставится руками
 * через goToAndStop на каждый window.seek(t). Один и тот же t всегда даёт
 * один и тот же кадр — рендер можно прервать и докатить.
 *
 *   const coin = LOT.make(el, 'coin-rub');          // el — контейнер с размерами
 *   // в seek(t):
 *   LOT.at(coin, t - t0);                            // проиграть один раз с t0
 *   LOT.at(coin, t - t0, {loop:true});               // по кругу
 *   LOT.at(coin, t - t0, {speed:1.5, from:0, to:0.6});  // кусок, доли длины
 *
 * До старта (t - t0 < 0) стоит первый кадр, после конца — последний.
 * Прозрачность, положение и масштаб контейнера — забота сцены, как у любого
 * другого элемента.
 *
 * ПЕРЕХОДЫ (файлы tr-*): пик закрытия экрана ставится ровно на смену акта.
 *
 *   const tr = LOT.cut(E_('',{left:0,top:0,width:'1080px',height:'1920px',zIndex:50}), 'tr-circle');
 *   // в seek(t):  LOT.cutAt(tr, t, swap(4));             // swap(i) — середина паузы после блока i
 *   //             LOT.cutAt(tr, t, swap(4), {speed:1.6}); // быстрее: пауза короткая
 *   LOT.span(tr, 1.6)  // -> [когда начнёт закрывать, когда откроет] относительно смены, в секундах
 *
 * Сцена меняет акт в ту же секунду swap(i) — под закрытым экраном склейки не
 * видно. Окно закрытия и режим (through / mirror) замерены lottie_cover.py и
 * лежат в самом файле: meta.lanskoy. Вне своего отрезка переход не рисуется.
 *
 * Данные лежат в window.LOTTIE[name]: их вписывает lottie_pack.py вместе с
 * самим плеером (полный lottie-web: эффекты Fill и Tint у переходов в облегчённой сборке не рисуются), так что сцена
 * остаётся одним самодостаточным файлом.
 */
window.LOT = (function () {
  function make(el, name, opts) {
    const data = window.LOTTIE && window.LOTTIE[name];
    if (!data) throw new Error('LOT: нет анимации ' + name + ' — проверь строку <!-- LOTTIE … --> и lottie_pack.py');
    // копия: lottie-web дописывает в объект служебные поля, а одна анимация
    // может стоять в сцене несколько раз
    const anim = lottie.loadAnimation({
      container: el, renderer: 'svg', loop: false, autoplay: false,
      animationData: JSON.parse(JSON.stringify(data)),
      rendererSettings: Object.assign({preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false}, opts || {})
    });
    return {anim, el, name, fr: data.fr, ip: data.ip, op: data.op, dur: (data.op - data.ip) / data.fr, last: null,
            meta: (data.meta && data.meta.lanskoy) || null};
  }

  /* ── переходы ─────────────────────────────────────────────────── */
  function cut(el, name) {
    const h = make(el, name, {preserveAspectRatio: 'xMidYMid slice'});
    if (!h.meta) throw new Error('LOT.cut: у ' + name + ' нет замера — python3 scout/lottie_cover.py ' + name + '.json --write');
    el.style.transform = 'scale(1.03)';        // запас за край: по краю у файлов бывает полоска в пиксель
    el.style.pointerEvents = 'none';
    return h;
  }

  function side(h) { return h.meta.peak > h.dur / 2 ? 1 : -1; }

  function span(h, speed) {
    const sp = speed || 1, m = h.meta, end = h.dur - 1 / h.fr;
    if (m.mode === 'through') return [-m.peak / sp, (end - m.peak) / sp];
    const r = (side(h) > 0 ? m.peak : end - m.peak) / sp;
    return [-r, r];
  }

  function cutAt(h, t, tSwap, o) {
    const sp = (o && o.speed) || 1, m = h.meta, dt = (t - tSwap) * sp, end = h.dur - 1 / h.fr;
    const sec = m.mode === 'through' ? m.peak + dt : m.peak - side(h) * Math.abs(dt);
    const on = sec >= 0 && sec <= end;
    h.el.style.visibility = on ? 'visible' : 'hidden';
    if (on) {
      const f = h.ip + sec * h.fr;
      if (h.last !== f) { h.anim.goToAndStop(f, true); h.last = f; }
    }
    return on;
  }

  function frameAt(h, lt, o) {
    o = o || {};
    const speed = o.speed || 1;
    const a = h.ip + (h.op - h.ip) * (o.from == null ? 0 : o.from);
    const b = h.ip + (h.op - h.ip) * (o.to == null ? 1 : o.to) - 1e-3;
    let f = a + Math.max(0, lt) * h.fr * speed;
    if (o.loop) {
      const len = b - a;
      f = a + (((f - a) % len) + len) % len;
    }
    return Math.min(b, Math.max(a, f));
  }

  function at(h, lt, o) {
    const f = frameAt(h, lt, o);
    if (h.last !== f) {          // тот же кадр не перерисовываем
      h.anim.goToAndStop(f, true);
      h.last = f;
    }
    return f;
  }

  return {make, at, frameAt, cut, cutAt, span};
})();
