"""Genera las voces de las alarmas con Kokoro-82M (voz Dora) y la campanita delante.

Uso:  python generar_voces.py <carpeta_wav_de_trabajo> <carpeta_mp3> [archivo.mp3 ...]
      (lo llama generar-sonidos.sh). Sin archivos, las genera todas; con archivos, solo esas.

Qué dice cada voz sale de `src/features/alarmas/vocesDeLasAlarmas.json` (ver `tabla_de_voces.py`).

Decisiones del dueño (2026-09-27): voz **Dora**, «que diga el nombre del hábito nomás y que sea
rápido como está» (velocidad 0,9, la de los candidatos que escuchó) y una campanita corta antes.

Tres trampas conocidas de Kokoro (ver `~/.cache/renaser-e2e/voz-candidatos/COMO_SE_HIZO.md`):
  1. **Ceceo.** `KPipeline(lang_code='e')` fonemiza con `espeak-ng es` (español de España):
     «empezar» sale `empeθˈaɾ`. Se cambia el G2P por `es-419` (seseo).
  2. **Sin semilla no es determinista:** el vocoder mete ruido aleatorio. `torch.manual_seed` antes
     de cada frase.
  3. **`HF_HUB_OFFLINE=1` rompe `KModel(repo_id=...)`** con `LocalEntryNotFoundError`: se baja con
     commit fijo y así no existe `refs/main`. Por eso se le pasan RUTAS LOCALES (`config=`, `model=`
     y el `.pt` de la voz), sacadas de `hf_hub_download` con `revision=` explícito.
Y dos más, de este trabajo (2026-09-27):
  4. **La semilla sola no alcanza para repetir los bytes.** Dos corridas con la CPU más o menos
     cargada dieron las 20 voces distintas: mismo largo y mismo espectro (diferencia mediana 0,00 dB),
     pero otra onda (señal/diferencia de 30 a 48 dB): el orden de las sumas entre hilos cambia el
     redondeo y el vocoder acumula la fase de la F0, así que el error crece a lo largo de la frase.
     Suena igual, pero git ve 20 binarios cambiados aunque se haya tocado una sola frase. Con un solo
     hilo baja a 1 LSB de 16 bit en 1 de cada ~200 muestras, y con la CPU cargada igual cambiaba
     (el MP3 amplifica cualquier diferencia a otros bytes): lo que quedaba eran las rutas vectorizadas
     de oneDNN y MKL, que dependen de cómo quedó alineada la memoria. Por eso Kokoro corre en UN hilo,
     SIN oneDNN y con MKL en modo reproducible (`MKL_CBWR=COMPATIBLE`, antes de importar torch). Así,
     las 20 voces salieron idénticas byte a byte con carga 5,8 y con carga 13,6, y regenerar una sola
     da los mismos bytes que regenerarlas todas. Tarda ~70 s y usa ~1,3 GB (con oneDNN, ~2 GB).
  5. **Una palabra sola o una /x/ al principio salen al límite.** «Jugo verde.» se oía «Kugo verde»
     (Whisper entendió «¿Tú gobernes?»), y «Dormir.» sola, a veces «Dormida» (el mismo archivo daba una
     u otra según la corrida). Con una palabra delante se entienden siempre: «Tu jugo verde.»,
     «A dormir.». Si una voz nueva no pasa la verificación, probar lo mismo.
"""

import os

# Antes de importar torch: MKL lo lee al arrancar (ver la trampa 4).
os.environ.setdefault("MKL_CBWR", "COMPATIBLE")

import sys  # noqa: E402 (van después de fijar MKL_CBWR a propósito)
from pathlib import Path  # noqa: E402

import numpy as np  # noqa: E402
import torch  # noqa: E402
from huggingface_hub import hf_hub_download  # noqa: E402
from kokoro import KModel, KPipeline  # noqa: E402
from misaki import espeak  # noqa: E402

import sintetizar_alarmas as alarmas  # noqa: E402
import terminar_audio as ta  # noqa: E402
from tabla_de_voces import frases_por_archivo  # noqa: E402

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
    # Reproducible byte a byte (trampa 4): un hilo y sin oneDNN.
    torch.set_num_threads(1)
    torch.backends.mkldnn.enabled = False
    frases = frases_por_archivo()
    pedidas = sys.argv[3:]
    if desconocidas := [a for a in pedidas if a not in frases]:
        raise SystemExit(f"No hay voz {desconocidas}. Las que hay: {', '.join(frases)}")
    if pedidas:
        frases = {archivo: frases[archivo] for archivo in pedidas}
    campanita = alarmas.campanita(np.random.default_rng(alarmas.SEMILLA_CAMPANITA))
    pipeline, voz = cargar_kokoro()
    # Una frase por vez (el modelo queda cargado: ~1,3 GB de RAM en CPU).
    for archivo, texto in frases.items():
        audio, datos = ta.con_campanita(ta.terminar_voz(decir(pipeline, voz, texto), 24000), campanita)
        nombre = archivo.removesuffix(".mp3")
        escrito = ta.escribir(audio, carpeta_wav / f"{nombre}.wav", carpeta_mp3 / archivo, ta.KBPS_VOCES)
        print(f"{archivo}\t{escrito['duracion_s']:.2f} s\t{escrito['peso_kb']} KB\t{datos['lufs']} LUFS\t"
              f"{datos['pico_real_dbtp']} dBTP\t{texto}\t{pipeline.g2p(texto)[0]}", flush=True)


if __name__ == "__main__":
    main()
