# Тест №5 «Неон-рубль» — рендер дома

Сцена в настоящем 3D (three.js, WebGL2): `kiber.html` + `kiber.js` +
`vendor/three-bundle.js`. В облачном контейнере видеокарты нет, кадр
считается программно (SwiftShader) за 2–3 секунды: 10-секундный тизер —
около 10 минут, полный ролик на 120 с — несколько часов. Дома с видеокартой —
минуты.

## Один раз

```
pip install playwright numpy pillow
playwright install chromium
```

ffmpeg должен быть в PATH (тот же, что для остальных роликов цеха).

## Проверить, что взялась видеокарта

```
python kiber/render_doma.py --check
```

В строке «видеокарта» должно быть имя карты (NVIDIA / AMD / Intel …).
Если там **SwiftShader** — Chrome не подхватил GPU. Тогда:

1. `python kiber/render_doma.py --check --channel chrome` — взять обычный
   установленный Google Chrome вместо встроенного Chromium;
2. обновить драйвер видеокарты;
3. на ноутбуке с двумя картами — в панели NVIDIA/AMD назначить python.exe
   высокопроизводительную карту.

## Рендер

```
python kiber/render_doma.py --cut teaser      # 10 с, звук соберётся сам
python kiber/render_doma.py                   # полный, 120 с
python kiber/render_doma.py --workers 2       # два окна, если карта тянет
```

Кадры — `kiber/kadry/<cut>/`, готовые пропускаются: можно прервать и
продолжить. Итог — `kiber/NEON_<cut>_9x16.mp4`.

Для полного ролика звука пока нет — `--audio путь.wav`, когда саундтрек
будет готов. Без него соберётся немое видео.

## Если что-то не так

- Сцена не стартует (ждёт `READY` больше 10 минут) — открыть
  `kiber/kiber.html` в Chrome, F12 → Console: там будет ошибка.
- Кадры чёрные — в `--check` SwiftShader или WebGL2 нет совсем, см. выше.
