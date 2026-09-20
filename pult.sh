#!/usr/bin/env bash
# pult.sh — пульт цеха на маке и в контейнере.
cd "$(dirname "$0")"
exec python3 pult/pult.py "$@"
