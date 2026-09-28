"""Sintetiza los sonidos de alarma: familia «alertar», familia «relajar» y la campanita de la voz.

Los ocho sonidos son los candidatos del 2026-09-27 que el dueño aprobó tal como están («Me gusta,
déjalos como está»): mismas funciones, mismas semillas y mismo orden, así que salen idénticos. Lo
único que cambia es el nombre del archivo, con guion bajo (Android `res/raw` no acepta guiones), y
que el MP3 va a `assets/sonidos/` y el WAV a una carpeta de trabajo.

La campanita (`campanita`) es nueva: dos golpes de una campana chica (La5 y Mi6, la misma quinta del
tono de las voces provisionales), cortos, para ponerla delante de la voz. La usa `generar_voces.py`.

Todo sale de numpy/scipy: no hay grabaciones ni muestras de terceros, así que no hay ninguna licencia
ajena que cumplir. Las melodías son motivos pentatónicos propios, compuestos para esto.

Cómo se hace cada timbre (síntesis modal: suma de senos que decaen, como vibra un objeto real):
  - vibráfono  parciales 1 : 4 : 9,94 (barras de metal afinadas), decaimiento largo, trémolo suave;
  - marimba    parciales 1 : 3,93 : 9,24 (barras de madera), decaimiento corto y un «toc» de mazo;
  - kalimba    parciales 1 : 6,27 : 17,55 (lengüeta empotrada), leve caída de afinación al pulsar;
  - campana    parciales 1 : 2,756 : 5,404 : 8,933 (tubo libre), cada uno desdoblado en dos modos
               casi iguales: el batido lento entre ellos es el «brillo» que tiene una campana real;
  - cuenco     parciales 1 : 2,71 : 5,15 : 8,43 (cuenco tibetano) con batido y mazo de fieltro;
  - lluvia     ruido rosa filtrado + gotas sueltas (golpecitos y «plinks» que suben de tono);
  - marrón     ruido con espectro marrón (cae 6 dB por octava) desde 350 Hz, que respira como el mar.
La sala es una reverberación sintética (ruido que decae, más rápido en los agudos).

Pensado para parlante de teléfono: nada importante por debajo de ~350 Hz (el parlante no lo da) ni
agudos filosos. «Alertar» queda a -16 LUFS; «relajar», a -18 LUFS (2 dB más suave a propósito: tiene
que despertar sin sobresaltar, y crece desde casi nada).

Semilla fija: correrlo dos veces da los mismos archivos.
Uso:  python sintetizar_alarmas.py <carpeta_wav_de_trabajo> <carpeta_mp3>   (lo llama generar-sonidos.sh)
"""

import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

import terminar_audio as ta

FS = ta.FS
LUFS_ALERTAR = -16.0
LUFS_RELAJAR = -18.0
SEMILLA = 20260927

# Notas (Hz), afinación temperada con La4 = 440.
NOTA = {
    "G4": 392.00, "G5": 783.99, "A5": 880.00, "B5": 987.77, "C6": 1046.50, "C#6": 1108.73,
    "D6": 1174.66, "E6": 1318.51, "F#6": 1479.98, "G6": 1567.98, "A6": 1760.00, "B6": 1975.53,
}


# ---------------------------------------------------------------- piezas comunes

def tiempo(dur: float) -> np.ndarray:
    return np.arange(int(round(dur * FS))) / FS


def rampa(n: int) -> np.ndarray:
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, max(n, 2)))


def lienzo(dur: float) -> np.ndarray:
    return np.zeros(int(round(dur * FS)))


def pegar(destino: np.ndarray, sonido: np.ndarray, t0: float, ganancia: float = 1.0) -> None:
    i = int(round(t0 * FS))
    fin = min(len(destino), i + len(sonido))
    destino[i:fin] += ganancia * sonido[: fin - i]


def filtro(x: np.ndarray, tipo: str, corte, orden: int = 2) -> np.ndarray:
    return sosfilt(butter(orden, corte, btype=tipo, fs=FS, output="sos"), x)


def modos(f0: float, parciales, dur: float, rng, ataque_s: float = 0.002, caida_afinacion: float = 0.0):
    """Suma de modos que decaen. `parciales` = [(razón, amplitud, tau_s, batido_hz), ...]."""
    t = tiempo(dur)
    y = np.zeros_like(t)
    for razon, amplitud, tau, batido in parciales:
        f = f0 * razon
        if f > 16000:  # por encima no aporta en un teléfono y se arriesga el alias
            continue
        fase = rng.uniform(0, 2 * np.pi)
        if caida_afinacion:
            instantanea = f * (1 + caida_afinacion * np.exp(-t / 0.03))
            onda = np.sin(2 * np.pi * np.cumsum(instantanea) / FS + fase)
        elif batido:
            onda = (0.68 * np.sin(2 * np.pi * (f - batido / 2) * t + fase)
                    + 0.32 * np.sin(2 * np.pi * (f + batido / 2) * t + rng.uniform(0, 2 * np.pi)))
        else:
            onda = np.sin(2 * np.pi * f * t + fase)
        y += amplitud * np.exp(-t / tau) * onda
    n = int(ataque_s * FS)
    y[:n] *= rampa(n)
    return con_final_suave(y)


def con_final_suave(y: np.ndarray, maximo_s: float = 0.4) -> np.ndarray:
    """Lleva a cero el último cuarto (hasta 0,4 s) del sonido.

    Cada nota se sintetiza con una duración fija, y al terminarse todavía suena (un vibráfono a los
    3 s conserva el 13 % de su amplitud). Cortarla ahí de golpe es un clic: en la primera versión se
    veían como rayas verticales en el espectrograma, justo 3 s después de cada nota.
    """
    n = int(min(0.25 * len(y) / FS, maximo_s) * FS)
    if n > 1:
        y[-n:] *= rampa(n)[::-1]
    return y


def golpe(dur: float, centro_hz: float, rng, ancho: float = 1.0) -> np.ndarray:
    """Ruido corto filtrado: el contacto del mazo o de la gota."""
    n = int(dur * FS)
    bajo, alto = centro_hz / (1 + ancho / 2), min(centro_hz * (1 + ancho / 2), FS * 0.45)
    r = filtro(rng.standard_normal(n), "bandpass", [bajo, alto]) * np.exp(-np.arange(n) / (n / 4))
    m = max(2, int(0.0005 * FS))
    r[:m] *= rampa(m)
    return con_final_suave(r / (np.abs(r).max() + 1e-12))


def sala(x: np.ndarray, rt60: float, mezcla: float, rng, predelay: float = 0.02) -> np.ndarray:
    """Reverberación sintética: ruido que decae (agudos más rápido), con densidad que crece al inicio."""
    t = tiempo(min(3.5, rt60 * 1.3))
    ruido = rng.standard_normal(len(t))
    bandas = [(filtro(ruido, "lowpass", 500), rt60 * 1.15),
              (filtro(ruido, "bandpass", [500, 4000]), rt60),
              (filtro(ruido, "highpass", 4000), rt60 * 0.45)]
    ir = sum(b * np.exp(-6.91 * t / rt) for b, rt in bandas) * (1 - np.exp(-t / 0.015))
    ir = np.concatenate([np.zeros(int(predelay * FS)), ir])
    ir /= np.sqrt(np.sum(ir ** 2))
    return x + mezcla * fftconvolve(x, ir)[: len(x)]


def fundido_final(x: np.ndarray, dur: float) -> np.ndarray:
    n = int(dur * FS)
    x = x.copy()
    x[-n:] *= rampa(n)[::-1]
    return x


def suave(t: np.ndarray, t0: float, t1: float) -> np.ndarray:
    """Curva en S de 0 a 1 entre t0 y t1."""
    s = np.clip((t - t0) / (t1 - t0), 0, 1)
    return s * s * (3 - 2 * s)


def crecer_db(t: np.ndarray, desde_db: float, hasta_s: float) -> np.ndarray:
    """Ganancia que sube de `desde_db` a 0 dB en `hasta_s` segundos, pareja al oído (lineal en dB)."""
    return 10 ** (desde_db * (1 - suave(t, 0, hasta_s)) / 20)


def ruido_coloreado(n: int, rng, forma) -> np.ndarray:
    """Ruido con el espectro de amplitud `forma(f)`, hecho por FFT."""
    espectro = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / FS)
    y = np.fft.irfft(espectro * forma(np.maximum(f, 1.0)), n)
    return y / np.std(y)


# ---------------------------------------------------------------- timbres

def vibrafono(f0, dur, rng):
    y = modos(f0, [(1.0, 1.0, 1.5, 0), (4.0, 0.16, 0.40, 0), (9.94, 0.035, 0.11, 0)], dur, rng, ataque_s=0.0015)
    y *= 1 - 0.12 * (0.5 - 0.5 * np.cos(2 * np.pi * 5.2 * tiempo(dur)))
    pegar(y, golpe(0.006, 3000, rng), 0, 0.02)
    return y


def marimba(f0, dur, rng):
    tau = 0.55 * (784 / f0) ** 0.6
    y = modos(f0, [(1.0, 1.0, tau, 0), (3.93, 0.30, tau * 0.25, 0), (9.24, 0.07, 0.035, 0)], dur, rng, ataque_s=0.001)
    pegar(y, golpe(0.012, 1800, rng, ancho=1.2), 0, 0.06)
    return y


def kalimba(f0, dur, rng):
    tau = 0.9 * (1047 / f0) ** 0.5
    y = modos(f0, [(1.0, 1.0, tau, 0), (6.27, 0.16, 0.06, 0), (17.55, 0.04, 0.015, 0)], dur, rng,
              ataque_s=0.0008, caida_afinacion=0.003)
    pegar(y, golpe(0.004, 2500, rng, ancho=1.5), 0, 0.05)
    return y


def campana(f0, dur, rng, brillo=1.0):
    parciales = [(1.0, 1.0, 2.2, 0.7), (2.756, 0.32 * brillo, 1.0, 1.3),
                 (5.404, 0.12 * brillo, 0.45, 2.1), (8.933, 0.04 * brillo, 0.2, 0)]
    y = modos(f0, parciales, dur, rng, ataque_s=0.002)
    pegar(y, golpe(0.004, 4000, rng), 0, 0.03)
    return y


def cuenco(f0, dur, rng):
    parciales = [(1.0, 1.0, 7.0, 0.9), (2.71, 0.65, 4.5, 2.2), (5.15, 0.30, 2.4, 3.1), (8.43, 0.10, 1.1, 4.3)]
    y = modos(f0, parciales, dur, rng, ataque_s=0.006)
    pegar(y, golpe(0.010, 900, rng, ancho=1.0), 0, 0.04)
    return y


def tubo_de_viento(f0, dur, rng):
    parciales = [(1.0, 1.0, 2.6, rng.uniform(0.6, 1.4)), (2.756, 0.38, 0.9, rng.uniform(1.0, 2.2)),
                 (5.404, 0.08, 0.35, 0)]
    y = modos(f0, parciales, dur, rng, ataque_s=0.001)
    pegar(y, golpe(0.003, 5000, rng), 0, 0.03)
    return y


# ---------------------------------------------------------------- alertar

def alertar_amanecer(rng):
    """Vibráfono: arpegio que sube (La mayor), tres veces y cada vez más fuerte, y un acorde final."""
    y = lienzo(8.0)
    arpegio = ["A5", "C#6", "E6", "A6"]
    for inicio, g in ((0.10, 0.45), (1.90, 0.70), (3.70, 1.00)):
        for i, nota in enumerate(arpegio):
            pegar(y, vibrafono(NOTA[nota], 3.0, rng), inicio + 0.16 * i, g * (0.9 + 0.1 * i / 3))
    for i, nota in enumerate(["A5", "E6", "A6"]):
        pegar(y, vibrafono(NOTA[nota], 3.0, rng), 5.35 + 0.025 * i, 0.55)
    y = filtro(y, "highpass", 200)
    return fundido_final(sala(y, 1.6, 0.30, rng), 0.8)


def alertar_marimba(rng):
    """Marimba de madera: un motivo alegre de seis notas (Sol mayor pentatónica), dos veces."""
    y = lienzo(5.2)
    motivo = [("D6", 0.00), ("B5", 0.15), ("D6", 0.30), ("G6", 0.45), ("E6", 0.90), ("D6", 1.05), ("G6", 1.35)]
    for inicio, g in ((0.08, 0.70), (2.30, 1.00)):
        for nota, t in motivo:
            pegar(y, marimba(NOTA[nota], 1.8, rng), inicio + t, g)
    y = filtro(y, "highpass", 250)
    return fundido_final(sala(y, 1.1, 0.22, rng), 0.5)


def alertar_campana(rng):
    """Campana clara de tres notas que suben (Sol-Do-Mi), como un aviso de altavoz, dos veces."""
    y = lienzo(7.0)
    for inicio, g in ((0.08, 0.60), (2.90, 1.00)):
        for i, nota in enumerate(["G5", "C6", "E6"]):
            pegar(y, campana(NOTA[nota], 4.0, rng, brillo=0.9), inicio + 0.42 * i, g)
    y = filtro(y, "highpass", 250)
    return fundido_final(sala(y, 1.8, 0.28, rng), 0.9)


def alertar_kalimba(rng):
    """Kalimba: una melodía corta y juguetona (Do mayor pentatónica), dos veces, la segunda más fuerte."""
    y = lienzo(5.5)
    melodia = [("E6", 0.00), ("G6", 0.14), ("A6", 0.28), ("G6", 0.42), ("E6", 0.56), ("D6", 0.84), ("E6", 1.12)]
    for inicio, g in ((0.08, 0.65), (2.40, 1.00)):
        for nota, t in melodia:
            pegar(y, kalimba(NOTA[nota], 2.2, rng), inicio + t, g)
    y = filtro(y, "highpass", 250)
    return fundido_final(sala(y, 1.3, 0.25, rng), 0.7)


# ---------------------------------------------------------------- relajar

def relajar_cuenco(rng):
    """Cuenco tibetano (Sol4) golpeado tres veces con mazo de fieltro, cada vez un poco más fuerte."""
    y = lienzo(11.85)
    for inicio, g in ((0.10, 0.45), (3.70, 0.70), (7.30, 1.00)):
        pegar(y, cuenco(NOTA["G4"], 12.0, rng), inicio, g)
    y = filtro(y, "highpass", 150)
    return fundido_final(sala(y, 2.4, 0.32, rng), 2.0)


def relajar_campanitas(rng):
    """Campanitas de viento (Re mayor pentatónica): el viento empieza suave y va trayendo más toques."""
    y = lienzo(11.0)
    notas = ["D6", "E6", "F#6", "A6", "B6"]
    t, anterior = 0.15, None
    while t < 8.6:
        tasa = 1.2 + 2.3 * suave(np.array([t]), 0, 6.0)[0]      # toques por segundo, crece con el viento
        eleccion = rng.choice([n for n in notas if n != anterior])
        fuerza = rng.uniform(0.35, 1.0) * (0.35 + 0.65 * suave(np.array([t]), 0, 5.0)[0])
        pegar(y, tubo_de_viento(NOTA[eleccion], 3.5, rng), t, fuerza)
        anterior = eleccion
        t += rng.exponential(1 / tasa) + 0.05
    tt = tiempo(len(y) / FS)
    viento = filtro(ruido_coloreado(len(y), rng, lambda f: 1 / np.sqrt(f)), "bandpass", [300, 2000])
    viento *= 0.012 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * tt)) * suave(tt, 0, 4.0)
    y = filtro(y + viento, "highpass", 250)
    return fundido_final(sala(y, 1.9, 0.26, rng), 1.5)


def gotas(dur, tasa_inicial, tasa_final, hasta_s, rng):
    """Gotas sueltas: golpecitos agudos y algún «plink» (burbuja que sube de tono)."""
    y = lienzo(dur)
    t = 0.0
    while True:
        tasa = tasa_inicial + (tasa_final - tasa_inicial) * suave(np.array([t]), 0, hasta_s)[0]
        t += rng.exponential(1 / tasa)
        if t > dur - 0.1:
            return y
        fuerza = min(1.0, rng.lognormal(-1.6, 0.6))
        if rng.random() < 0.7:
            pegar(y, golpe(rng.uniform(0.001, 0.003), rng.uniform(1500, 5000), rng, ancho=1.2), t, fuerza)
        else:
            d = rng.uniform(0.012, 0.03)
            tt = tiempo(d)
            f0 = np.exp(rng.uniform(np.log(1500), np.log(4000)))
            f = f0 * (1 + rng.uniform(0.2, 0.4) * tt / d)
            plink = np.sin(2 * np.pi * np.cumsum(f) / FS) * np.exp(-tt / rng.uniform(0.004, 0.010))
            m = int(0.0003 * FS)
            plink[:m] *= rampa(m)
            pegar(y, con_final_suave(plink), t, 0.6 * fuerza)


def relajar_lluvia(rng):
    """Lluvia suave que arranca casi en silencio y crece despacio, con gotas sueltas."""
    dur = 11.85
    t = tiempo(dur)
    lecho = ruido_coloreado(len(t), rng, lambda f: 1 / np.sqrt(f))
    lecho = filtro(filtro(lecho, "bandpass", [450, 5000]), "lowpass", 5000)
    lecho *= 1 + 0.12 * np.sin(2 * np.pi * 0.23 * t + 1.0) + 0.08 * np.sin(2 * np.pi * 0.51 * t + 2.0)
    lecho /= np.std(lecho)
    y = 0.22 * lecho + gotas(dur, 25, 110, 6.0, rng)
    y *= crecer_db(t, -38, 6.5)
    y = filtro(y, "highpass", 200)
    return fundido_final(y, 1.8)


def relajar_ruido_marron(rng):
    """Ruido marrón que crece despacio y respira como el mar lejano (olas de ~5,5 s)."""
    dur = 11.85
    t = tiempo(dur)
    marron = ruido_coloreado(len(t), rng, lambda f: 1 / np.sqrt(1 + (f / 350.0) ** 2))
    marron = filtro(filtro(marron, "highpass", 120), "lowpass", 3500)
    # Agudos = total - graves: así las dos bandas suman exacto. Un pasa-bajos y un pasa-altos
    # Butterworth de 2.º orden en la misma frecuencia están en contrafase y dejaban un pozo en 650 Hz.
    graves = filtro(marron, "lowpass", 650)
    agudos = marron - graves
    ola = 0.5 - 0.5 * np.cos(2 * np.pi * t / 5.5 + 0.4 * np.sin(2 * np.pi * t / 13.0))
    y = graves * (0.70 + 0.30 * ola) + agudos * (0.30 + 0.70 * ola ** 1.5)
    y *= crecer_db(t, -36, 7.5)
    return fundido_final(y, 1.8)


# ---------------------------------------------------------------- campanita de la voz

def nota_de_campanita(f0, dur, rng):
    """Una campana chica: las proporciones de `campana` con decaimientos cortos (se apaga en ~0,4 s)."""
    parciales = [(1.0, 1.0, 0.32, 0.7), (2.756, 0.30, 0.16, 1.3), (5.404, 0.10, 0.08, 2.1), (8.933, 0.03, 0.04, 0)]
    y = modos(f0, parciales, dur, rng, ataque_s=0.0015)
    pegar(y, golpe(0.004, 4000, rng), 0, 0.03)
    return y


def campanita(rng):
    """Dos golpes que suben una quinta (La5 → Mi6), 0,12 s entre uno y otro. Dura 0,9 s con la cola."""
    y = lienzo(0.9)
    pegar(y, nota_de_campanita(NOTA["A5"], 0.8, rng), 0.0, 0.8)
    pegar(y, nota_de_campanita(NOTA["E6"], 0.8, rng), 0.12, 1.0)
    y = filtro(y, "highpass", 300)
    return fundido_final(sala(y, 0.6, 0.15, rng), 0.35)


SEMILLA_CAMPANITA = SEMILLA + 100

# El nombre es el del archivo (`<nombre>.mp3` en `assets/sonidos/`). El ORDEN fija la semilla de cada
# uno (`SEMILLA + i`): cambiarlo cambia los sonidos.
SONIDOS = {
    "alertar_amanecer": (alertar_amanecer, LUFS_ALERTAR),
    "alertar_marimba": (alertar_marimba, LUFS_ALERTAR),
    "alertar_campana": (alertar_campana, LUFS_ALERTAR),
    "alertar_kalimba": (alertar_kalimba, LUFS_ALERTAR),
    "relajar_cuenco": (relajar_cuenco, LUFS_RELAJAR),
    "relajar_campanitas": (relajar_campanitas, LUFS_RELAJAR),
    "relajar_lluvia": (relajar_lluvia, LUFS_RELAJAR),
    "relajar_ruido_marron": (relajar_ruido_marron, LUFS_RELAJAR),
}


def main() -> None:
    carpeta_wav, carpeta_mp3 = Path(sys.argv[1]), Path(sys.argv[2])
    for i, (nombre, (funcion, lufs)) in enumerate(SONIDOS.items()):
        rng = np.random.default_rng(SEMILLA + i)
        audio = funcion(rng)
        datos = ta.terminar(audio, FS, carpeta_wav / f"{nombre}.wav", carpeta_mp3 / f"{nombre}.mp3", lufs=lufs,
                            kbps=ta.KBPS_ALARMAS, silencio_inicio_s=0.03, silencio_fin_s=0.10,
                            fundido_entrada_s=0.004, fundido_salida_s=0.05)
        print(nombre, datos, flush=True)


if __name__ == "__main__":
    main()
