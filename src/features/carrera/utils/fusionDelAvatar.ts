import { distanciaM, puntoDestino, type Coordenada } from './geo';

/**
 * Dónde se DIBUJA a la persona en el mapa (FR-031 y FR-032): el avatar responde a cada paso del podómetro al instante, sin esperar
 * al GPS, y se reconcilia suavemente con el GPS cuando llega un punto bueno. Puras.
 *
 * Esto solo mueve el dibujo: los km oficiales salen del GPS filtrado (FR-034, `motorDeCarrera`).
 */

/** Tope de la animación de reconciliación (FR-032). */
export const RECONCILIAR_MS = 600;
/** Más lejos que esto, el avatar se coloca en la posición real sin animar el recorrido. */
export const SALTO_SIN_ANIMAR_M = 30;
/** Cuánto dura la animación de un paso del avatar: el mapa se mueve una zancada con el «tic» del paso. */
export const PASO_MS = 250;

export interface PosicionDelAvatar {
  posicion: Coordenada | null;
  /** Rumbo hacia donde mira (grados), de la brújula o del último tramo de GPS. */
  rumbo: number;
  /** Instante del último paso: el avatar camina mientras hubo pasos en el último segundo y medio. */
  ultimoPasoMs: number | null;
}

/** Cómo llevar la cámara a la nueva posición. */
export interface MovimientoDelAvatar {
  estado: PosicionDelAvatar;
  /** Duración de la animación, 0 = colocar sin animar. */
  duracionMs: number;
}

export const AVATAR_INICIAL: PosicionDelAvatar = { posicion: null, rumbo: 0, ultimoPasoMs: null };

/**
 * `pasos` nuevos: el avatar avanza `pasos × zancada` en la dirección del rumbo, en el mismo instante (< 500 ms desde el paso,
 * SC-005). Sin posición conocida todavía (sin GPS), solo se anota el paso: la animación de caminar arranca igual.
 */
export function alDarPasos(e: PosicionDelAvatar, pasos: number, zancadaM: number, ahora: number): MovimientoDelAvatar {
  if (!(pasos > 0)) return { estado: e, duracionMs: 0 };
  const posicion = e.posicion ? puntoDestino(e.posicion, e.rumbo, pasos * zancadaM) : null;
  return { estado: { ...e, posicion, ultimoPasoMs: ahora }, duracionMs: Math.min(PASO_MS, RECONCILIAR_MS) };
}

/**
 * Un punto bueno del GPS (ya filtrado y suavizado): el avatar se lleva a la posición real en ≤ 600 ms; si la diferencia es mayor a
 * 30 m, se coloca sin animar. El rumbo se toma del avance si la persona se movió más de 2 m (sin brújula sirve igual).
 */
export function alPuntoGps(e: PosicionDelAvatar, real: Coordenada, rumboDeLaBrujula: number | null = null): MovimientoDelAvatar {
  if (!e.posicion) return { estado: { ...e, posicion: real, rumbo: rumboDeLaBrujula ?? e.rumbo }, duracionMs: 0 };
  const diferencia = distanciaM(e.posicion, real);
  const rumbo = rumboDeLaBrujula ?? e.rumbo;
  return {
    estado: { ...e, posicion: real, rumbo },
    duracionMs: diferencia > SALTO_SIN_ANIMAR_M ? 0 : RECONCILIAR_MS,
  };
}

/** Cambia el rumbo (brújula o rumbo del GPS). */
export function conRumbo(e: PosicionDelAvatar, rumbo: number | null | undefined): PosicionDelAvatar {
  if (rumbo == null || !Number.isFinite(rumbo) || rumbo < 0) return e;
  return { ...e, rumbo: rumbo % 360 };
}

/** ¿El avatar camina? Solo con pasos en el último segundo y medio, o con velocidad, y nunca en pausa (FR-038). */
export function avatarCamina(e: PosicionDelAvatar, ahora: number, enPausa: boolean, velocidadKmh: number | null): boolean {
  if (enPausa) return false;
  if (e.ultimoPasoMs != null && ahora - e.ultimoPasoMs <= 1_500) return true;
  return velocidadKmh != null && velocidadKmh >= 1;
}

/** El avatar según `sexo` de la ficha inicial (FR-038): hombre, mujer o neutral (sin dato u «Otro»). */
export type FiguraDelAvatar = 'hombre' | 'mujer' | 'neutral';

export function figuraDelAvatar(sexo: string | null | undefined): FiguraDelAvatar {
  const s = (sexo ?? '').trim().toLowerCase();
  if (s === 'masculino' || s === 'hombre') return 'hombre';
  if (s === 'femenino' || s === 'mujer') return 'mujer';
  return 'neutral';
}
