# Промпты для горизонтали 16:9 · плиты и движение

Комплект к `PACK-01-long.md`. Всё готово к вставке: паспортный якорь уже внутри каждого промпта.

**Логика.** На пять семиминутных роликов нужно не сто промптов, а **двенадцать плит и восемь движений**. Плита — это стартовый кадр: генерируется один раз в Nano Banana Pro и дальше несколько раз прогоняется через Omni Flash с разным текстом движения. Чем меньше отдельных генераций лица, тем меньше дрейф — поэтому повторный прогон принятой плиты всегда лучше новой картинки.

**Потолок Omni Flash — 10 секунд.** Все движения написаны на `10 seconds`: генерировать по потолку, на монтаже обрезать до 8, снимая по секунде с начала и конца. Первый и последний кадры у генератора всегда слабее — там движение разгоняется и затухает.

---

## Как это собирается

| | Сколько | Где |
|---|---|---|
| Плит на один ролик | 4 | раздел «Двенадцать плит», берётся один сетап |
| Клипов на один ролик | 13 | раздел «Раскладка клипов» |
| Прогонов одной плиты | 3–4 | плита + разный текст движения |
| Уникальных текстов движения | 8 | раздел «Восемь движений» |

Порядок: сначала плиты → проверка дрейфа по трём меткам → только принятые плиты идут в движение.

**Проверка дрейфа перед движением.** Смотреть три метки: горизонтальный шрам над левой бровью, родинка на правой щеке ниже глаза, вертикальная складка между бровей (слабая в покое). Если хоть одна ушла — перегенерировать плиту. Дрейф не лечится монтажом, а после прогона через Omni Flash он только усиливается.

---

# Двенадцать плит

Три сетапа × четыре кадра. Каждый ролик берёт свой сетап целиком — смешивать сетапы внутри одного ролика нельзя, склейка будет читаться.

| Ролик | Сетап |
|---|---|
| Д-01 Настоящая цена сотрудника | **Б** · чёрная студия |
| Д-02 Цена, скидка и прибыль | **А** · кабинет |
| Д-03 Деньги, которых нет на счету | **Б** · чёрная студия |
| Д-04 Ваше время в рублях | **В** · окно |
| Д-05 Как вообще считать деньги | **А** · кабинет |

Настройки Nano Banana Pro: **16:9**, множитель **×4**, **5 референсов персонажа** из `lanskoy-core/references/set5`. Из четырёх вариантов берётся один, остальные в брак.

---

## Сетап А · кабинет

### А-1 · средний план в камеру

```
Same man as the reference images, unchanged facial structure: narrow face with pronounced
cheekbones, straight nose with a slight bridge bump, deep-set grey-green eyes with visible
crow's feet at the outer corners, dark ash-brown hair cut short with roughly twenty-five
percent grey at the temples, three-day stubble with a clean line along the cheek.
Keep every distinguishing mark of his face exactly as it appears in the reference images.

A 41-year-old man seated in a dark study. Behind him a bookshelf dissolved into deep bokeh.
Warm key light from the left at 45 degrees, faint teal rim light on his right side. Dark grey
fine-knit wool sweater, weave texture readable. He looks directly into the lens, calm and
businesslike, not smiling. Shot on 85mm at f/2.0, shallow depth of field, photographic
realism, natural skin texture with visible pores and fine lines, no beauty retouching, no
plastic smoothing.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is clean, uncluttered
background with nothing in it, reserved for on-screen numbers. Nothing important within five
percent of any edge.
```

### А-2 · средний план с жестом

Тот же паспортный якорь, дальше:

```
A 41-year-old man seated in a dark study, bookshelf behind him in deep bokeh, warm key light
from the left at 45 degrees, faint teal rim on his right side, dark grey fine-knit wool
sweater. His right hand is raised to chest height, palm open and turned slightly upward,
mid-gesture of listing something. The hand is nearer to camera and softly out of focus. His
eyes stay on the lens, expression explaining. Shot on 85mm at f/2.0, photographic realism,
natural skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is clean, uncluttered
background with nothing in it, reserved for on-screen numbers. Nothing important within five
percent of any edge.
```

### А-3 · крупный план

Тот же паспортный якорь, дальше:

```
Close-up of a 41-year-old man, head and shoulders, in a dark study. The bookshelf behind him
is now fully abstract bokeh. Warm key light from the left, teal rim on his right. Dark grey
fine-knit wool sweater. He looks straight into the lens, brows fractionally lowered, the look
of someone waiting for an answer. Catchlight visible in both eyes. Shot on 85mm at f/1.8,
very shallow depth of field, photographic realism, pronounced skin texture, no beauty
retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, his eyeline on the
upper third line. The LEFT half of the frame is clean, uncluttered background with nothing in
it, reserved for on-screen numbers. Nothing important within five percent of any edge.
```

### А-4 · средний план вполоборота

Тот же паспортный якорь, дальше:

```
A 41-year-old man seated in a dark study, bookshelf in deep bokeh, warm key light from the
left at 45 degrees, teal rim on his right, dark grey fine-knit wool sweater. His torso is
turned about twenty degrees away from the lens while his face stays toward camera, as if he
has just turned back to answer. Expression attentive. Shot on 85mm at f/2.0, photographic
realism, natural skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is clean, uncluttered
background with nothing in it, reserved for on-screen numbers. Nothing important within five
percent of any edge.
```

---

## Сетап Б · чёрная студия

### Б-1 · средний план в камеру

```
Same man as the reference images, unchanged facial structure: narrow face with pronounced
cheekbones, straight nose with a slight bridge bump, deep-set grey-green eyes with visible
crow's feet at the outer corners, dark ash-brown hair cut short with roughly twenty-five
percent grey at the temples, three-day stubble with a clean line along the cheek.
Keep every distinguishing mark of his face exactly as it appears in the reference images.

A 41-year-old man standing against a seamless black backdrop that falls to pure black at the
edges. A single hard key light from upper left at 45 degrees carves his cheekbone; a narrow
teal rim light runs along his far shoulder, separating him from the dark. Charcoal black
shirt, top button open, fabric texture visible. He looks directly into the lens, calm and
unhurried, not smiling and not stern. Shot on 85mm at f/2.8, photographic realism, natural
skin texture with visible pores, no beauty retouching, no plastic smoothing.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is pure black with
nothing in it, reserved for on-screen numbers. Nothing important within five percent of any
edge.
```

### Б-2 · средний план с жестом

Тот же паспортный якорь, дальше:

```
A 41-year-old man against a seamless black backdrop falling to pure black, single hard key
from upper left at 45 degrees, narrow teal rim along his far shoulder, charcoal black shirt
with the top button open. His right hand is raised to chest height with two fingers extended,
counting through a list. The hand is nearer to camera and softly out of focus. Eyes on the
lens, expression insistent but calm. Shot on 85mm at f/2.8, photographic realism, natural
skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is pure black with
nothing in it, reserved for on-screen numbers. Nothing important within five percent of any
edge.
```

### Б-3 · крупный план

Тот же паспортный якорь, дальше:

```
Close-up of a 41-year-old man, head and shoulders, against a seamless black backdrop. Hard
key light from upper left, teal rim along his far shoulder, charcoal black shirt. He looks
straight down the lens, jaw relaxed, the faintest tightening at the corner of the mouth —
certainty, not a smile. Catchlight visible in both eyes. Shot on 85mm at f/2.0, very shallow
depth of field, photographic realism, pronounced skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, his eyeline on the
upper third line. The LEFT half of the frame is pure black with nothing in it, reserved for
on-screen numbers. Nothing important within five percent of any edge.
```

### Б-4 · средний план вполоборота

Тот же паспортный якорь, дальше:

```
A 41-year-old man against a seamless black backdrop, single hard key from upper left, teal
rim along his far shoulder, charcoal black shirt. His torso is turned about twenty degrees
away from the lens while his face stays toward camera, head tilted a few degrees to one side,
the expression of someone adding up a list that keeps growing. Shot on 85mm at f/2.8,
photographic realism, natural skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is pure black with
nothing in it, reserved for on-screen numbers. Nothing important within five percent of any
edge.
```

---

## Сетап В · окно

### В-1 · средний план в камеру

```
Same man as the reference images, unchanged facial structure: narrow face with pronounced
cheekbones, straight nose with a slight bridge bump, deep-set grey-green eyes with visible
crow's feet at the outer corners, dark ash-brown hair cut short with roughly twenty-five
percent grey at the temples, three-day stubble with a clean line along the cheek.
Keep every distinguishing mark of his face exactly as it appears in the reference images.

A 41-year-old man standing beside a floor-to-ceiling window in early morning. The city
outside is thrown completely out of focus into soft grey-blue shapes. Cold daylight falls on
him from the front left; the far side of his face is left in shadow with no fill. Charcoal
blazer over a plain white t-shirt. He looks into the lens, expression sober and unhurried.
Shot on 85mm at f/2.0, shallow depth of field, photographic realism, natural skin texture,
visible pores and fine lines, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is the blurred window,
even and uncluttered, reserved for on-screen numbers. Nothing important within five percent
of any edge.
```

### В-2 · средний план с жестом

Тот же паспортный якорь, дальше:

```
A 41-year-old man beside a floor-to-ceiling window in early morning, the city outside fully
out of focus, cold daylight from the front left, far side of the face unfilled. Charcoal
blazer over a plain white t-shirt. His right hand is raised to chest height with one finger
extended, beginning a list of three. The hand is nearer to camera and softly out of focus.
Eyes on the lens. Shot on 85mm at f/2.0, photographic realism, natural skin texture, no
beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up, his eyeline on the upper third line. The LEFT half of the frame is the blurred window,
even and uncluttered, reserved for on-screen numbers. Nothing important within five percent
of any edge.
```

### В-3 · крупный план

Тот же паспортный якорь, дальше:

```
Close-up of a 41-year-old man, head and shoulders, beside a window in early morning. Cold
daylight from the front left, far side of the face in unfilled shadow, blurred city behind.
Charcoal blazer, white t-shirt collar visible. He looks straight into the lens, calm and
level, no smile. Catchlight from the window in both eyes. Shot on 85mm at f/1.8, photographic
realism, strong natural skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, his eyeline on the
upper third line. The LEFT half of the frame is the blurred window, even and uncluttered,
reserved for on-screen numbers. Nothing important within five percent of any edge.
```

### В-4 · средний план вполоборота

Тот же паспортный якорь, дальше:

```
A 41-year-old man beside a floor-to-ceiling window in early morning, cold daylight from the
front left, far side of the face unfilled, city outside fully out of focus. Charcoal blazer
over a white t-shirt. He is turned about thirty degrees away from the lens, looking out at
the blurred city, jaw set, thinking rather than posing. Shot on 85mm at f/2.0, photographic
realism, natural skin texture, no beauty retouching.

Horizontal 16:9 composition. He occupies the RIGHT half of the frame, framed from the chest
up. The LEFT half of the frame is the blurred window, even and uncluttered, reserved for
on-screen numbers. Nothing important within five percent of any edge.
```

---

# Восемь движений

Каждое — на 10 секунд, это потолок Omni Flash. Настройка: 720p. Обрезать до 8 с на монтаже.

**М-1 · покой**
```
The man holds still and speaks directly to camera. Micro-movements only: natural blinking
every three to four seconds, the jaw and lip motion of speech, an almost imperceptible shift
of weight. The head does not turn. Camera is locked off — no push in, no pull back, no
handheld shake. Lighting stays constant throughout. 10 seconds.
```

**М-2 · наклон вперёд**
```
The man continues speaking to camera and leans forward by no more than two centimetres across
the whole clip, then holds. Breathing, blinking and speech motion only. No head turn, no
gesture, no camera move. 10 seconds.
```

**М-3 · счёт на пальцах**
```
The man speaks and counts on his fingers, adding one finger at a time with a clear pause
between each. The hand stays at chest height and never rises above it or crosses his face.
The head stays steady, eyes on the lens, blinking natural. Camera locked off. 10 seconds.
```

**М-4 · открытая ладонь**
```
The man speaks and makes two or three small open-palm gestures, one per item he lists, the
hand returning to rest between them. The hand never rises above chest height and never crosses
his face. Head steady, eyes on lens, natural blinking. Camera locked off. 10 seconds.
```

**М-5 · наклон головы**
```
The man speaks and tilts his head a few degrees to one side once, mid-clip, as if adding
another item to a list. Otherwise still. Eyes stay on the lens, blinking natural. No camera
move. 10 seconds.
```

**М-6 · возврат взгляда**
```
The man speaks while his gaze rests away from the lens, then his eyes return to camera over
about one and a half seconds and stay there. One single return, smooth and unforced, the head
barely moving. Body still. Camera locked off. 10 seconds.
```

**М-7 · медленное моргание и удержание**
```
The man finishes his last sentence, closes his mouth, gives one slow deliberate blink and
holds the look into the lens until the end of the clip. Breathing only. No head turn, no
camera move, no zoom. 10 seconds.
```

**М-8 · постановка ладонью**
```
The man speaks and makes one slow downward placing gesture with an open hand, as if setting an
object on a shelf, then lets the hand fall out of frame. One gesture only in the whole clip.
Head steady, eyes on lens. Camera locked off. 10 seconds.
```

---

# Раскладка клипов

Тринадцать клипов на ролик. В колонке «плита» подставляется буква сетапа: для Д-01 и Д-03 это Б, для Д-02 и Д-05 — А, для Д-04 — В.

| № | Время в ролике | Что происходит | Плита | Движение |
|---|---|---|---|---|
| 1 | 0:25–0:33 | оглавление, первая половина | ?-1 | М-1 |
| 2 | 0:33–0:41 | оглавление, перечисление частей | ?-2 | М-3 |
| 3 | 0:41–0:50 | оглавление, закрывающая фраза | ?-3 | М-7 |
| 4 | 1:48–1:56 | мост в блок 2 | ?-1 | М-2 |
| 5 | 1:56–2:00 | хвост моста | ?-3 | М-7 |
| 6 | 2:58–3:06 | мост в блок 3 | ?-4 | М-6 |
| 7 | 3:06–3:10 | хвост моста | ?-1 | М-1 |
| 8 | 4:08–4:16 | мост в блок 4 | ?-2 | М-4 |
| 9 | 4:16–4:20 | хвост моста | ?-3 | М-7 |
| 10 | 5:18–5:26 | мост в блок 5 | ?-1 | М-5 |
| 11 | 5:26–5:30 | хвост моста | ?-4 | М-6 |
| 12 | 6:30–6:40 | сборка, перечисление чисел | ?-2 | М-3 |
| 13 | 6:40–6:50 | сборка, последняя фраза и действие | ?-3 | М-7 |

Итого на ролик: **4 генерации в Nano Banana Pro** и **13 генераций в Omni Flash**. Плиты работают так: ?-1 четыре раза, ?-2 три раза, ?-3 четыре раза, ?-4 два раза.

Клипы 12 и 13 идут по 10 секунд без обрезки — это финал, там запас не нужен, движение к концу как раз затухает по смыслу.

**Исключения по роликам.** В Д-04 клип 6 берёт плиту В-4 с движением М-6: он смотрит в окно и возвращается к камере ровно на фразе «если часов больше не станет». В Д-05 клип 10 берёт плиту А-4 с М-6 — на фразе «самая дорогая ошибка в моей жизни» взгляд уходит в сторону и возвращается.

---

# Порядок работы на один ролик

1. **Четыре плиты** в Nano Banana Pro: 16:9, ×4, 5 референсов. Из каждой четвёрки — один вариант.
2. **Проверка дрейфа** по трём меткам. Плита с дрейфом не идёт дальше.
3. **Тринадцать прогонов** в Omni Flash по таблице выше, каждый по 10 секунд.
4. **Обрезка** до 8 секунд — по секунде с каждого конца, кроме клипов 12 и 13.
5. **Инфографическая дорожка** рендерится отдельно в Remotion на 420 секунд и служит основой; клипы встают поверх в местах из таблицы.
6. **Сверка:** сумма ровно 420 секунд, числа совпадают с таблицей источников, дисклеймеры на экране.

**Что нельзя.** Двигать камеру ни в одном клипе — при движении камеры дрейф лица вылезает сразу. Держать Ланского в кадре дольше 25 секунд подряд — к четвёртому клипу подряд разница между плитами становится заметна. Смешивать сетапы внутри одного ролика. Генерировать новую плиту там, где хватит повторного прогона принятой.
