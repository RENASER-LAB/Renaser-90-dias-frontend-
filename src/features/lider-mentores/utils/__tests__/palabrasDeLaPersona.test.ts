import { describe, expect, it } from '@jest/globals';

import type { AccionDeLaPersona, ObligacionDeLaPersona } from '../../types/cumplimientoDelLider.types';
import {
  accionEnPalabras,
  contadorDelDia,
  dichoDeLaObligacion,
  entregaEnPalabras,
  estadoDeLaObligacionEnPalabras,
  motivoDelDiaEnPalabras,
  queSePuedeAbrir,
  resumenDeLaSemanaEnPalabras,
  rolEnPalabras,
  textoDelFalloDeEvidencia,
  textoDelFalloDeLaPublicacion,
  tipoDeEvidenciaEnPalabras,
} from '../palabrasDeLaPersona';

/**
 * Cómo se DICE la semana de una persona al líder (spec 005). Las reglas: el color y la forma nunca van solos
 * (RL-30), la falta de datos jamás se dice como incumplimiento, y lo que no se entiende no se afirma.
 */

function o(cambios: Partial<ObligacionDeLaPersona> = {}): ObligacionDeLaPersona {
  return {
    registroId: 'r1',
    titulo: 'Ritual de la mañana',
    estado: 'COMPLETADO',
    requiereEvidencia: false,
    entrega: 'NO_REQUERIDA',
    entregadaEn: null,
    revision: null,
    evidenciaId: null,
    respuestaTexto: null,
    evidencias: [],
    publicacionId: null,
    ...cambios,
  };
}

const FOTO = { id: 'e1', tipo: 'FOTO', subidaEn: null };

describe('el estado de un hábito', () => {
  it('cumplido con evidencia, o sin ella porque no la exige (US2, escenario 6)', () => {
    expect(estadoDeLaObligacionEnPalabras(o({ requiereEvidencia: true, entrega: 'ENTREGADA', evidencias: [FOTO] }))).toBe('Cumplido');
    expect(estadoDeLaObligacionEnPalabras(o())).toBe('Cumplido · sin evidencia');
  });

  it('cumplido con solo el «¿Qué sentiste?» o con la publicación del Muro ya tiene algo que ver', () => {
    expect(estadoDeLaObligacionEnPalabras(o({ respuestaTexto: 'Bien' }))).toBe('Cumplido');
    expect(estadoDeLaObligacionEnPalabras(o({ publicacionId: 'pub1' }))).toBe('Cumplido');
  });

  it('cumplido pero que debía evidencia y no la entregó: no dice «sin evidencia» a secas, lo dice la entrega', () => {
    const sinEntregar = o({ requiereEvidencia: true, entrega: 'SIN_ENTREGA' });
    expect(estadoDeLaObligacionEnPalabras(sinEntregar)).toBe('Cumplido');
    expect(entregaEnPalabras(sinEntregar)).toBe('Evidencia sin entregar');
  });

  it('no cumplido, vencido, en curso y pendiente, cada uno con su palabra', () => {
    expect(estadoDeLaObligacionEnPalabras(o({ estado: 'FALLIDO' }))).toBe('No cumplido');
    expect(estadoDeLaObligacionEnPalabras(o({ estado: 'EXPIRADO' }))).toBe('Venció');
    expect(estadoDeLaObligacionEnPalabras(o({ estado: 'EN_CURSO' }))).toBe('En curso');
    expect(estadoDeLaObligacionEnPalabras(o({ estado: 'PENDIENTE' }))).toBe('Pendiente');
  });

  it('un estado que esta versión no conoce no se afirma como otra cosa', () => {
    expect(estadoDeLaObligacionEnPalabras(o({ estado: 'RARO' }))).toBe('Sin estado');
    expect(estadoDeLaObligacionEnPalabras(o({ estado: '' }))).toBe('Sin estado');
  });
});

describe('la entrega de la evidencia', () => {
  it('no se menciona cuando el hábito no la exige', () => {
    expect(entregaEnPalabras(o())).toBeNull();
    expect(entregaEnPalabras(o({ entrega: null }))).toBeNull();
  });

  it('entregada: con lo que dijo quien la revisó, sin convertir la falta de revisión en rechazo', () => {
    const base = o({ requiereEvidencia: true, entrega: 'ENTREGADA', evidencias: [FOTO] });
    expect(entregaEnPalabras({ ...base, revision: 'VALIDA' })).toBe('Evidencia entregada · verificada');
    expect(entregaEnPalabras({ ...base, revision: 'RECHAZADA' })).toBe('Evidencia entregada · rechazada');
    expect(entregaEnPalabras({ ...base, revision: 'REVISION_MANUAL' })).toBe('Evidencia entregada · en revisión');
    expect(entregaEnPalabras({ ...base, revision: null })).toBe('Evidencia entregada · pendiente de revisión');
  });

  it('el post diario dice que se publicó en el Muro, no «pendiente de revisión»', () => {
    expect(entregaEnPalabras(o({ entrega: 'ENTREGADA', publicacionId: 'pub1' }))).toBe('Publicado en el Muro');
  });
});

describe('qué se puede abrir de un hábito', () => {
  it('«Ver evidencia» con archivos o con las respuestas escritas; «Ver publicación» con la del Muro', () => {
    expect(queSePuedeAbrir(o({ evidencias: [FOTO] }))).toEqual({ evidencia: true, publicacion: false });
    expect(queSePuedeAbrir(o({ respuestaTexto: 'Me sentí bien' }))).toEqual({ evidencia: true, publicacion: false });
    expect(queSePuedeAbrir(o({ publicacionId: 'pub1' }))).toEqual({ evidencia: false, publicacion: true });
  });

  it('un hábito cumplido sin nada que ver no ofrece un botón que no abre nada', () => {
    expect(queSePuedeAbrir(o())).toEqual({ evidencia: false, publicacion: false });
  });
});

describe('el motivo de un día sin nada que medir', () => {
  it('se dice en palabras, nunca como incumplimiento', () => {
    expect(motivoDelDiaEnPalabras('PAUSADO')).toBe('En pausa');
    expect(motivoDelDiaEnPalabras('CUENTA_SUSPENDIDA')).toBe('Cuenta en pausa');
    expect(motivoDelDiaEnPalabras('NO_ACTIVADO')).toBe('Todavía no empezaba su programa');
    expect(motivoDelDiaEnPalabras('SIN_NADA_PLANIFICADO')).toBe('Nada programado este día');
    for (const motivo of ['PAUSADO', 'CUENTA_SUSPENDIDA', 'NO_ACTIVADO', 'SIN_NADA_PLANIFICADO']) {
      expect(motivoDelDiaEnPalabras(motivo)).not.toMatch(/no cumpl|incumpl|fall|✗/i);
    }
  });

  it('un motivo nuevo del servidor se dice en neutro, y sin motivo no hay nada que decir', () => {
    expect(motivoDelDiaEnPalabras('OTRO_MOTIVO')).toBe('Sin hábitos que medir este día');
    expect(motivoDelDiaEnPalabras(null)).toBeNull();
  });
});

describe('lo que se oye al llegar a un hábito', () => {
  it('título, estado y entrega', () => {
    expect(dichoDeLaObligacion(o({ requiereEvidencia: true, entrega: 'ENTREGADA', evidencias: [FOTO], revision: 'VALIDA' }))).toBe(
      'Ritual de la mañana. Cumplido. Evidencia entregada · verificada.',
    );
    expect(dichoDeLaObligacion(o({ estado: 'PENDIENTE' }))).toBe('Ritual de la mañana. Pendiente.');
  });
});

describe('las acciones del día', () => {
  const a = (estado: string): AccionDeLaPersona => ({ id: 'a1', titulo: 'Llamar a 3 clientes', estado, evidenciaId: null });

  it('hecha, pendiente y no cumplida; un estado raro no se afirma', () => {
    expect(accionEnPalabras(a('COMPLETADA'))).toBe('Cumplida');
    expect(accionEnPalabras(a('PENDIENTE'))).toBe('Pendiente');
    expect(accionEnPalabras(a('FALLIDA'))).toBe('No cumplida');
    expect(accionEnPalabras(a('QUIEN SABE'))).toBeNull();
  });
});

describe('el contador de un día', () => {
  it('cuenta los hábitos cumplidos del día, sin inventar un porcentaje', () => {
    const dia = { obligaciones: [o(), o({ estado: 'PENDIENTE' }), o({ estado: 'EXPIRADO' })] };
    expect(contadorDelDia(dia)).toBe('1 de 3 hábitos cumplidos');
    expect(contadorDelDia({ obligaciones: [o()] })).toBe('1 de 1 hábito cumplido');
    expect(contadorDelDia({ obligaciones: [] })).toBeNull();
  });
});

describe('el resumen de la semana', () => {
  it('con las mismas palabras de la ficha del mentor', () => {
    expect(resumenDeLaSemanaEnPalabras({ obligaciones: 35, cumplidas: 30, conEntrega: 12, pendientes: 3, sinCumplir: 2 })).toBe(
      '30 cumplidos · 2 sin cumplir · 3 pendientes · 12 con evidencia',
    );
  });
});

describe('quién es quien no se mide', () => {
  it('el mentor y la guía de aprendiz; otro rol, nada', () => {
    expect(rolEnPalabras('MENTOR')).toBe('Mentor');
    expect(rolEnPalabras('TRAINEE_GUIDE')).toBe('Guía de aprendiz');
    expect(rolEnPalabras('GUIA_APRENDIZ')).toBe('Guía de aprendiz');
    expect(rolEnPalabras('TRAINEE')).toBeNull();
    expect(rolEnPalabras(null)).toBeNull();
  });
});

describe('el tipo de una evidencia', () => {
  it('en palabras', () => {
    expect(tipoDeEvidenciaEnPalabras('FOTO')).toBe('Foto');
    expect(tipoDeEvidenciaEnPalabras('AUDIO')).toBe('Audio');
    expect(tipoDeEvidenciaEnPalabras('VIDEO')).toBe('Video');
    expect(tipoDeEvidenciaEnPalabras('TEXTO')).toBe('Texto');
    expect(tipoDeEvidenciaEnPalabras(null)).toBe('Evidencia');
  });
});

describe('cuando una evidencia no se abre', () => {
  it('«Ya no está disponible» no ofrece reintentar: repetir no la trae de vuelta', () => {
    expect(textoDelFalloDeEvidencia('no_disponible')).toEqual({ texto: 'Ya no está disponible.', reintentar: false });
  });

  it('sin permiso tampoco; sin red y error sí', () => {
    expect(textoDelFalloDeEvidencia('sin_permiso').reintentar).toBe(false);
    expect(textoDelFalloDeEvidencia('sin_red').reintentar).toBe(true);
    expect(textoDelFalloDeEvidencia('error').reintentar).toBe(true);
  });
});

describe('cuando una publicación del Muro no se abre', () => {
  it('«Ya no está disponible» (404): la publicación se borró o se ocultó, y repetir no sirve', () => {
    expect(textoDelFalloDeLaPublicacion('no_disponible')).toEqual({ texto: 'Ya no está disponible.', reintentar: false });
  });

  it('sin permiso (403) dice quién sí la ve, en palabras, y no habla de «evidencia»', () => {
    const { texto, reintentar } = textoDelFalloDeLaPublicacion('sin_permiso');
    expect(reintentar).toBe(false);
    expect(texto).toMatch(/publicación/);
    expect(texto).not.toMatch(/evidencia/i);
    expect(texto).toMatch(/quien acompaña hoy a su grupo/);
  });

  it('sin red y error ofrecen reintentar, y hablan de la publicación', () => {
    for (const motivo of ['sin_red', 'error'] as const) {
      const { texto, reintentar } = textoDelFalloDeLaPublicacion(motivo);
      expect(reintentar).toBe(true);
      expect(texto).not.toMatch(/evidencia/i);
    }
  });
});
