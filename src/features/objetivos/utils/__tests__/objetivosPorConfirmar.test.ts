import { describe, expect, it } from '@jest/globals';

import type { RocaMaestraApi } from '../../types/objetivos.types';
import {
  estaPorConfirmar,
  MAXIMO_DEL_OBJETIVO,
  objetivosParaConfirmar,
  primerProblema,
  problemaDelObjetivo,
  rocasPorConfirmar,
} from '../objetivosPorConfirmar';

function roca(eje: RocaMaestraApi['eje'], extra: Partial<RocaMaestraApi> = {}): RocaMaestraApi {
  return {
    id: `m-${eje}`, eje, objetivo: `Objetivo de ${eje}`, meta: null, avance: null, unidad: null, lineaBase: null, porcentaje: null,
    creadoEn: '2026-11-02T10:00:00Z', actualizadoEn: '2026-11-02T10:00:00Z', ...extra,
  };
}

describe('estaPorConfirmar', () => {
  it('solo un objetivo del diagnóstico que el servidor dice sin confirmar', () => {
    expect(estaPorConfirmar(roca('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false }))).toBe(true);
  });

  it('el mismo objetivo ya confirmado, o de otro origen, es fijo como siempre', () => {
    expect(estaPorConfirmar(roca('CUERPO', { origin: 'DIAGNOSTICO', confirmed: true }))).toBe(false);
    expect(estaPorConfirmar(roca('CUERPO', { origin: 'PLAN', confirmed: false }))).toBe(false);
    expect(estaPorConfirmar(roca('CUERPO', { origin: 'MAPA', confirmed: false }))).toBe(false);
  });

  it('un servidor anterior no manda los campos: nada aparece «por confirmar»', () => {
    expect(estaPorConfirmar(roca('CUERPO'))).toBe(false);
    expect(estaPorConfirmar(roca('CUERPO', { origin: 'DIAGNOSTICO' }))).toBe(false);
    expect(estaPorConfirmar(null)).toBe(false);
    expect(estaPorConfirmar(undefined)).toBe(false);
  });
});

describe('rocasPorConfirmar', () => {
  const todas = [
    roca('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false }),
    roca('TRABAJO', { origin: 'DIAGNOSTICO', confirmed: false }),
    roca('RELACIONES', { origin: 'PLAN', confirmed: true }),
  ];

  it('devuelve solo las pendientes, en el orden de los ejes de la pantalla (el principal primero)', () => {
    expect(rocasPorConfirmar(todas, ['TRABAJO', 'CUERPO', 'RELACIONES']).map(r => r.eje)).toEqual(['TRABAJO', 'CUERPO']);
    expect(rocasPorConfirmar(todas, ['CUERPO', 'TRABAJO', 'RELACIONES']).map(r => r.eje)).toEqual(['CUERPO', 'TRABAJO']);
  });

  it('sin ninguna pendiente la lista es vacía y no toca la original', () => {
    const copia = [...todas];
    expect(rocasPorConfirmar([roca('CUERPO')], ['CUERPO'])).toEqual([]);
    rocasPorConfirmar(todas, ['TRABAJO']);
    expect(todas).toEqual(copia);
  });
});

describe('problemaDelObjetivo: nunca se recorta en silencio', () => {
  it('vacío o solo espacios no se puede confirmar', () => {
    expect(problemaDelObjetivo('')).toBe('vacio');
    expect(problemaDelObjetivo('   \n ')).toBe('vacio');
  });

  it('hasta 500 caracteres entra; uno más se dice (no se corta solo)', () => {
    expect(problemaDelObjetivo('a'.repeat(MAXIMO_DEL_OBJETIVO))).toBeNull();
    expect(problemaDelObjetivo('a'.repeat(MAXIMO_DEL_OBJETIVO + 1))).toBe('largo');
  });
});

describe('objetivosParaConfirmar y primerProblema', () => {
  const pendientes = [
    roca('TRABAJO', { origin: 'DIAGNOSTICO', confirmed: false, objetivo: 'Facturar más' }),
    roca('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false, objetivo: 'Bajar de peso' }),
  ];

  it('manda lo escrito (sin espacios de sobra) y, si no se tocó, lo que dijo el diagnóstico', () => {
    const items = objetivosParaConfirmar(pendientes, { CUERPO: '  Correr 5 km  ' });
    expect(items).toEqual([
      { eje: 'TRABAJO', objetivo: 'Facturar más' },
      { eje: 'CUERPO', objetivo: 'Correr 5 km' },
    ]);
  });

  it('el primer problema nombra el eje; sin problemas, null', () => {
    expect(primerProblema(objetivosParaConfirmar(pendientes, {}))).toBeNull();
    expect(primerProblema(objetivosParaConfirmar(pendientes, { CUERPO: '' }))).toEqual({ eje: 'CUERPO', problema: 'vacio' });
    expect(primerProblema(objetivosParaConfirmar(pendientes, { TRABAJO: 'x'.repeat(501) }))).toEqual({ eje: 'TRABAJO', problema: 'largo' });
  });
});
