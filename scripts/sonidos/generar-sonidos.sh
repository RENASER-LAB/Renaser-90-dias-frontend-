#!/usr/bin/env bash
# Regenera los sonidos de las alarmas en `assets/sonidos/` (decisiones del dueño del 2026-09-27).
#
#   voces   → voz Dora de Kokoro-82M (Apache-2.0) con una campanita corta delante. Una por hábito del
#             catálogo, que dice su nombre, y la frase genérica de hábitos propios, eventos y objetivos.
#             Qué dice cada una: `src/features/alarmas/vocesDeLasAlarmas.json` (lo lee también la app).
#   alarmas → los 8 sonidos para alertar y para relajar, síntesis propia (numpy/scipy, sin terceros).
#
# Reemplaza a `scripts/generar-voces-provisionales.sh` (espeak-ng, 2026-09-26), que ya no existe.
#
# USO
#   ./scripts/sonidos/generar-sonidos.sh            # todo, y verifica con Whisper
#   ./scripts/sonidos/generar-sonidos.sh voces      # solo las voces
#   ./scripts/sonidos/generar-sonidos.sh alarmas    # solo los 8 sonidos
#   SIN_ASR=1 ./scripts/sonidos/generar-sonidos.sh  # sin la escucha de Whisper
# Da los mismos archivos cada vez (semillas fijas). Después: `npx jest src/features/alarmas` y un
# APK nuevo — los sonidos van DENTRO del APK (plugin de `expo-notifications` en `app.json`).
#
# CAMBIAR ALGO
#   - Una frase: editar `dice` en `vocesDeLasAlarmas.json` y correr `voces`. El archivo conserva el
#     nombre, así que no hay que tocar código: el canal de Android guarda el recurso por nombre.
#   - Un hábito nuevo en el catálogo: agregarlo al JSON (id, título del catálogo, clave, lo que dice),
#     correr `voces` y sumar `./assets/sonidos/voz_habito_<clave>.mp3` a `sounds` en `app.json`.
#     Si falta, `src/features/alarmas/__tests__/sonidosElegibles.test.ts` lo avisa. Mientras no
#     tenga voz, ese hábito dice la frase genérica.
#   - Un sonido de alarma: su función en `sintetizar_alarmas.py`.
#
# ENTORNO (no va en el repo: 1,8 GB de Python y 805 MB de modelos)
#   Python 3.11 con los paquetes de `requisitos.txt` (ahí están los dos comandos de instalación) y
#   `ffmpeg` del sistema. Por defecto usa el que ya está en esta laptop:
#     TTS_PYTHON=~/.cache/renaser-e2e/tts-venv/bin/python   HF_HOME=~/.cache/renaser-e2e/hf-cache
#   En otra máquina: crear el entorno, exportar esas dos variables y correr una vez con red para que
#   baje `hexgrad/Kokoro-82M` (commit f3ff3571791e39611d31c381e3a41a3af07b4987: config.json,
#   kokoro-v1_0.pth, voices/ef_dora.pt) y `Systran/faster-whisper-small`. Si el modelo ya está en
#   HF_HOME, esto corre SIN red (`HF_HUB_OFFLINE=1`): `generar_voces.py` le pasa a Kokoro las rutas
#   locales, que es lo que evita el `LocalEntryNotFoundError` que da Kokoro sin red.
#   Memoria: Kokoro ocupa ~2 GB mientras genera (una frase por vez); Whisper, ~1 GB.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
DESTINO="$RAIZ/assets/sonidos"
PY="${TTS_PYTHON:-$HOME/.cache/renaser-e2e/tts-venv/bin/python}"
export HF_HOME="${HF_HOME:-$HOME/.cache/renaser-e2e/hf-cache}"
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-4}"   # CPU, sin GPU; 4 hilos para no ahogar la laptop
export PYTHONDONTWRITEBYTECODE=1                  # sin __pycache__ dentro del repo
if [ -d "$HF_HOME/hub/models--hexgrad--Kokoro-82M/snapshots/f3ff3571791e39611d31c381e3a41a3af07b4987" ]; then
  export HF_HUB_OFFLINE="${HF_HUB_OFFLINE:-1}"
fi
QUE="${1:-todo}"

if [ ! -x "$PY" ]; then
  echo "No encuentro el Python con Kokoro en $PY. Ver ENTORNO en la cabecera de este script." >&2
  exit 1
fi
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

cd "$AQUI"
case "$QUE" in
  todo|voces) "$PY" generar_voces.py "$TRABAJO/voces" "$DESTINO" ;;&
  todo|alarmas) "$PY" sintetizar_alarmas.py "$TRABAJO/alarmas" "$DESTINO" ;;
  voces) ;;
  *) echo "Uso: $0 [todo|voces|alarmas]" >&2; exit 2 ;;
esac

if [ -n "${SIN_ASR:-}" ]; then
  "$PY" verificar.py "$DESTINO"
else
  "$PY" verificar.py "$DESTINO" --asr
fi
