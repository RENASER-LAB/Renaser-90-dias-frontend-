#!/usr/bin/env bash
# Genera las voces PROVISIONALES de las alarmas (decisión del dueño del 2026-09-26).
#
# Cada archivo es un tono corto y suave (para despertar la atención) seguido de una frase dicha por
# una voz sintética (espeak-ng, español latino). Salen en WAV mono 16-bit 44,1 kHz y duran menos de
# 5 s, en `assets/sonidos/`.
#
# SON PROVISIONALES. El dueño puede reemplazar cualquiera por una grabación humana: basta con dejar
# un WAV con el MISMO nombre de archivo (minúsculas y guion bajo: Android `res/raw` no admite otra
# cosa) y compilar un APK nuevo. El código no cambia. Si se reemplazan a mano, NO volver a correr este
# script: pisaría la grabación.
#
# Requiere `espeak-ng` y `ffmpeg`. Uso: ./scripts/generar-voces-provisionales.sh
set -euo pipefail

DESTINO="$(cd "$(dirname "$0")/.." && pwd)/assets/sonidos"
TEMPORAL="$(mktemp -d)"
trap 'rm -rf "$TEMPORAL"' EXIT

generar() {
  local archivo="$1" frase="$2"
  espeak-ng -v es-419 -s 140 -p 45 -a 110 -w "$TEMPORAL/voz.wav" "$frase"
  # Tono: dos notas suaves (La5 y Mi6) de 0,22 s con entrada y salida gradual, 0,15 s de silencio y
  # la voz. Todo normalizado a mono 44,1 kHz s16.
  ffmpeg -loglevel error -y \
    -f lavfi -i "sine=frequency=880:duration=0.22" \
    -f lavfi -i "sine=frequency=1318.5:duration=0.30" \
    -f lavfi -i "anullsrc=r=44100:cl=mono:d=0.15" \
    -i "$TEMPORAL/voz.wav" \
    -filter_complex "\
[0]volume=0.25,afade=t=in:d=0.03,afade=t=out:st=0.14:d=0.08,aresample=44100,aformat=sample_fmts=s16:channel_layouts=mono[a];\
[1]volume=0.25,afade=t=in:d=0.03,afade=t=out:st=0.12:d=0.18,aresample=44100,aformat=sample_fmts=s16:channel_layouts=mono[b];\
[2]aformat=sample_fmts=s16:channel_layouts=mono[s];\
[3]aresample=44100,aformat=sample_fmts=s16:channel_layouts=mono[v];\
[a][b][s][v]concat=n=4:v=0:a=1[out]" \
    -map "[out]" -ac 1 -ar 44100 -c:a pcm_s16le "$DESTINO/$archivo"
}

generar voz_habito.wav 'Tu hábito está por empezar.'
generar voz_evento.wav 'Tu evento está por empezar.'
generar voz_objetivos.wav 'Tienes acciones de tus objetivos por hacer.'

for f in voz_habito voz_evento voz_objetivos; do
  ffprobe -v error -show_entries format=duration:stream=sample_rate,channels,sample_fmt -of csv=p=0 "$DESTINO/$f.wav" | tr '\n' ' '
  echo " $f.wav"
done
