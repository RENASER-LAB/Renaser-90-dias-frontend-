"""Qué dice cada voz: se lee de `src/features/alarmas/vocesDeLasAlarmas.json`, el MISMO archivo con el
que la app elige el audio de cada alarma. Una sola fuente: el script y la app no pueden desincronizarse.

  - `genericas`: la frase de los hábitos propios, los eventos y los objetivos (`voz_habito.mp3`, …).
  - `habitos`: una por hábito del catálogo → `voz_habito_<clave>.mp3`. Dos hábitos con la misma
    `clave` comparten el audio, y por eso tienen que decir lo mismo.

Y, desde la spec 030 (2026-10-31), las cuatro preguntas del Código Renaser, de `src/features/radar/vocesDelRadar.json`
(también lo lee la app): `voz_radar_que_<hago|pienso|siento|evito>.mp3`. Esas se leen DENTRO del formulario cuando la persona
toca «Escuchar», así que van sin la campanita de las alarmas (`archivos_del_radar`).
"""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TABLA = RAIZ / "src" / "features" / "alarmas" / "vocesDeLasAlarmas.json"
TABLA_DEL_RADAR = RAIZ / "src" / "features" / "radar" / "vocesDelRadar.json"


def archivos_del_radar() -> set[str]:
    """Los MP3 de las preguntas del Código Renaser: se dicen sin campanita (no son un aviso)."""
    tabla = json.loads(TABLA_DEL_RADAR.read_text(encoding="utf-8"))
    return {p["archivo"] for p in tabla["preguntas"]}


def frases_por_archivo() -> dict[str, str]:
    """`archivo.mp3` → lo que dice. Una entrada por audio (los hábitos que comparten clave, una vez)."""
    tabla = json.loads(TABLA.read_text(encoding="utf-8"))
    frases = {g["archivo"]: g["dice"] for g in tabla["genericas"].values()}
    for habito in tabla["habitos"]:
        archivo = f"voz_habito_{habito['clave']}.mp3"
        if frases.setdefault(archivo, habito["dice"]) != habito["dice"]:
            raise SystemExit(f"La clave «{habito['clave']}» tiene dos frases distintas en {TABLA.name}.")
    for pregunta in json.loads(TABLA_DEL_RADAR.read_text(encoding="utf-8"))["preguntas"]:
        frases[pregunta["archivo"]] = pregunta["dice"]
    return frases
