#!/usr/bin/env bash
# setup.sh — привести контейнер в рабочее состояние.
#
# Проверено 16.09.2026: свежий контейнер приходит БЕЗ numpy, playwright,
# ffmpeg и шрифтов Golos Text, хотя раньше они были предустановлены.
# Ставится всё из pip и npm, интернет для этого уже разрешён.
#
#     bash setup.sh
#
set -e

echo "── python ──"
pip install --quiet --break-system-packages numpy playwright imageio-ffmpeg

echo "── ffmpeg ──"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
mkdir -p "$HOME/.local/bin"
ln -sf "$FF" "$HOME/.local/bin/ffmpeg"
echo "ffmpeg: $FF  (символическая ссылка в ~/.local/bin)"

echo "── шрифты Golos Text ──"
if ! fc-list | grep -qi golos; then
  TMP=$(mktemp -d)
  npm install --silent --prefix "$TMP" @expo-google-fonts/golos-text
  mkdir -p /usr/share/fonts/truetype/golos
  cp "$TMP"/node_modules/@expo-google-fonts/golos-text/*/*.ttf /usr/share/fonts/truetype/golos/
  fc-cache -f > /dev/null
  rm -rf "$TMP"
fi
fc-list | grep -ci golos | xargs echo "начертаний Golos Text:"

echo "── Chromium ──"
python3 -c "import browser; print('двоичный файл:', browser.chrome() or 'свой у playwright')"

echo
echo "готово. Проверка сцены:  python3 audit.py i01.html"

# yt-dlp — для snimok.py. В этом окружении YouTube закрыт прокси и скачать
# ничего не выйдет, но инструмент пусть стоит: сетевая политика задаётся при
# создании окружения, и в открытом контейнере конвейер заработает без правок.
pip install -q -U yt-dlp 2>/dev/null || true
