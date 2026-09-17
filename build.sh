#!/usr/bin/env bash
# build.sh — собрать ролик целиком: сцена плюс дорожка на выходе MP4.
#
#     bash build.sh i01            хвост 1,4 с по умолчанию
#     bash build.sh i03 --tail 2.0
#     bash build.sh i04 --no-align подставить готовый timing-I-04.json
#
# Имена связаны соглашением: i01.html ↔ voice/I-01.mp3 ↔ text-I-01.txt
# ↔ timing-I-01.json ↔ out/I-01.mp4.
set -e

SCENE=$1
[ -z "$SCENE" ] && { echo "какую сцену собирать? например: bash build.sh i01"; exit 1; }
N=${SCENE#i}                    # 01
TAIL=1.4
ALIGN=yes
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --tail) TAIL=$2; shift 2 ;;
    --no-align) ALIGN=no; shift ;;
    *) echo "не знаю ключ $1"; exit 1 ;;
  esac
done

VOICE="voice/I-$N.mp3"
TEXT="text-I-$N.txt"
TIMING="timing-I-$N.json"
OUT="out/I-$N.mp4"
export PATH="$HOME/.local/bin:$PATH"

[ -f "$SCENE.html" ] || { echo "нет сцены $SCENE.html"; exit 1; }
[ -f "$VOICE" ] || { echo "нет дорожки $VOICE"; exit 1; }

if [ "$ALIGN" = yes ]; then
  echo "── выравнивание ──"
  python3 align.py "$VOICE" "$TEXT" "$TIMING"
fi

echo "── раскладка в сцену ──"
python3 settime.py "$SCENE.html" "$TIMING" --tail "$TAIL" | head -2

echo "── проверки ──"
python3 audit.py "$SCENE.html" | tail -1
python3 overlap.py "$SCENE.html"

echo "── рендер ──"
cd remotion
node prepare.mjs "$SCENE.html" "$VOICE" > /dev/null
rm -rf out/frames
CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1)
npx remotion render src/index.ts Rolik out/frames --sequence --image-format=png \
  --browser-executable="$CHROME"

# Ждать по числу кадров, а не по строчке в логе: путь к папке Remotion
# печатает сразу при старте, и наивная проверка считает рендер законченным
# на второй секунде.
WANT=$(node -e "const h=require('fs').readFileSync('public/scene.html','utf8');
  console.log(Math.round(parseFloat(h.match(/DUR:\s*([0-9.]+)/)[1])*30))")
HAVE=$(ls out/frames | wc -l)
[ "$HAVE" -ge "$WANT" ] || { echo "кадров $HAVE из $WANT — рендер не дошёл"; exit 1; }
echo "кадров: $HAVE"

echo "── сборка и сведение ──"
mkdir -p ../out
ffmpeg -y -v error -framerate 30 -pattern_type glob -i 'out/frames/element-*.png' \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 \
  -x264-params "deblock=-1,-1:aq-mode=3:aq-strength=1.1" -movflags +faststart -r 30 out/video.mp4
# без -shortest и без apad: картинка длиннее звука на хвост под CTA
ffmpeg -y -v error -i out/video.mp4 -i public/voice.mp3 -c:v copy -c:a aac -b:a 192k "../$OUT"
cd ..
ffmpeg -hide_banner -i "$OUT" 2>&1 | grep -E 'Duration|Stream'
echo "готово: $OUT"
