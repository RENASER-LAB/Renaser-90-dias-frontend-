/**
 * Pestañas del ranking de Comunidad, con «Kilómetros» (D-226 del backend, decisión del dueño 2026-09-29) y
 * «Gimnasio» (D-266, 2026-10-13).
 */
import { describe, expect, it } from '@jest/globals';

import type { RankingAgregadoDto } from '../../api/rankingApi';
import {
  entradasDeLaTabla,
  esMiEntrada,
  invitacionSinPosiciones,
  miEntradaEnLaTabla,
  nombreEnElRanking,
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
  gimnasio: [entrada('beto', 1, 12), entrada('ana', 2, 1), entrada('carla', 3, 0)],
};

describe('tablasDeRanking', () => {
  it('son cuatro pestañas: General, Coherencia, Kilómetros y Gimnasio, en ese orden', () => {
    expect(TABLAS_DE_RANKING.map(t => t.titulo)).toEqual(['General', 'Coherencia', 'Kilómetros', 'Gimnasio']);
  });

  it('Gimnasio lee su lista sin quien tiene 0, cuenta en días y un backend anterior la deja vacía', () => {
    expect(entradasDeLaTabla(DATOS, 'gimnasio').map(e => e.participanteId)).toEqual(['beto', 'ana']);
    expect(textoDelPuntaje('gimnasio', 12)).toBe('12 días');
    expect(textoDelPuntaje('gimnasio', 1)).toBe('1 día');
    expect(textoDeMiPuntaje('gimnasio', 3)).toBe('3 días de gimnasio');
    expect(invitacionSinPosiciones('gimnasio')).toContain('gimnasio');
    const { gimnasio: _sinGimnasio, ...viejo } = DATOS;
    expect(entradasDeLaTabla(viejo, 'gimnasio')).toEqual([]);
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
  const yo = { id: 'yo' };

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

  it('sin id de la sesión no encuentra a nadie', () => {
    const filas = entradasDeLaTabla(datos, 'general');
    expect(miEntradaEnLaTabla(filas, { id: null })).toBeNull();
    expect(miEntradaEnLaTabla(filas, { id: undefined })).toBeNull();
    expect(miEntradaEnLaTabla(filas, { id: '' })).toBeNull();
  });
});

/**
 * #43: «TÚ» y «Tu posición» buscaban a la persona por id o, si no, por nombre con `includes`. «Ana» o «Luis» están
 * dentro de «Ana María Torres» o «Luis Pérez», que pueden estar MÁS ARRIBA en la tabla: se marcaba a otra persona
 * como «TÚ» y se mostraba su posición. Ahora se decide solo por el id de la cuenta; sin id, no se marca.
 * Estas pruebas fallan contra el código de antes.
 */
describe('«TÚ» y «Tu posición» se deciden solo por el id (#43)', () => {
  const fila = (id: string, fullName: string, posicion: number, puntaje: number) => ({
    participanteId: id,
    fullName,
    posicion,
    puntaje,
  });
  // «Ana María Torres» está ARRIBA de «Ana»: el `includes` por nombre se quedaba con la primera.
  const arriba = fila('u-ana-maria', 'Ana María Torres', 1, 90);
  const yoAna = fila('u-ana', 'Ana', 2, 80);
  const otro = fila('u-luis', 'Luis Pérez', 3, 70);
  const FILAS = [arriba, yoAna, otro];
  const DATOS_HOMONIMOS: RankingAgregadoDto = {
    fecha: '2026-10-29',
    celula: null,
    liga: [],
    coherenciaIndividual: FILAS,
    general: FILAS,
    kilometros: FILAS,
    gimnasio: FILAS,
  };

  it('un nombre corto no marca a otra persona que lo contiene y está más arriba', () => {
    expect(miEntradaEnLaTabla(FILAS, { id: 'u-ana' })?.posicion).toBe(2);
    expect(esMiEntrada(arriba, { id: 'u-ana' })).toBe(false);
    expect(esMiEntrada(yoAna, { id: 'u-ana' })).toBe(true);
  });

  it('vale en las cuatro tablas (General, Coherencia, Kilómetros y Gimnasio)', () => {
    for (const { clave } of TABLAS_DE_RANKING) {
      const filas = entradasDeLaTabla(DATOS_HOMONIMOS, clave);
      expect(miEntradaEnLaTabla(filas, { id: 'u-ana' })?.participanteId).toBe('u-ana');
      expect(miEntradaEnLaTabla(filas, { id: 'u-luis' })?.posicion).toBe(3);
    }
  });

  it('con un id que no está en la tabla («Tu posición» vacía) no adivina por el nombre', () => {
    // Otra cuenta que también se llama «Ana», pero que no figura: antes se quedaba con «Ana María Torres».
    expect(miEntradaEnLaTabla(FILAS, { id: 'u-otra-ana' })).toBeNull();
  });

  it('sin id de la sesión, o en una fila sin id, no se marca a nadie', () => {
    for (const quien of [{ id: null }, { id: undefined }, { id: '' }, {}]) {
      expect(FILAS.some(f => esMiEntrada(f, quien))).toBe(false);
      expect(miEntradaEnLaTabla(FILAS, quien)).toBeNull();
    }
    // Una fila que llegó sin id (dato roto) tampoco coincide con una sesión sin id.
    expect(esMiEntrada({ participanteId: '' }, { id: '' })).toBe(false);
    expect(esMiEntrada({ participanteId: undefined as unknown as string }, { id: undefined })).toBe(false);
    expect(miEntradaEnLaTabla([fila('', 'Ana', 1, 5)], { id: 'u-ana' })).toBeNull();
  });

  it('«TÚ (…)» solo en la fila de la cuenta; las demás llevan el nombre que manda el servidor', () => {
    const yo = { id: 'u-ana' };
    expect(nombreEnElRanking(yoAna, yo, 'Ana')).toBe('TÚ (Ana)');
    expect(nombreEnElRanking(arriba, yo, 'Ana')).toBe('Ana María Torres');
    expect(nombreEnElRanking(otro, yo, 'Ana')).toBe('Luis Pérez');
    // Sin id de la sesión nadie es «TÚ», ni siquiera quien se llama igual.
    expect(nombreEnElRanking(yoAna, { id: null }, 'Ana')).toBe('Ana');
  });
});
