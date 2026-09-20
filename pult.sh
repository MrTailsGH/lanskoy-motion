#!/usr/bin/env bash
# pult.sh — пульт цеха на маке и в контейнере.
#
# Свежий код на каждом запуске. --ff-only откажется, а не устроит слияние
# с конфликтами за спиной; неудачное обновление не должно мешать запуску.
cd "$(dirname "$0")"
if command -v git >/dev/null; then
  echo "── обновление из GitHub ──"
  git pull --ff-only || echo "обновить не вышло — запускаю то, что есть"
fi
exec python3 pult/pult.py "$@"
