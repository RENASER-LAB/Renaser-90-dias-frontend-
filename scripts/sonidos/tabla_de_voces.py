"""Qué dice cada voz: se lee de `src/features/alarmas/vocesDeLasAlarmas.json`, el MISMO archivo con el
que la app elige el audio de cada alarma. Una sola fuente: el script y la app no pueden desincronizarse.

  - `genericas`: la frase de los hábitos propios, los eventos y los objetivos (`voz_habito.mp3`, …).
  - `habitos`: una por hábito del catálogo → `voz_habito_<clave>.mp3`. Dos hábitos con la misma
    `clave` comparten el audio, y por eso tienen que decir lo mismo.

(Hasta el 2026-11-03 también estaban aquí las cuatro preguntas del Código Renaser, `voz_radar_que_*.mp3`, de la spec 030: el
dueño quitó «Escuchar» del formulario —«con solo leer ya basta»— y se borraron los audios, su JSON y esta parte.)
"""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TABLA = RAIZ / "src" / "features" / "alarmas" / "vocesDeLasAlarmas.json"


def frases_por_archivo() -> dict[str, str]:
    """`archivo.mp3` → lo que dice. Una entrada por audio (los hábitos que comparten clave, una vez)."""
    tabla = json.loads(TABLA.read_text(encoding="utf-8"))
    frases = {g["archivo"]: g["dice"] for g in tabla["genericas"].values()}
    for habito in tabla["habitos"]:
        archivo = f"voz_habito_{habito['clave']}.mp3"
        if frases.setdefault(archivo, habito["dice"]) != habito["dice"]:
            raise SystemExit(f"La clave «{habito['clave']}» tiene dos frases distintas en {TABLA.name}.")
    return frases
