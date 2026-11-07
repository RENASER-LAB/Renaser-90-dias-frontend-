import { describe, expect, it } from '@jest/globals';

import { ACCION_ABRIR, ACCION_PAUSAR, ACCION_SEGUIR, CATEGORIA_CARRERA, CATEGORIA_CARRERA_EN_PAUSA, ID_NOTIFICACION_CARRERA } from '../avisoDeCarrera';
import { accionDelToque, contenidoDeLaNotificacion, datosDeLaNotificacion, laCarreraYaEmpezo, marcaDelToque } from '../notificacionUnica';

describe('la notificación única de la carrera', () => {
  // spec 042 FR-011
  it('corriendo: «Corriendo · 3,25 km», el ritmo en el texto (el tiempo lo lleva el cronómetro), con «Pausar» y «Abrir»', () => {
    const c = contenidoDeLaNotificacion({ metros: 3250, activoMs: 1_264_000, ritmo: 389, enPausa: false }, '00:21:04');
    expect(c.title).toBe('Corriendo · 3,25 km');
    expect(c.body).toBe('Ritmo 6:29 min/km');
    expect(c.categoryIdentifier).toBe(CATEGORIA_CARRERA);
  });

  // spec 042 FR-011
  it('en pausa: lo dice en el título y lleva «Seguir» en lugar de «Pausar»', () => {
    const c = contenidoDeLaNotificacion({ metros: 1000, activoMs: 300_000, ritmo: null, enPausa: true }, '00:05:00');
    expect(c.title).toBe('En pausa · 1,00 km');
    // Sin cronómetro en pausa: el tiempo va fijo en el texto.
    expect(c.body).toBe('00:05:00 · Ritmo –:–– min/km');
    expect(c.categoryIdentifier).toBe(CATEGORIA_CARRERA_EN_PAUSA);
    expect(c.categoryIdentifier).not.toBe(CATEGORIA_CARRERA);
  });

  // spec 042 FR-011
  it('los datos para el parche nativo: el cronómetro empieza en «ahora − tiempo activo» y dice si está en pausa', () => {
    expect(datosDeLaNotificacion({ metros: 3250, activoMs: 1_264_000, ritmo: 389, enPausa: false }, 2_000_000)).toEqual({
      carrera: true,
      enPausa: false,
      inicioCronometroMs: 736_000,
    });
    expect(datosDeLaNotificacion({ metros: 0, activoMs: 0, ritmo: null, enPausa: true }, 5_000).enPausa).toBe(true);
  });

  // spec 042 FR-011
  it('durante la cuenta regresiva no se publica (la carrera existe, en pausa, pero no empezó)', () => {
    expect(laCarreraYaEmpezo(null)).toBe(false);
    expect(laCarreraYaEmpezo({ desdeMs: null, activoAcumuladoMs: 0 })).toBe(false);
    expect(laCarreraYaEmpezo({ desdeMs: 1000, activoAcumuladoMs: 0 })).toBe(true);
    expect(laCarreraYaEmpezo({ desdeMs: null, activoAcumuladoMs: 4200 })).toBe(true);
  });

  const toque = (accion: string, date: number, identifier = ID_NOTIFICACION_CARRERA) => ({
    actionIdentifier: accion,
    notification: { date, request: { identifier } },
  });
  const AHORA = 1_000_000_000;
  const corriendo = { fase: 'corriendo' as const, iniciadaEnMs: AHORA - 600_000 };
  const enPausa = { fase: 'pausa' as const, iniciadaEnMs: AHORA - 600_000 };

  // spec 042 FR-011
  it('«Pausar» pausa la carrera que corre y «Seguir» sigue la que está en pausa; al revés solo abre', () => {
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 5000), corriendo, AHORA)).toBe('pausar');
    expect(accionDelToque(toque(ACCION_SEGUIR, AHORA - 5000), enPausa, AHORA)).toBe('seguir');
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 5000), enPausa, AHORA)).toBe('abrir');
    expect(accionDelToque(toque(ACCION_SEGUIR, AHORA - 5000), corriendo, AHORA)).toBe('abrir');
    expect(accionDelToque(toque(ACCION_ABRIR, AHORA - 5000), corriendo, AHORA)).toBe('abrir');
  });

  // spec 042 FR-011
  it('al abrir la app no atiende un toque de otra carrera, uno viejo ni otro aviso', () => {
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 700_000), corriendo, AHORA)).toBeNull();
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 11 * 60_000), { ...corriendo, iniciadaEnMs: AHORA - 3_600_000 }, AHORA)).toBeNull();
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 5000, 'habito-x-inicio'), corriendo, AHORA)).toBeNull();
    expect(accionDelToque(toque(ACCION_PAUSAR, AHORA - 5000), null, AHORA)).toBeNull();
    expect(accionDelToque(null, corriendo, AHORA)).toBeNull();
  });

  it('la marca distingue cada toque (el mismo llega por el oyente y por la última respuesta)', () => {
    expect(marcaDelToque(toque(ACCION_PAUSAR, 5))).toBe(marcaDelToque(toque(ACCION_PAUSAR, 5)));
    expect(marcaDelToque(toque(ACCION_PAUSAR, 5))).not.toBe(marcaDelToque(toque(ACCION_PAUSAR, 6)));
  });
});
