/**
 * Pestañas del ranking de Comunidad, con «Kilómetros» (D-226 del backend, decisión del dueño 2026-09-29).
 */
import { describe, expect, it } from '@jest/globals';

import type { RankingAgregadoDto } from '../../api/rankingApi';
import {
  entradasDeLaTabla,
  invitacionSinPosiciones,
  miEntradaEnLaTabla,
  TABLAS_DE_RANKING,
  textoDeMiPuntaje,
  textoDelPuntaje,
} from '../tablasDeRanking';

const entrada = (id: string, posicion: number, puntaje: number) => ({
  participanteId: id,
  fullName: id,
  posicion,
  puntaje,
});

const DATOS: RankingAgregadoDto = {
  fecha: '2026-09-29',
  celula: null,
  liga: [],
  coherenciaIndividual: [entrada('c', 1, 80)],
  general: [entrada('g', 1, 91.5)],
  kilometros: [entrada('ana', 1, 42.2), entrada('beto', 2, 7.5), entrada('carla', 3, 0)],
};

describe('tablasDeRanking', () => {
  it('son tres pestañas: General, Coherencia y Kilómetros, en ese orden', () => {
    expect(TABLAS_DE_RANKING.map(t => t.titulo)).toEqual(['General', 'Coherencia', 'Kilómetros']);
  });

  it('cada pestaña lee su lista; en Kilómetros no aparece quien todavía no registró ninguno', () => {
    expect(entradasDeLaTabla(DATOS, 'general').map(e => e.participanteId)).toEqual(['g']);
    expect(entradasDeLaTabla(DATOS, 'coherencia').map(e => e.participanteId)).toEqual(['c']);
    expect(entradasDeLaTabla(DATOS, 'kilometros').map(e => e.participanteId)).toEqual(['ana', 'beto']);
  });

  it('un backend anterior sin `kilometros` deja la pestaña vacía, sin romper', () => {
    const { kilometros: _sinKm, ...viejo } = DATOS;
    expect(entradasDeLaTabla(viejo, 'kilometros')).toEqual([]);
    expect(entradasDeLaTabla(null, 'general')).toEqual([]);
  });

  it('en Kilómetros el número son km con coma; en las demás, puntos como siempre', () => {
    expect(textoDelPuntaje('kilometros', 42.2)).toBe('42,2 km');
    expect(textoDelPuntaje('general', 91.5)).toBe('91.5 pts');
    expect(textoDeMiPuntaje('kilometros', 7.5)).toBe('7,5 km recorridos');
    expect(textoDeMiPuntaje('coherencia', 80)).toBe('80 pts de coherencia');
    expect(invitacionSinPosiciones('kilometros')).toContain('kilómetros');
  });
});

describe('«Tu posición» al ir y volver de Kilómetros', () => {
  // Quien mira está en General (3.º) y no registró km: en Kilómetros el servidor lo manda con 0.
  const datos: RankingAgregadoDto = {
    ...DATOS,
    general: [entrada('ana', 1, 90), entrada('beto', 2, 70), entrada('yo', 3, 55)],
    kilometros: [entrada('ana', 1, 12.5), entrada('yo', 2, 0)],
  };
  const yo = { id: 'yo', name: 'Nadie Más' };

  it('sale de la tabla que se mira, la misma del podio', () => {
    const recorrido = (['general', 'kilometros', 'general'] as const).map(clave => {
      const filas = entradasDeLaTabla(datos, clave);
      return { podio: filas[0]?.participanteId, mia: miEntradaEnLaTabla(filas, yo)?.posicion ?? null };
    });
    expect(recorrido).toEqual([
      { podio: 'ana', mia: 3 },
      { podio: 'ana', mia: null },
      { podio: 'ana', mia: 3 },
    ]);
  });

  it('por nombre como respaldo, y sin nombre no encuentra a cualquiera', () => {
    const filas = entradasDeLaTabla(datos, 'general');
    expect(miEntradaEnLaTabla(filas, { id: 'otro', name: 'BETO' })?.posicion).toBe(2);
    expect(miEntradaEnLaTabla(filas, { id: null, name: '' })).toBeNull();
  });
});
