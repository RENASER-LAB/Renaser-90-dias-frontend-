/**
 * La tarjeta de un hábito en Training después del rediseño (decisiones del dueño, 2026-10-05).
 *
 * Contra el código anterior falla: el botón era siempre una cámara con «SUBIR»/«VER»; tocar un
 * hábito cumplido abría el diálogo «Ya está cumplido»; entregar una evidencia decía «¡Evidencia de
 * Verdad Sellada! 🦅» en un diálogo; y «Guías y audios» se mostraba vacío («EN DESARROLLO»).
 */
import { describe, expect, it } from '@jest/globals';

import {
  accionDeLaTarjeta,
  avisoDeEvidenciaEntregada,
  detalleDelCumplido,
  horaLocal,
  muestraElCumplidoEnLaTarjeta,
  seccionesDeLaDimension,
  type HabitoDeLaTarjeta,
} from '../tarjetaDelHabito';

const pendiente = (systemKey: string | null = null): HabitoDeLaTarjeta => ({ done: false, hasEvidence: false, systemKey });

describe('el botón dice lo que pasa al tocarlo', () => {
  it('Despertar y Dormir se quedan con «Subir» y la cámara (decisión 7 del dueño: registran la hora)', () => {
    expect(accionDeLaTarjeta(pendiente('WAKE_UP'))).toEqual({ icono: 'camera', etiqueta: 'Subir' });
    expect(accionDeLaTarjeta(pendiente('SLEEP'))).toEqual({ icono: 'camera', etiqueta: 'Subir' });
  });

  it('el audio se escucha, la clase se ve en Cursos, el post se publica en el Muro', () => {
    expect(accionDeLaTarjeta(pendiente('PASTILLA_RENACER')).icono).toBe('headphones');
    expect(accionDeLaTarjeta(pendiente('AUDIO_THERAPY_WEEKLY')).icono).toBe('headphones');
    expect(accionDeLaTarjeta(pendiente('DAILY_CLASS')).icono).toBe('bookOpen');
    expect(accionDeLaTarjeta(pendiente('COMMUNITY_POST')).icono).toBe('newspaper');
    expect(accionDeLaTarjeta(pendiente(null))).toEqual({ icono: 'camera', etiqueta: 'Subir' });
  });

  it('lo ya hecho o ya entregado se mira (ojo), en tipo oración', () => {
    expect(accionDeLaTarjeta({ ...pendiente('WAKE_UP'), done: true })).toEqual({ icono: 'eye', etiqueta: 'Ver' });
    expect(accionDeLaTarjeta({ ...pendiente(null), hasEvidence: true })).toEqual({ icono: 'eye', etiqueta: 'Ver' });
    for (const k of [null, 'WAKE_UP', 'PASTILLA_RENACER', 'DAILY_CLASS', 'COMMUNITY_POST']) {
      const { etiqueta } = accionDeLaTarjeta(pendiente(k));
      expect(etiqueta).not.toBe(etiqueta.toUpperCase());
    }
  });
});

describe('un hábito cumplido se lee en la misma tarjeta (decisión 13)', () => {
  it('los de cierre genérico, Despertar/Dormir, la Audioterapia y el post se despliegan; Pastilla y Clase abren su ventana', () => {
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente('WAKE_UP'), done: true })).toBe(true);
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente(null), done: true })).toBe(true);
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente('AUDIO_THERAPY_WEEKLY'), done: true })).toBe(true);
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente('COMMUNITY_POST'), done: true })).toBe(true);
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente('PASTILLA_RENACER'), done: true })).toBe(false);
    expect(muestraElCumplidoEnLaTarjeta({ ...pendiente('DAILY_CLASS'), done: true })).toBe(false);
    expect(muestraElCumplidoEnLaTarjeta(pendiente(null))).toBe(false);
  });

  it('dice la hora y los puntos del SERVIDOR, y lo que escribió', () => {
    const completadoEn = new Date(2026, 9, 5, 6, 12).toISOString();
    expect(detalleDelCumplido({ done: true, hasEvidence: false, completadoEn, puntosOtorgados: 8, respuestaTexto: '  Me sentí liviano ' }))
      .toEqual({ linea: 'Cumplido a las 06:12 · +8 pts', escrito: 'Me sentí liviano' });
  });

  it('sin datos del servidor no inventa nada: ni hora, ni puntos, ni texto', () => {
    expect(detalleDelCumplido({ done: true, hasEvidence: false })).toEqual({ linea: 'Cumplido', escrito: null });
    expect(detalleDelCumplido({ done: true, hasEvidence: false, puntosOtorgados: 0, respuestaTexto: '   ' }))
      .toEqual({ linea: 'Cumplido', escrito: null });
    expect(horaLocal('no es una fecha')).toBeNull();
  });
});

describe('el aviso al entregar (decisión 9)', () => {
  it('«Evidencia entregada», con los puntos solo si el backend los trae', () => {
    expect(avisoDeEvidenciaEntregada(7)).toBe('Evidencia entregada · +7 pts');
    expect(avisoDeEvidenciaEntregada(0)).toBe('Evidencia entregada');
    expect(avisoDeEvidenciaEntregada(null)).toBe('Evidencia entregada');
    expect(avisoDeEvidenciaEntregada(undefined)).toBe('Evidencia entregada');
  });
});

describe('«Guías y audios» (decisión 8)', () => {
  it('se esconde sin contenido y vuelve cuando lo tenga', () => {
    expect(seccionesDeLaDimension(0)).toEqual(['habitos']);
    expect(seccionesDeLaDimension(2)).toEqual(['habitos', 'guias']);
  });
});
