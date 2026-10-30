import { describe, expect, it } from '@jest/globals';

import { MOTIVOS, PLANES_DE_MANANA, planEnFrase, textoDelMotivo, textoDelPlan } from '../../data/textosDelCierre';
import {
  encabezadoDelDia,
  estadoEnPalabras,
  lineaDeUnMotivo,
  lineaDelResumen,
  respuestaEnPalabras,
} from '../textosDeLosCierres';

describe('los textos fijos de las dos preguntas', () => {
  it('son los ocho de la vista previa, en su orden', () => {
    expect(MOTIVOS.map(m => m.texto)).toEqual(['No me alcanzó el tiempo', 'Surgió otra cosa', 'Me faltó energía', 'Lo dejé para después']);
    expect(PLANES_DE_MANANA.map(p => p.texto)).toEqual(['Hacerla a otra hora', 'Hacerla más corta', 'Pedir ayuda', 'Dejarla']);
  });

  it('un valor que no se conoce no tiene texto', () => {
    expect(textoDelMotivo('SIN_TIEMPO')).toBe('No me alcanzó el tiempo');
    expect(textoDelMotivo('NUEVO')).toBeNull();
    expect(textoDelPlan(null)).toBeNull();
    expect(planEnFrase('OTRA_HORA')).toBe('a otra hora');
  });
});

describe('los textos de la sección de las fichas', () => {
  it('el resumen: «3 cerrados · 1 sin cerrar»', () => {
    expect(lineaDelResumen({ cerrados: 3, sinCerrar: 1 })).toBe('3 cerrados · 1 sin cerrar');
    expect(lineaDelResumen({ cerrados: 1, sinCerrar: 0 })).toBe('1 cerrado · 0 sin cerrar');
    expect(lineaDelResumen({ cerrados: 2, sinCerrar: null })).toBe('2 cerrados');
    expect(lineaDelResumen({ cerrados: null, sinCerrar: null })).toBeNull();
  });

  it('los motivos que más se repiten: «No me alcanzó el tiempo · 4 veces»', () => {
    expect(lineaDeUnMotivo({ motivo: 'SIN_TIEMPO', veces: 4 })).toBe('No me alcanzó el tiempo · 4 veces');
    expect(lineaDeUnMotivo({ motivo: 'SIN_ENERGIA', veces: 1 })).toBe('Me faltó energía · 1 vez');
    expect(lineaDeUnMotivo({ motivo: 'NUEVO', veces: 3 })).toBeNull();
  });

  it('cada día dice cómo quedó, y «Sin cerrar» no se dice como una falta', () => {
    expect(estadoEnPalabras({ estado: 'CERRADO' })).toBe('Cerrado');
    expect(estadoEnPalabras({ estado: 'SIN_CERRAR' })).toBe('Sin cerrar');
    expect(estadoEnPalabras({ estado: 'ABIERTO' })).toBe('Hoy, todavía sin cerrar');
    expect(estadoEnPalabras({ estado: null })).toBeNull();
    expect(encabezadoDelDia({ fecha: '2026-10-29', estado: 'CERRADO' })).toBe('Jueves 29 · Cerrado');
    expect(encabezadoDelDia({ fecha: '2026-10-29', estado: null })).toBe('Jueves 29');
  });

  it('lo que respondió: «No me alcanzó el tiempo → Hacerla a otra hora»', () => {
    expect(respuestaEnPalabras({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA' })).toBe('No me alcanzó el tiempo → Hacerla a otra hora');
    expect(respuestaEnPalabras({ motivo: 'SIN_TIEMPO', manana: 'NUEVO' })).toBe('No me alcanzó el tiempo');
    expect(respuestaEnPalabras({ motivo: null, manana: null })).toBeNull();
  });
});
