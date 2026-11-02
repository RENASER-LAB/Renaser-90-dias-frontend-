/**
 * Qué se ve en la fila y en la hoja de «Kilómetros diarios» (spec 037, D-310): una función pura con el soporte, el permiso, la lectura
 * y lo que dice el servidor. Cada estado de la maqueta aprobada tiene su caso.
 */
import { describe, expect, it } from '@jest/globals';

import type { LecturaDelDia } from '../../types/pasos.types';
import {
  abreLaHojaDeKilometros,
  porcentajeDeLaBarra,
  sePuedeRegistrar,
  vistaDeKilometros,
  type EntradaDeLaVista,
} from '../vistaDeKilometros';

const AHORA = new Date('2026-11-04T22:08:00Z');
const TELEFONO = { paquete: 'com.android.healthconnect.phone.x', etiqueta: 'Tu teléfono', dispositivo: 'TELEFONO' as const };
const RELOJ = { paquete: 'com.sec.android.app.shealth', etiqueta: 'Galaxy Watch', dispositivo: 'RELOJ' as const };

const lectura = (extra: Partial<LecturaDelDia> = {}): LecturaDelDia => ({
  pasos: 4200,
  distanciaM: 3200,
  km: 3.2,
  aproximado: false,
  fuentes: [TELEFONO],
  noSumadas: [],
  hayManuales: false,
  leidoEn: AHORA,
  ...extra,
});

const entrada = (extra: Partial<EntradaDeLaVista> = {}): EntradaDeLaVista => ({
  medicion: { meta: 5, valorDelDia: null },
  cumplido: false,
  soporte: 'disponible',
  conectado: true,
  permisos: 'otorgados',
  lectura: lectura(),
  errorDeLectura: false,
  conectadoHoyA: null,
  ...extra,
});

describe('vistaDeKilometros', () => {
  it('conectado y en curso: el avance con la meta y la fuente (pantalla 2.1)', () => {
    const vista = vistaDeKilometros(entrada());
    expect(vista).toMatchObject({ modo: 'avance', km: 3.2, meta: 5, metaLista: false, pasos: 4200 });
    expect(vista.modo === 'avance' && vista.fuente.etiqueta).toBe('Tu teléfono');
    expect(sePuedeRegistrar(vista)).toBe(false);
  });

  // spec 037 FR-007
  it('al llegar a la meta (o pasarla) ofrece registrar (pantalla 2.2)', () => {
    const justo = vistaDeKilometros(entrada({ lectura: lectura({ km: 5 }) }));
    const pasada = vistaDeKilometros(entrada({ lectura: lectura({ km: 5.4 }) }));
    expect(justo).toMatchObject({ modo: 'avance', metaLista: true });
    expect(pasada).toMatchObject({ modo: 'avance', metaLista: true, km: 5.4 });
    expect(sePuedeRegistrar(pasada)).toBe(true);
  });

  it('la meta es la que manda el servidor, no un 5 escrito en la app', () => {
    const vista = vistaDeKilometros(entrada({ medicion: { meta: 3.5 }, lectura: lectura({ km: 3.5 }) }));
    expect(vista).toMatchObject({ modo: 'avance', meta: 3.5, metaLista: true });
  });

  it('con dos fuentes a la vez: la principal y la que no se suma (pantalla 3.3)', () => {
    const vista = vistaDeKilometros(entrada({ lectura: lectura({ km: 5.9, fuentes: [RELOJ], noSumadas: [TELEFONO] }) }));
    expect(vista.modo === 'avance' && vista.fuente.etiqueta).toBe('Galaxy Watch');
    expect(vista.modo === 'avance' && vista.noSumadas.map(f => f.etiqueta)).toEqual(['Tu teléfono']);
  });

  it('sin permiso (lo quitó en Health Connect): «Perdimos tus pasos» (pantalla 3.1)', () => {
    expect(vistaDeKilometros(entrada({ permisos: 'faltan' }))).toEqual({ modo: 'sin-permiso' });
  });

  it('con permiso pero sin pasos hoy: «Todavía no vemos pasos» (pantalla 3.2), y dice si descartó lo escrito a mano', () => {
    expect(vistaDeKilometros(entrada({ lectura: lectura({ km: 0, pasos: null, distanciaM: null, fuentes: [] }) }))).toEqual({
      modo: 'sin-datos',
      hayManuales: false,
    });
    expect(
      vistaDeKilometros(entrada({ lectura: lectura({ km: 0, pasos: null, distanciaM: null, fuentes: [], hayManuales: true }) })),
    ).toEqual({ modo: 'sin-datos', hayManuales: true });
  });

  it('si la lectura falló, «sin pasos» con «Actualizar»; no un error técnico', () => {
    expect(vistaDeKilometros(entrada({ lectura: null, errorDeLectura: true }))).toEqual({ modo: 'sin-datos', hayManuales: false });
  });

  it('sin conectar se ofrece «Cuenta tus pasos solo» (pantalla 1.1)', () => {
    expect(vistaDeKilometros(entrada({ conectado: false, permisos: null, lectura: null }))).toEqual({ modo: 'ofrecer', soporte: 'disponible' });
  });

  // spec 037 FR-002
  it('Android menor a 14, sin Health Connect o iPhone web: se ofrece, y esa hoja dice «Sube tu captura» (pantalla 3.4)', () => {
    expect(vistaDeKilometros(entrada({ soporte: 'no-disponible', conectado: false, permisos: null, lectura: null }))).toEqual({
      modo: 'ofrecer',
      soporte: 'no-disponible',
    });
    // Aunque la cuenta hubiera quedado conectada en otro teléfono, aquí no hay soporte.
    expect(vistaDeKilometros(entrada({ soporte: 'no-disponible', conectado: true }))).toEqual({ modo: 'ofrecer', soporte: 'no-disponible' });
  });

  it('mientras no se sabe (soporte, conexión, permiso o primera lectura) la fila es la de siempre, sin parpadeo', () => {
    expect(vistaDeKilometros(entrada({ soporte: 'cargando' }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ conectado: null }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ permisos: null }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ lectura: null }))).toEqual({ modo: 'captura' });
  });

  it('sin meta en la agenda (un backend anterior) no se ofrece nada: la fila de siempre', () => {
    expect(vistaDeKilometros(entrada({ medicion: null }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ medicion: { valorDelDia: null } }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ medicion: { meta: 0 } }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ medicion: { meta: null }, conectado: false }))).toEqual({ modo: 'captura' });
  });

  it('ya cumplido dice cuántos km y de dónde salieron, sin importar el soporte (pantalla 2.3)', () => {
    expect(
      vistaDeKilometros(entrada({ cumplido: true, medicion: { meta: 5, valorDelDia: 5.4, origenDelDia: 'HEALTH_CONNECT', fuenteDelDia: 'Galaxy Watch' } })),
    ).toEqual({ modo: 'cumplido', km: 5.4, origen: 'HEALTH_CONNECT', fuente: 'Galaxy Watch' });
    expect(
      vistaDeKilometros(entrada({ cumplido: true, soporte: 'no-disponible', medicion: { valorDelDia: 4, origenDelDia: 'MANUAL' } })),
    ).toEqual({ modo: 'cumplido', km: 4, origen: 'MANUAL', fuente: null });
  });

  it('cumplido sin el número del día (un backend anterior) vuelve a la fila de siempre', () => {
    expect(vistaDeKilometros(entrada({ cumplido: true, medicion: { meta: 5, valorDelDia: null } }))).toEqual({ modo: 'captura' });
    expect(vistaDeKilometros(entrada({ cumplido: true, medicion: null }))).toEqual({ modo: 'captura' });
  });

  it('el primer día cuenta desde que se conectó', () => {
    const vista = vistaDeKilometros(entrada({ conectadoHoyA: '14:05' }));
    expect(vista.modo === 'avance' && vista.conectadoHoyA).toBe('14:05');
  });

  it('si Health Connect no dio la fuente, no se inventa una: «Otra app»', () => {
    const vista = vistaDeKilometros(entrada({ lectura: lectura({ fuentes: [] }) }));
    expect(vista.modo === 'avance' && vista.fuente.etiqueta).toBe('Otra app');
  });
});

describe('abreLaHojaDeKilometros', () => {
  it('tocar el nombre abre la hoja de los pasos solo con los pasos conectados; si no, hace lo de siempre (la captura)', () => {
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada()))).toBe(true);
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada({ permisos: 'faltan' })))).toBe(true);
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada({ lectura: lectura({ km: 0, pasos: null, distanciaM: null, fuentes: [] }) })))).toBe(true);
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada({ conectado: false })))).toBe(false);
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada({ medicion: null })))).toBe(false);
    expect(abreLaHojaDeKilometros(vistaDeKilometros(entrada({ cumplido: true, medicion: { valorDelDia: 5 } })))).toBe(false);
  });
});

describe('porcentajeDeLaBarra', () => {
  it('va de 0 a 100 y no se pasa', () => {
    expect(porcentajeDeLaBarra({ km: 3.2, meta: 5 })).toBe(64);
    expect(porcentajeDeLaBarra({ km: 0, meta: 5 })).toBe(0);
    expect(porcentajeDeLaBarra({ km: 12, meta: 5 })).toBe(100);
    expect(porcentajeDeLaBarra({ km: 3, meta: 0 })).toBe(0);
  });
});
