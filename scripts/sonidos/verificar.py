"""Control de calidad de `assets/sonidos/`. No modifica nada: mide e informa.

Uso:  python verificar.py <carpeta_de_sonidos> [--asr]

Por cada archivo: duración, peso, volumen integrado (LUFS, BS.1770), pico real (dBTP, sobremuestreo
×4) y silencio al principio y al final. Al final, el peso total que se suma al APK.

Con `--asr` pasa reconocimiento de voz (faster-whisper `small`, MIT) a cada `voz_*.mp3` y lo compara
con lo que tiene que decir según `src/features/alarmas/vocesDeLasAlarmas.json`: es la forma de
«escuchar» sin oídos que no haya palabras comidas o cambiadas. Si alguna no coincide, sale con
código 1. Necesita el modelo `Systran/faster-whisper-small` en `HF_HOME` (o red para bajarlo).
"""

import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import resample_poly

from tabla_de_voces import frases_por_archivo

WHISPER = "Systran/faster-whisper-small"


def silencio_en_bordes(audio: np.ndarray, fs: int, umbral_db: float = -60.0) -> tuple[float, float]:
    activos = np.flatnonzero(np.abs(audio) > 10 ** (umbral_db / 20))
    if len(activos) == 0:
        return len(audio) / fs, len(audio) / fs
    return activos[0] / fs, (len(audio) - 1 - activos[-1]) / fs


def medir(archivo: Path) -> dict:
    audio, fs = sf.read(archivo, dtype="float64")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    inicio, fin = silencio_en_bordes(audio, fs)
    return {
        "archivo": archivo.name,
        "duracion_s": round(len(audio) / fs, 2),
        "peso_kb": round(archivo.stat().st_size / 1024, 1),
        "lufs": round(float(pyln.Meter(fs).integrated_loudness(audio)), 1),
        "pico_real_dbtp": round(float(20 * np.log10(np.abs(resample_poly(audio, 4, 1)).max() + 1e-12)), 1),
        "silencio_inicio_s": round(inicio, 3),
        "silencio_fin_s": round(fin, 3),
    }


def normalizar_texto(texto: str) -> str:
    """Solo las letras, sin tildes ni mayúsculas. Sin espacios: en una frase de dos palabras Whisper
    junta o separa a su antojo («A dormir» → «Adormir»), y lo que importa es que suenen las letras."""
    sin_tildes = unicodedata.normalize("NFD", texto.lower())
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z]", "", sin_tildes)


def transcribir(archivos: list[Path]) -> dict[str, str]:
    from faster_whisper import WhisperModel

    modelo = WhisperModel(WHISPER, device="cpu", compute_type="int8", cpu_threads=4)
    salida = {}
    for archivo in archivos:
        segmentos, _ = modelo.transcribe(str(archivo), language="es", beam_size=5, vad_filter=False)
        salida[archivo.name] = " ".join(s.text.strip() for s in segmentos)
    return salida


def main() -> None:
    carpeta = Path(sys.argv[1])
    archivos = sorted(p for p in carpeta.iterdir() if p.suffix in (".mp3", ".wav"))
    medidas = [medir(a) for a in archivos]
    for m in medidas:
        print(f"{m['archivo']:32} {m['duracion_s']:6.2f} s {m['peso_kb']:7.1f} KB {m['lufs']:6.1f} LUFS "
              f"{m['pico_real_dbtp']:5.1f} dBTP  silencio {m['silencio_inicio_s']:.3f}/{m['silencio_fin_s']:.3f} s")
    print(f"TOTAL {len(medidas)} archivos, {sum(m['peso_kb'] for m in medidas):.1f} KB")
    if "--asr" not in sys.argv:
        return
    esperado = frases_por_archivo()
    oido = transcribir([carpeta / a for a in esperado])
    fallas = 0
    for archivo, texto in esperado.items():
        coincide = normalizar_texto(oido[archivo]) == normalizar_texto(texto)
        fallas += not coincide
        print(f"{'OK ' if coincide else 'MAL'} {archivo:32} dice «{texto}» · Whisper entendió «{oido[archivo]}»")
    if fallas:
        raise SystemExit(f"{fallas} voz(es) no dicen lo que tienen que decir.")


if __name__ == "__main__":
    main()
