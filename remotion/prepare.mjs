/**
 * prepare.mjs — положить в public/ то, что будет рендериться.
 *
 *     node prepare.mjs i01.html            без звука
 *     node prepare.mjs i01.html ../voice/I-01.mp3
 *
 * Сцена и дорожка лежат в репозитории, а Remotion раздаёт только public/.
 * Копируем, а не симлинкуем: симлинки в бандлер не проходят.
 *
 * Картинки из assets/ — тоже: сцена ссылается на них относительным путём,
 * и в бандле этот путь ведёт внутрь public/. Без копии на месте калькулятора
 * и фона будет пустое место, причём рендер не упадёт — молча отдаст ролик
 * с дырой. Поэтому пути вынимаем из самой сцены и копируем всё, на что она
 * ссылается; чего нет на диске — ошибка сразу, а не через двадцать минут
 * рендера.
 */
import {copyFileSync, existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, 'public');
mkdirSync(pub, {recursive: true});

const scene = process.argv[2] ?? '../i01.html';
const voice = process.argv[3] ?? '';

const src = resolve(here, scene.startsWith('..') ? scene : join('..', scene));
if (!existsSync(src)) throw new Error(`сцены нет: ${src}`);
const html = readFileSync(src, 'utf8');
copyFileSync(src, join(pub, 'scene.html'));
console.log(`сцена  → public/scene.html  (${scene})`);

// url(assets/…) в стилях и src="assets/…" в разметке.
const refs = new Set();
for (const m of html.matchAll(/(?:url\(|src\s*=\s*)['"`]?(assets\/[^'"`)\s]+)/g)) {
  refs.add(m[1]);
}
const root = resolve(here, '..');
for (const rel of refs) {
  const from = join(root, rel);
  if (!existsSync(from)) throw new Error(`сцена ссылается на ${rel}, а файла нет`);
  const to = join(pub, rel);
  mkdirSync(dirname(to), {recursive: true});
  copyFileSync(from, to);
  console.log(`ассет  → public/${rel}`);
}
if (!refs.size) console.log('ассетов в сцене нет');

const dst = join(pub, 'voice.mp3');
rmSync(dst, {force: true});
if (voice) {
  const v = resolve(here, voice.startsWith('..') ? voice : join('..', voice));
  if (!existsSync(v)) throw new Error(`дорожки нет: ${v}`);
  copyFileSync(v, dst);
  console.log(`дорожка → public/voice.mp3  (${voice})`);
} else {
  console.log('дорожки нет — рендер без звука');
}
