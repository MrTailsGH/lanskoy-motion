/* perehody.js — переходы между актами в теме канала: деньги, графики, приложение.
 *
 * Требование пользователя (26.09.2026): переходы ПЛАВНЫЕ и В ТЕМУ.
 * Поэтому здесь не абстрактные шторки, а предметы ролика:
 *
 *   coin    монета с ₽ летит в камеру, экран проходит сквозь неё (PRIYOMY №33)
 *   bars    три столбика графика вырастают на весь экран и уходят вверх
 *   graph   экран заливает область под растущей линией графика
 *   swipe   карточка приложения уезжает влево, следующая приходит справа
 *
 * Всё — чистая функция t, как вся сцена. Смена акта в сцене — ровно в
 * tSwap: у coin, bars и graph в этот момент экран закрыт целиком, у swipe
 * оба акта видны и едут вместе. Кривые — из PRIYOMY.md, часть 5.
 *
 *   const tr = PER.bars(st);                  // st — сцена 1080×1920
 *   // в seek(t):   tr.at(t, swap(4));
 *   tr.span                                   // [начало, конец] относительно tSwap, с
 *
 *   const sw = PER.swipe(actA, actB);         // два элемента-акта
 *   // в seek(t):   sw.at(t, swap(2));        // true, пока едут — оба акта видимы
 *
 * Проверено замером: закрытие 100% в кадре смены, самый резкий кадр — см.
 * assets/lottie/README.md, раздел «Переходы».
 */
window.PER = (function () {
  const W = 1080, H = 1920, DIAG = Math.hypot(W, H);
  const C = {green: '#2FD38E', green2: '#1E8F5E', teal: '#3FB7C9', ink: '#FFFFFF', c1: '#18201E', c3: '#38433F', bg: '#0A0D0C'};

  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return p => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let t = p; for (let i = 0; i < 8; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - p) / d; }
      return Y(Math.min(1, Math.max(0, t)));
    };
  }
  const inOut = bez(0.78, 0, 0.22, 1);     // сильный in-out — столбики
  const easy = bez(0.33, 0, 0.67, 1);      // AE easy ease
  const land = bez(0.33, 0, 0, 1);         // резкий старт, мягкая посадка
  const soft = bez(0.45, 0, 0.2, 1);       // мягкий разгон, долгая посадка — свайп
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, d) => clamp((t - a) / d);

  function layer(parent, z) {
    const e = document.createElement('div');
    Object.assign(e.style, {position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px',
      overflow: 'hidden', pointerEvents: 'none', zIndex: z || 50, visibility: 'hidden'});
    parent.appendChild(e);
    return e;
  }

  /* ── монета-пролёт ────────────────────────────────────────────────
     Масштаб растёт по логарифмической шкале: s = s0·(S/s0)^p — глаз видит
     ровную скорость наезда. Линейный зум в конце «прыгает», гипербола
     (честная перспектива) даёт рывок на последних кадрах — замер 37%
     пикселей за кадр; логарифм одной кривой через смену — ровно.
     В кадре смены монета больше диагонали экрана; дальше она проходит
     «сквозь» камеру и растворяется за 0,6 с поверх нового акта. */
  function coin(parent, o) {
    o = o || {};
    const A = o.approach || 0.9, P = o.pass || 0.6;
    const el = layer(parent);
    const box = document.createElement('div');
    const B = 520;                                   // монета занимает 41,7% своего холста (замер)
    Object.assign(box.style, {position: 'absolute', width: B + 'px', height: B + 'px',
      left: (W - B) / 2 + 'px', top: (H - B) / 2 + 'px', transformOrigin: '50% 50%'});
    el.appendChild(box);
    const h = LOT.make(box, 'coin-rub');
    const S = DIAG * 1.08 / (0.4167 * B);          // в кадре смены монета больше диагонали экрана
    // логарифм масштаба идёт по одной кривой от старта до конца пролёта;
    // старт подбирается так, чтобы в tSwap масштаб был ровно S
    const lsZ = Math.log(S * 4), u0 = easy(A / (A + P));
    const lsA = (Math.log(S) - u0 * lsZ) / (1 - u0);
    return {
      el, span: [-A, P],
      at(t, tSwap) {
        const dt = t - tSwap;
        const on = dt >= -A && dt <= P;
        el.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return false;
        // один непрерывный наезд через весь отрезок: скорость в кадре смены не рвётся
        const u = easy(prog(dt, -A, A + P));
        const s = Math.exp(lsA + (lsZ - lsA) * u);
        const op = dt <= 0 ? prog(dt, -A, 0.12) : 1 - easy(prog(dt, 0, P));
        LOT.at(h, dt <= 0 ? (dt + A) * 3.2 : 99);    // подброшена: докручивается, пока маленькая, в камеру летит лицом
        box.style.transform = `scale(${s})`;
        box.style.opacity = op;
        return true;
      }
    };
  }

  /* ── столбики ─────────────────────────────────────────────────────
     Три колонки по трети экрана растут снизу каскадом (шаг 0,07 с — как
     каскад столбиков в PRIYOMY №34), к смене закрывают всё, затем тем же
     каскадом уходят вверх: новый акт открывается снизу. */
  function bars(parent, o) {
    o = o || {};
    const R = o.rise || 0.48, STEP = 0.07, cols = [C.c3, C.teal, C.green];
    const el = layer(parent);
    const bs = cols.map((c, k) => {
      const b = document.createElement('div');
      Object.assign(b.style, {position: 'absolute', left: (k * W / 3 - 1) + 'px', width: (W / 3 + 2) + 'px',
        top: 0, height: (H + 80) + 'px', background: c, borderRadius: '40px 40px 0 0', transformOrigin: '50% 100%'});
      el.appendChild(b);
      return b;
    });
    const span = [-(R + 2 * STEP), R + 2 * STEP];
    return {
      el, span,
      at(t, tSwap) {
        const dt = t - tSwap;
        const on = dt >= span[0] && dt <= span[1];
        el.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return false;
        bs.forEach((b, k) => {
          if (dt <= 0) {
            const p = inOut(prog(dt, -(R + (2 - k) * STEP), R));     // левый стартует первым, все закрыты к 0
            b.style.transform = `translateY(${(1 - p) * (H + 80)}px)`;
          } else {
            const p = inOut(prog(dt, k * STEP, R));
            b.style.transform = `translateY(${-p * (H + 120)}px)`;
          }
        });
        return true;
      }
    };
  }

  /* ── график ───────────────────────────────────────────────────────
     Полоса с краем-графиком (линия растёт слева направо) поднимается снизу,
     закрывает экран и уходит вверх; нижний край — тот же график, поэтому
     новый акт открывается «из-под линии». Одно движение, без остановки. */
  function graph(parent, o) {
    o = o || {};
    const D = o.dur || 0.95, A = 300, M = 40, BH = H + 2 * A + 2 * M;
    const el = layer(parent);
    const pts = [0, .18, .12, .34, .28, .52, .46, .72, .64, .88, 1.0];   // рост с откатами
    const edge = (y0, dir) => pts.map((v, i) => `${(i / (pts.length - 1) * W).toFixed(1)},${(y0 + dir * (1 - v) * A).toFixed(1)}`);
    const top = edge(0, 1), bot = edge(BH - A, 1);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', BH); svg.setAttribute('viewBox', `0 0 ${W} ${BH}`);
    Object.assign(svg.style, {position: 'absolute', left: 0, top: 0, overflow: 'visible'});
    // полигон: верхний край — график, нижний — тот же график; заливка между ними
    svg.innerHTML =
      `<defs><linearGradient id="perG" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${C.green}"/><stop offset="1" stop-color="${C.green2}"/></linearGradient></defs>
       <polygon fill="url(#perG)" points="${top.join(' ')} ${bot.slice().reverse().join(' ')}"/>
       <polyline fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" points="${top.join(' ')}"/>`;
    el.appendChild(svg);
    const yFrom = H + 20, yTo = -BH - 20;           // целиком ниже экрана → целиком выше
    return {
      el, span: [-D / 2, D / 2],
      at(t, tSwap) {
        const dt = t - tSwap;
        const on = dt >= -D / 2 && dt <= D / 2;
        el.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return false;
        const p = easy(prog(dt, -D / 2, D));
        svg.style.transform = `translateY(${yFrom + (yTo - yFrom) * p}px)`;
        return true;
      }
    };
  }

  /* ── свайп карточки ───────────────────────────────────────────────
     Как push в iOS: новый акт приходит справа целиком, старый уезжает
     на треть и темнеет. Разгон и посадка мягкие — без рывка на старте. */
  function swipe(outEl, inEl, o) {
    o = o || {};
    const D = o.dur || 0.7;
    const shade = document.createElement('div');
    Object.assign(shade.style, {position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px',
      background: '#000', opacity: 0, pointerEvents: 'none'});
    outEl.appendChild(shade);
    return {
      span: [-D / 2, D / 2],
      at(t, tSwap) {
        const dt = t - tSwap;
        const p = soft(prog(dt, -D / 2, D));
        const on = dt >= -D / 2 && dt <= D / 2;
        if (!on) {
          outEl.style.transform = inEl.style.transform = '';
          inEl.style.boxShadow = ''; shade.style.opacity = 0;
          return false;
        }
        outEl.style.transform = `translateX(${-p * W * 0.32}px) scale(${1 - 0.04 * p})`;
        shade.style.opacity = 0.55 * p;
        inEl.style.transform = `translateX(${(1 - p) * W}px)`;
        inEl.style.boxShadow = '-30px 0 60px rgba(0,0,0,.45)';
        return true;
      }
    };
  }

  return {coin, bars, graph, swipe, bez};
})();
