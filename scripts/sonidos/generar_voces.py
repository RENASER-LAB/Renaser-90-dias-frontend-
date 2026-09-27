"""Genera las voces de las alarmas con Kokoro-82M (voz Dora) y la campanita delante.

Uso:  python generar_voces.py <carpeta_wav_de_trabajo> <carpeta_mp3>     (lo llama generar-sonidos.sh)

Qué dice cada voz sale de `src/features/alarmas/vocesDeLasAlarmas.json` (ver `tabla_de_voces.py`).

Decisiones del dueño (2026-09-27): voz **Dora**, «que diga el nombre del hábito nomás y que sea
rápido como está» (velocidad 0,9, la de los candidatos que escuchó) y una campanita corta antes.

Tres trampas conocidas de Kokoro (ver `~/.cache/renaser-e2e/voz-candidatos/COMO_SE_HIZO.md`):
  1. **Ceceo.** `KPipeline(lang_code='e')` fonemiza con `espeak-ng es` (español de España):
     «empezar» sale `empeθˈaɾ`. Se cambia el G2P por `es-419` (seseo).
  2. **Sin semilla no es determinista:** el vocoder mete ruido aleatorio. `torch.manual_seed` antes
     de cada frase: regenerar da lo mismo.
  3. **`HF_HUB_OFFLINE=1` rompe `KModel(repo_id=...)`** con `LocalEntryNotFoundError`: se baja con
     commit fijo y así no existe `refs/main`. Por eso se le pasan RUTAS LOCALES (`config=`, `model=`
     y el `.pt` de la voz), sacadas de `hf_hub_download` con `revision=` explícito.
Y una cuarta, de este trabajo: **la /x/ al principio de la frase sale débil.** «Jugo verde.» se oía
«Kugo verde» (Whisper entendió «¿Tú gobernes?»). Con una palabra delante («Tu jugo verde.») se
entiende. Si una voz nueva no pasa la verificación, probar lo mismo.
"""

import sys
from pathlib import Path

import numpy as np
import torch
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline
from misaki import espeak

import sintetizar_alarmas as alarmas
import terminar_audio as ta
from tabla_de_voces import frases_por_archivo

REPO = "hexgrad/Kokoro-82M"
# Commit fijo del repo oficial en Hugging Face (el de los candidatos del 2026-09-27).
REVISION = "f3ff3571791e39611d31c381e3a41a3af07b4987"
VOZ = "ef_dora"
VELOCIDAD = 0.9
SEMILLA = 20260927


def archivo_del_modelo(nombre: str) -> str:
    return hf_hub_download(REPO, nombre, revision=REVISION)


def cargar_kokoro() -> tuple[KPipeline, str]:
    modelo = KModel(repo_id=REPO, config=archivo_del_modelo("config.json"),
                    model=archivo_del_modelo("kokoro-v1_0.pth")).eval()
    pipeline = KPipeline(lang_code="e", repo_id=REPO, model=modelo)
    pipeline.g2p = espeak.EspeakG2P(language="es-419")
    return pipeline, archivo_del_modelo(f"voices/{VOZ}.pt")


def decir(pipeline: KPipeline, voz: str, texto: str) -> np.ndarray:
    torch.manual_seed(SEMILLA)
    trozos = [r.audio.numpy() for r in pipeline(texto, voice=voz, speed=VELOCIDAD)]
    return np.concatenate(trozos).astype(np.float64)


def main() -> None:
    carpeta_wav, carpeta_mp3 = Path(sys.argv[1]), Path(sys.argv[2])
    frases = frases_por_archivo()
    campanita = alarmas.campanita(np.random.default_rng(alarmas.SEMILLA_CAMPANITA))
    pipeline, voz = cargar_kokoro()
    # Una frase por vez (el modelo queda cargado: ~2 GB de RAM en CPU).
    for archivo, texto in frases.items():
        audio, datos = ta.con_campanita(ta.terminar_voz(decir(pipeline, voz, texto), 24000), campanita)
        nombre = archivo.removesuffix(".mp3")
        escrito = ta.escribir(audio, carpeta_wav / f"{nombre}.wav", carpeta_mp3 / archivo, ta.KBPS_VOCES)
        print(f"{archivo}\t{escrito['duracion_s']:.2f} s\t{escrito['peso_kb']} KB\t{datos['lufs']} LUFS\t"
              f"{datos['pico_real_dbtp']} dBTP\t{texto}\t{pipeline.g2p(texto)[0]}", flush=True)


if __name__ == "__main__":
    main()
