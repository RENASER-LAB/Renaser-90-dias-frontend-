"""Deja un audio listo para la app: MP3 mono (el que va al APK) + WAV 44,1 kHz 16 bit (de trabajo).

Viene de los candidatos del 2026-09-27 (`~/.cache/renaser-e2e/voz-candidatos/scripts/`): el
procesamiento es el mismo, así que los sonidos de alarma salen idénticos a los que aprobó el dueño.
Lo nuevo es `terminar_voz` + `con_campanita` (pidió «una campanita corta antes de la voz») y que el
WAV y el MP3 se escriben en carpetas distintas: el MP3 va a `assets/sonidos/`, el WAV no.

Pasos, en este orden:
  1. (solo voces) recorta el silencio que deja el modelo, con un margen para no comerse respiraciones;
  2. pasa a 44,1 kHz con `resample_poly` (conversión racional exacta: 24000→44100 es ×147/80);
  3. filtro pasa-altos suave a 70 Hz (saca continua y retumbe que un parlante de teléfono no da);
  3b. (solo voces) compresor suave: Kokoro dice el principio de la frase mucho más fuerte que el
     final («TIENES ACCIONES de tus objetivos por hacer»), y llevar eso a -16 LUFS solo con el
     limitador le sacaba hasta 7,5 dB a las sílabas fuertes. Con el compresor la frase queda pareja
     (se entiende el final en un parlante de teléfono) y el limitador casi no trabaja;
  4. fundido de entrada y de salida con coseno alzado (sin clics);
  5. silencio al inicio y al final;
  6. volumen: lleva a ~-16 LUFS integrados (ITU-R BS.1770, `pyloudnorm`) y, si el pico real
     (sobremuestreado ×4) pasa de -1 dBTP, lo contiene con un limitador corto con anticipación;
  7. escribe el WAV (PCM 16 bit) y el MP3 (LAME, CBR, mono) con `ffmpeg`: 128 kb/s los sonidos de
     alarma (como los aprobó el dueño) y 64 kb/s las voces (Kokoro no tiene nada por encima de
     12 kHz, y a 64 kb/s LAME conserva hasta 12,1 kHz: la mitad del peso sin perder banda).

No es un programa: lo usan `generar_voces.py` y `sintetizar_alarmas.py`.
"""

import subprocess
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, resample_poly, sosfiltfilt

FS = 44100
LUFS_OBJETIVO = -16.0
PICO_REAL_MAX_DBTP = -1.0
KBPS_ALARMAS = 128
KBPS_VOCES = 64

# La campanita va delante y la voz entra a los 0,45 s, cuando el segundo golpe ya se apagó lo
# suficiente para no tapar la primera sílaba. La campanita queda 4 LU por debajo de la voz: se oye,
# pero lo que manda es lo que se dice.
ENTRADA_DE_LA_VOZ_S = 0.45
CAMPANITA_BAJO_LA_VOZ_LU = 4.0


def a_44100(audio: np.ndarray, fs: int) -> np.ndarray:
    if fs == FS:
        return audio
    divisor = np.gcd(FS, fs)
    return resample_poly(audio, FS // divisor, fs // divisor)


def recortar_silencio(audio: np.ndarray, fs: int, umbral_db: float = -45.0) -> np.ndarray:
    """Recorta lo que esté más de `umbral_db` por debajo del pico, dejando 40 ms antes y 120 ms después."""
    envolvente = uniform_filter1d(np.abs(audio), size=max(1, int(0.005 * fs)))
    umbral = np.max(envolvente) * 10 ** (umbral_db / 20)
    activos = np.flatnonzero(envolvente > umbral)
    inicio = max(0, activos[0] - int(0.040 * fs))
    fin = min(len(audio), activos[-1] + int(0.120 * fs))
    return audio[inicio:fin]


def pasa_altos(audio: np.ndarray, corte_hz: float = 70.0) -> np.ndarray:
    sos = butter(2, corte_hz, btype="highpass", fs=FS, output="sos")
    return sosfiltfilt(sos, audio)


def comprimir(audio: np.ndarray, ratio: float = 3.0, rodilla_db: float = 6.0,
              ataque_s: float = 0.008, liberacion_s: float = 0.120) -> tuple[np.ndarray, float]:
    """Compresor de voz: umbral en el percentil 80 del nivel de las partes con voz (RMS de 10 ms)."""
    potencia = np.maximum(uniform_filter1d(audio ** 2, int(0.010 * FS)), 0.0)
    nivel = 10 * np.log10(potencia + 1e-12)
    umbral = np.percentile(nivel[nivel > nivel.max() - 40], 80)
    exceso = nivel - umbral
    pendiente = 1 - 1 / ratio
    reduccion = np.where(
        exceso <= -rodilla_db / 2, 0.0,
        np.where(exceso >= rodilla_db / 2, exceso * pendiente,
                 pendiente * (exceso + rodilla_db / 2) ** 2 / (2 * rodilla_db)))
    ataque, liberacion = np.exp(-1 / (ataque_s * FS)), np.exp(-1 / (liberacion_s * FS))
    suavizada = np.empty_like(reduccion)
    actual = 0.0
    for i, objetivo in enumerate(reduccion):
        actual = objetivo + (actual - objetivo) * (ataque if objetivo > actual else liberacion)
        suavizada[i] = actual
    return audio * 10 ** (-suavizada / 20), float(suavizada.max())


def fundidos(audio: np.ndarray, entrada_s: float, salida_s: float) -> np.ndarray:
    audio = audio.copy()
    for largo, lado in ((int(entrada_s * FS), "entrada"), (int(salida_s * FS), "salida")):
        if largo <= 1:
            continue
        rampa = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, largo))
        if lado == "entrada":
            audio[:largo] *= rampa
        else:
            audio[-largo:] *= rampa[::-1]
    return audio


def pico_real_dbtp(audio: np.ndarray) -> float:
    sobremuestreado = resample_poly(audio, 4, 1)
    return 20 * np.log10(np.max(np.abs(sobremuestreado)) + 1e-12)


def limitar(audio: np.ndarray, techo_dbtp: float) -> tuple[np.ndarray, float]:
    """Limitador con anticipación de 3 ms y liberación de 30 ms. Devuelve (audio, reducción máx. en dB).

    Corto a propósito: en las voces lo que pasa del techo son las explosivas (/t/ de «Tienes», /k/ de
    «acciones»), que el vocoder de Kokoro exagera. Con 80 ms de liberación la bajada se arrastraba a la
    vocal siguiente; con 30 ms queda pegada a la explosiva.
    """
    techo = 10 ** (techo_dbtp / 20) * 0.97
    sobre = np.abs(resample_poly(audio, 4, 1))
    pico_por_muestra = sobre[: len(audio) * 4].reshape(-1, 4).max(axis=1)
    ganancia_necesaria = np.minimum(1.0, techo / np.maximum(pico_por_muestra, 1e-12))
    anticipo = int(0.003 * FS)
    ganancia = uniform_filter1d(minimum_filter1d(ganancia_necesaria, 2 * anticipo + 1), anticipo)
    liberacion = np.exp(-1.0 / (0.030 * FS))
    suavizada = np.empty_like(ganancia)
    actual = 1.0
    for i, objetivo in enumerate(ganancia):
        actual = objetivo if objetivo < actual else objetivo + (actual - objetivo) * liberacion
        suavizada[i] = actual
    return audio * suavizada, float(-20 * np.log10(suavizada.min()))


def normalizar(audio: np.ndarray, lufs: float = LUFS_OBJETIVO) -> tuple[np.ndarray, dict]:
    medidor = pyln.Meter(FS)
    audio = audio * 10 ** ((lufs - medidor.integrated_loudness(audio)) / 20)
    reduccion = 0.0
    for _ in range(3):
        if pico_real_dbtp(audio) <= PICO_REAL_MAX_DBTP:
            break
        audio, r = limitar(audio, PICO_REAL_MAX_DBTP)
        reduccion = max(reduccion, r)
        audio = audio * 10 ** ((lufs - medidor.integrated_loudness(audio)) / 20)
    if pico_real_dbtp(audio) > PICO_REAL_MAX_DBTP:  # última red: bajar todo lo que falte
        audio = audio * 10 ** ((PICO_REAL_MAX_DBTP - 0.05 - pico_real_dbtp(audio)) / 20)
    datos = {
        "lufs": round(float(medidor.integrated_loudness(audio)), 2),
        "pico_real_dbtp": round(float(pico_real_dbtp(audio)), 2),
        "limitacion_max_db": round(reduccion, 2),
    }
    return audio, datos


def escribir(audio: np.ndarray, wav: Path, mp3: Path, kbps: int) -> dict:
    """WAV de trabajo y MP3 para la app. Android `res/raw` exige minúsculas, dígitos y guion bajo."""
    wav.parent.mkdir(parents=True, exist_ok=True)
    mp3.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.round(audio * 32767), -32768, 32767).astype(np.int16)
    sf.write(wav, pcm, FS, subtype="PCM_16")
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame",
         "-b:a", f"{kbps}k", "-ac", "1", "-ar", str(FS), str(mp3)],
        check=True,
    )
    return {"mp3": mp3.name, "duracion_s": round(len(pcm) / FS, 2), "peso_kb": round(mp3.stat().st_size / 1024, 1)}


def terminar(audio: np.ndarray, fs: int, wav: Path, mp3: Path, *, lufs: float, kbps: int = KBPS_ALARMAS,
             silencio_inicio_s: float = 0.15, silencio_fin_s: float = 0.30,
             fundido_entrada_s: float = 0.010, fundido_salida_s: float = 0.060) -> dict:
    """Un sonido de alarma: el mismo camino que los candidatos, para que salgan idénticos."""
    audio = pasa_altos(a_44100(np.asarray(audio, dtype=np.float64), fs))
    audio = fundidos(audio, fundido_entrada_s, fundido_salida_s)
    audio = np.concatenate([np.zeros(int(silencio_inicio_s * FS)), audio, np.zeros(int(silencio_fin_s * FS))])
    audio, datos = normalizar(audio, lufs)
    return {**escribir(audio, wav, mp3, kbps), **datos}


def terminar_voz(audio: np.ndarray, fs: int) -> np.ndarray:
    """La voz sola, recortada, pareja y a -16 LUFS. Todavía sin campanita ni silencios."""
    audio = recortar_silencio(np.asarray(audio, dtype=np.float64), fs)
    audio = pasa_altos(a_44100(audio, fs))
    audio, _ = comprimir(audio)
    audio = fundidos(audio, 0.010, 0.060)
    audio, _ = normalizar(audio, LUFS_OBJETIVO)
    return audio


def con_campanita(voz: np.ndarray, campanita: np.ndarray) -> tuple[np.ndarray, dict]:
    """Campanita al principio, voz a los `ENTRADA_DE_LA_VOZ_S`, y todo a -16 LUFS.

    30 ms de silencio antes (el ataque no queda pegado al borde) y 250 ms después (sin corte seco).
    """
    medidor = pyln.Meter(FS)
    objetivo = medidor.integrated_loudness(voz) - CAMPANITA_BAJO_LA_VOZ_LU
    tono = campanita * 10 ** ((objetivo - medidor.integrated_loudness(campanita)) / 20)
    entrada = int(ENTRADA_DE_LA_VOZ_S * FS)
    mezcla = np.zeros(max(len(tono), entrada + len(voz)))
    mezcla[: len(tono)] += tono
    mezcla[entrada: entrada + len(voz)] += voz
    mezcla = np.concatenate([np.zeros(int(0.03 * FS)), mezcla, np.zeros(int(0.25 * FS))])
    return normalizar(mezcla, LUFS_OBJETIVO)
