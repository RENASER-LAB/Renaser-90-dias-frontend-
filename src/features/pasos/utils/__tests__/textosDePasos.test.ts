/** Los textos de los pasos (spec 037, D-310): coma decimal, miles con espacio duro, tipo oración y tuteo. */
import { describe, expect, it } from '@jest/globals';

import {
  detalleDeLosKm,
  formatoPasos,
  kmConUnidad,
  TEXTOS_DE_PASOS,
  textoDeLaMeta,
  textoDeLaMetaLista,
  textoDelAvisoDeRegistro,
  textoDelBotonRegistrar,
  textoDeLosPasos,
  textoDesdeCuando,
} from '../textosDePasos';

const NBSP = ' ';

describe('formatos', () => {
  it('los pasos llevan un espacio duro entre miles', () => {
    expect(formatoPasos(7120)).toBe(`7${NBSP}120`);
    expect(formatoPasos(950)).toBe('950');
    expect(formatoPasos(120000.4)).toBe(`120${NBSP}000`);
  });

  it('los km llevan coma y el número no se separa de su unidad', () => {
    expect(kmConUnidad(5.4)).toBe(`5,4${NBSP}km`);
    expect(kmConUnidad(5)).toBe(`5${NBSP}km`);
  });

  it('«3,2 de 5 km», «5,4 km · ¡Meta lista!» y el botón con los km', () => {
    expect(textoDeLaMeta(3.2, 5)).toBe(`3,2 de 5${NBSP}km`);
    expect(textoDeLaMetaLista(5.4)).toBe(`5,4${NBSP}km · ¡Meta lista!`);
    expect(textoDelBotonRegistrar(5.4)).toBe(`Registrar 5,4${NBSP}km`);
    expect(textoDelAvisoDeRegistro(5.4)).toBe(`Registramos tus 5,4${NBSP}km.`);
  });

  it('los pasos dicen «aprox.» cuando los km salen de la zancada', () => {
    expect(textoDeLosPasos(7120, true)).toBe(`7${NBSP}120${NBSP}pasos · aprox.`);
    expect(textoDeLosPasos(7120, false)).toBe(`7${NBSP}120${NBSP}pasos`);
    expect(textoDeLosPasos(null, false)).toBeNull();
    expect(textoDeLosPasos(null, true)).toBe('aprox.');
  });

  it('«Hoy contamos desde las 14:05.»', () => {
    expect(textoDesdeCuando('14:05')).toBe('Hoy contamos desde las 14:05.');
  });
});

describe('detalleDeLosKm (la hoja de lo cumplido)', () => {
  it('Health Connect dice la fuente; la captura dice «Captura»', () => {
    expect(detalleDeLosKm(5.4, 'HEALTH_CONNECT', 'Galaxy Watch')).toBe(`5,4${NBSP}km · Health Connect · Galaxy Watch`);
    expect(detalleDeLosKm(5.4, 'HEALTH_CONNECT', null)).toBe(`5,4${NBSP}km · Health Connect`);
    expect(detalleDeLosKm(4, 'MANUAL', null)).toBe(`4${NBSP}km · Captura`);
  });

  it('sin el número del servidor no se inventa nada', () => {
    expect(detalleDeLosKm(null, 'HEALTH_CONNECT', 'x')).toBeNull();
    expect(detalleDeLosKm(undefined, null, null)).toBeNull();
  });
});

describe('lo que se promete y lo que no', () => {
  it('la hoja para conectar dice qué se lee y quién lo ve, y no ofrece instalar nada', () => {
    const todo = JSON.stringify(TEXTOS_DE_PASOS);
    expect(TEXTOS_DE_PASOS.conectar.lineas).toEqual([
      'Tu teléfono o tu reloj cuentan los pasos.',
      'Renaser solo lee pasos y distancia.',
      'Tu mentor y el ranking ven tu total de km.',
    ]);
    expect(todo).not.toMatch(/Instalar|Instala |Play Store|Actualiza Health Connect|Falta Health Connect/i);
  });

  it('el teléfono sin soporte se queda con la captura y dice Android 14', () => {
    expect(TEXTOS_DE_PASOS.sinSoporte.titulo).toBe('Sube tu captura');
    expect(TEXTOS_DE_PASOS.sinSoporte.texto).toBe('Los pasos automáticos son solo para Android 14 o más.');
    expect(TEXTOS_DE_PASOS.sinSoporte.boton).toBe('Subir captura');
  });

  it('los pasos escritos a mano no cuentan, y lo dice', () => {
    expect(TEXTOS_DE_PASOS.sinDatos.manuales).toBe('Los pasos escritos a mano no cuentan.');
  });
});
