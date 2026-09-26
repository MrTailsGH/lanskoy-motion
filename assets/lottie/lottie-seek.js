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
 * Данные лежат в window.LOTTIE[name]: их вписывает lottie_pack.py вместе с
 * самим плеером (lottie_light — только SVG, без выражений), так что сцена
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
    return {anim, name, fr: data.fr, ip: data.ip, op: data.op, dur: (data.op - data.ip) / data.fr, last: null};
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

  return {make, at, frameAt};
})();
