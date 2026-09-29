"""Sintetiza el aviso de mensaje del chat: `assets/sonidos/mensaje_burbuja.wav` (D-221, 2026-09-29).

Pedido del dueño: que los chats avisen «con el sonido tipo WhatsApp». El de WhatsApp tiene dueño y no
se copia ni se imita nota por nota: esto es un sonido PROPIO de la misma familia (corto, redondo, de
mensajería), hecho desde cero como los de alarma (`sintetizar_alarmas.py`).

Qué es: dos «burbujas» que suben. Cada una es un seno cuya afinación sube rápido al principio (así
suena una gota o una burbuja que revienta: el tono sube mientras se achica) y se apaga en ~60 ms, con
un segundo parcial suave a la octava y media para que tenga cuerpo en un parlante chico. La segunda
entra a los 90 ms, una sexta más arriba, y un poco más fuerte: «pu-pip». Dura ~0,3 s con la cola.

Todo sale de numpy/scipy: no hay grabaciones ni muestras de terceros, así que no hay ninguna licencia
ajena que cumplir. Semilla fija (solo la usa la sala): correrlo dos veces da el mismo archivo.

Sale en WAV (PCM 16 bit, mono, 44,1 kHz) y no en MP3 porque es un sonido de notificación: el canal
de Android `mensajes-chat` lo toma de `res/raw` y en iOS un aviso solo acepta WAV/AIFF/CAF. Queda a
-16 LUFS, como los de «alertar», con el pico real por debajo de -1 dBTP (`terminar_audio.normalizar`).

Uso:  python sintetizar_mensaje.py <carpeta_de_trabajo> <carpeta_de_assets>   (lo llama generar-sonidos.sh)
"""

import sys
from pathlib import Path

import numpy as np

import terminar_audio as ta
from sintetizar_alarmas import FS, fundido_final, lienzo, pegar, rampa, sala, tiempo

SEMILLA = 20260929
LUFS = -16.0


def burbuja(f_inicio: float, f_fin: float, dur: float = 0.16, tau: float = 0.045) -> np.ndarray:
    """Un seno que sube de `f_inicio` a `f_fin` en los primeros 35 ms y decae con constante `tau`."""
    t = tiempo(dur)
    subida = 1 - np.exp(-t / 0.012)                      # llega casi entera a `f_fin` en ~35 ms
    f = f_inicio + (f_fin - f_inicio) * subida
    fase = 2 * np.pi * np.cumsum(f) / FS
    y = np.sin(fase) + 0.18 * np.sin(1.5 * fase) * np.exp(-t / (tau * 0.5))
    y *= np.exp(-t / tau)
    n = int(0.002 * FS)                                  # ataque de 2 ms: redondo, sin clic
    y[:n] *= rampa(n)
    return y


def mensaje_burbuja(rng) -> np.ndarray:
    y = lienzo(0.34)
    pegar(y, burbuja(480.0, 820.0), 0.0, 0.8)
    pegar(y, burbuja(700.0, 1320.0, tau=0.05), 0.09, 1.0)
    return fundido_final(sala(y, 0.25, 0.08, rng), 0.06)


def main() -> None:
    trabajo, destino = Path(sys.argv[1]), Path(sys.argv[2])
    audio = mensaje_burbuja(np.random.default_rng(SEMILLA))
    # El WAV que queda es el de `assets/sonidos/`; el MP3 que también escribe `terminar` va a la
    # carpeta de trabajo y se descarta (la app usa el WAV).
    datos = ta.terminar(audio, FS, destino / "mensaje_burbuja.wav", trabajo / "mensaje_burbuja.mp3", lufs=LUFS,
                        kbps=ta.KBPS_ALARMAS, silencio_inicio_s=0.01, silencio_fin_s=0.12,
                        fundido_entrada_s=0.002, fundido_salida_s=0.04)
    print("mensaje_burbuja", datos, flush=True)


if __name__ == "__main__":
    main()
