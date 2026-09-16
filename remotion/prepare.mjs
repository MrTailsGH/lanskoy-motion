/**
 * prepare.mjs — положить в public/ то, что будет рендериться.
 *
 *     node prepare.mjs i01.html            без звука
 *     node prepare.mjs i01.html ../voice/I-01.mp3
 *
 * Сцена и дорожка лежат в репозитории, а Remotion раздаёт только public/.
 * Копируем, а не симлинкуем: симлинки в бандлер не проходят.
 */
import {copyFileSync, existsSync, mkdirSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, 'public');
mkdirSync(pub, {recursive: true});

const scene = process.argv[2] ?? '../i01.html';
const voice = process.argv[3] ?? '';

const src = resolve(here, scene.startsWith('..') ? scene : join('..', scene));
if (!existsSync(src)) throw new Error(`сцены нет: ${src}`);
copyFileSync(src, join(pub, 'scene.html'));
console.log(`сцена  → public/scene.html  (${scene})`);

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
