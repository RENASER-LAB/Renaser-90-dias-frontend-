import { describe, expect, it } from '@jest/globals';

import { paginaEvidenciasSchema, validarRespuesta, type PaginaEvidenciasApi } from '../api/evidenceSchemas';
import { claveDeCacheDeLaFoto, fuenteDeFotoDeEvidencia } from '../utils/fotoDeEvidencia';

/**
 * La foto real de cada evidencia en Yo (2026-10-05, backend D-252): `GET /api/v1/evidence` trae
 * `fotoUrl`, una URL firmada que cambia en cada listado. Lo que tiene que valer acá: que la clave de
 * caché no cambie con la firma, que lo que no es una URL de la red no se intente pintar, y que la
 * app siga funcionando contra un backend que todavía no manda el campo.
 */

const OBJETO = 'https://s3-renaser90dias.s3.us-east-1.amazonaws.com/evidencia-habitos/u-1/r-1/f-1';
const firmada = (firma: string) => `${OBJETO}?X-Amz-Date=20261005T150000Z&X-Amz-Expires=900&X-Amz-Signature=${firma}`;

const fila = (extra: Record<string, unknown>) => ({
  id: 'ev-1',
  tipo: 'FOTO',
  contenidoTexto: null,
  subidaEn: '2026-10-05T15:00:00Z',
  timestampExif: null,
  estadoValidacion: 'VALIDA',
  publicadaEnMuro: false,
  ...extra,
});

describe('fuenteDeFotoDeEvidencia', () => {
  it('pinta la URL firmada con la dirección del objeto (sin la firma) como clave de caché', () => {
    expect(fuenteDeFotoDeEvidencia({ fotoUrl: firmada('aaa') })).toEqual({ uri: firmada('aaa'), cacheKey: OBJETO });
  });

  it('dos firmas del mismo objeto comparten la clave: la foto no se vuelve a bajar en cada listado', () => {
    const primera = fuenteDeFotoDeEvidencia({ fotoUrl: firmada('aaa') });
    const segunda = fuenteDeFotoDeEvidencia({ fotoUrl: firmada('bbb') });
    expect(primera?.uri).not.toBe(segunda?.uri);
    expect(primera?.cacheKey).toBe(segunda?.cacheKey);
  });

  it('es la misma clave que usa el visor del Muro (la URL sin `?…`), para abrirla sin bajarla de nuevo', () => {
    expect(claveDeCacheDeLaFoto(firmada('ccc'))).toBe(OBJETO);
  });

  it.each([
    ['sin foto (texto, video, audio)', null],
    ['backend anterior a D-252, sin el campo', undefined],
    ['vacía', ''],
    ['el marcador del almacenamiento local', 'about:blank#pendiente-s3/evidencia-habitos/u-1/r-1/f-1'],
  ])('%s → nada que pintar: queda el ícono', (_caso, fotoUrl) => {
    expect(fuenteDeFotoDeEvidencia({ fotoUrl })).toBeNull();
  });
});

describe('el esquema de GET /api/v1/evidence con fotoUrl', () => {
  const leer = (evidencias: unknown[]) =>
    validarRespuesta<PaginaEvidenciasApi>(paginaEvidenciasSchema, { evidencias, nextCursor: null }, 'prueba');

  it('acepta la URL firmada y el null de una evidencia sin foto', () => {
    const pagina = leer([fila({ fotoUrl: firmada('aaa') }), fila({ id: 'ev-2', tipo: 'TEXTO', fotoUrl: null })]);
    expect(pagina.evidencias.map(e => e.fotoUrl)).toEqual([firmada('aaa'), null]);
  });

  it('un backend que todavía no manda el campo sigue funcionando', () => {
    const pagina = leer([fila({})]);
    expect(pagina.evidencias).toHaveLength(1);
    expect(pagina.evidencias[0].fotoUrl).toBeUndefined();
  });

  it('un fotoUrl con otra forma pierde la foto, no la lista', () => {
    const pagina = leer([fila({ fotoUrl: 42 }), fila({ id: 'ev-2' })]);
    expect(pagina.evidencias.map(e => e.id)).toEqual(['ev-1', 'ev-2']);
    expect(pagina.evidencias[0].fotoUrl).toBeNull();
  });
});
