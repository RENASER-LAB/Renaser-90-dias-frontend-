import { describe, expect, it } from '@jest/globals';

import type { CierreDelDia } from '../../types/cierre.types';
import {
  TEXTO_CARGANDO_EL_DIA,
  TEXTO_NO_SE_PUDO_LEER,
  TEXTO_SIN_CIERRE_PARA_MOSTRAR,
  diasDeLaTarjeta,
  estadoDelDiaEnPalabras,
  hayDiasAnteriores,
  textoDeLaLectura,
  textoDeUnDia,
} from '../semanaDelCierre';

/** Jueves 29 de octubre de 2026: su semana va del lunes 26 al domingo 1. */
const JUEVES = '2026-10-29';

const cierre = (extra: Partial<CierreDelDia> = {}): CierreDelDia => ({
  fecha: '2026-10-28',
  estado: 'CERRADO',
  puedeCerrar: false,
  cerradoEn: '2026-10-28T21:40:00',
  nota: null,
  semana: null,
  acciones: [],
  ...extra,
});

describe('la semana de la tarjeta «Cierra tu día» en Plan (spec 033)', () => {
  it('son siete días, de lunes a domingo, los de la semana que se vive', () => {
    const dias = diasDeLaTarjeta(JUEVES, 20);
    expect(dias.map(d => d.iso)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
    expect(dias.map(d => d.letra)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  });

  it('solo se pueden leer los anteriores a hoy: ni hoy ni los que vienen (el servidor respondería 400)', () => {
    const leibles = diasDeLaTarjeta(JUEVES, 20).filter(d => d.leible).map(d => d.iso);
    expect(leibles).toEqual(['2026-10-26', '2026-10-27', '2026-10-28']);
  });

  it('no se lee nada antes del Día 1', () => {
    // Día 2 = el Día 1 fue ayer (miércoles): el lunes y el martes no eran del programa.
    const leibles = diasDeLaTarjeta(JUEVES, 2).filter(d => d.leible).map(d => d.iso);
    expect(leibles).toEqual(['2026-10-28']);
  });

  it('sin Día 1 conocido no hay ningún día que leer', () => {
    for (const dia of [null, undefined, 0]) {
      const dias = diasDeLaTarjeta(JUEVES, dia);
      expect(dias.some(d => d.leible)).toBe(false);
      expect(hayDiasAnteriores(dias)).toBe(false);
    }
  });

  it('el lunes no hay día anterior en la semana: la fila no se dibuja', () => {
    expect(hayDiasAnteriores(diasDeLaTarjeta('2026-10-26', 30))).toBe(false);
  });

  it('el primer día del programa tampoco tiene anteriores', () => {
    expect(hayDiasAnteriores(diasDeLaTarjeta(JUEVES, 1))).toBe(false);
  });

  it('el domingo se pueden leer los seis días anteriores', () => {
    const leibles = diasDeLaTarjeta('2026-11-01', 40).filter(d => d.leible);
    expect(leibles).toHaveLength(6);
  });
});

describe('cómo se dice un día anterior, sin culpa', () => {
  it('un cierre dice a qué hora se cerró', () => {
    expect(estadoDelDiaEnPalabras(cierre())).toBe('Cerrado a las 21:40');
  });

  it('un cierre sin hora legible dice solo «Cerrado»', () => {
    expect(estadoDelDiaEnPalabras(cierre({ cerradoEn: null }))).toBe('Cerrado');
  });

  it('un día sin cierre es «Sin cerrar», no una falta', () => {
    expect(estadoDelDiaEnPalabras(cierre({ estado: 'SIN_CERRAR', cerradoEn: null }))).toBe('Sin cerrar');
  });

  it('si el servidor no dijo cómo quedó, no se inventa', () => {
    expect(estadoDelDiaEnPalabras(cierre({ estado: null, cerradoEn: null }))).toBeNull();
    expect(textoDeUnDia(cierre({ estado: null, cerradoEn: null }))).toBeNull();
  });

  it('el título lleva el día y el estado', () => {
    expect(textoDeUnDia(cierre())?.titulo).toBe('Miércoles 28 · Cerrado a las 21:40');
    expect(textoDeUnDia(cierre({ estado: 'SIN_CERRAR', cerradoEn: null }))?.titulo).toBe('Miércoles 28 · Sin cerrar');
  });

  it('lo que respondió de cada pendiente y la nota del día, solo si se cerró', () => {
    const conRespuestas = cierre({
      nota: '  Día pesado  ',
      acciones: [
        { id: 'a', titulo: 'Enviar la propuesta', horaInicio: '10:00', cumplida: true, cumplidaEn: null, cierre: null },
        {
          id: 'b', titulo: 'Revisar las facturas', horaInicio: '20:30', cumplida: false, cumplidaEn: null,
          cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Me llamaron' },
        },
        { id: 'c', titulo: 'Sin respuesta guardada', horaInicio: null, cumplida: false, cumplidaEn: null, cierre: null },
      ],
    });
    const texto = textoDeUnDia(conRespuestas)!;
    expect(texto.respuestas).toEqual(['«Revisar las facturas»: No me alcanzó el tiempo → Hacerla a otra hora. Me llamaron']);
    expect(texto.nota).toBe('Día pesado');

    const sinCerrar = textoDeUnDia({ ...conRespuestas, estado: 'SIN_CERRAR', cerradoEn: null })!;
    expect(sinCerrar.respuestas).toEqual([]);
    expect(sinCerrar.nota).toBeNull();
  });
});

describe('lo que se dice mientras un día no trae datos', () => {
  it('sin lectura todavía o cargando: «Leyendo ese día…»', () => {
    expect(textoDeLaLectura(undefined, '2026-10-28')).toBe(TEXTO_CARGANDO_EL_DIA);
    expect(textoDeLaLectura({ estado: 'cargando' }, '2026-10-28')).toBe(TEXTO_CARGANDO_EL_DIA);
  });

  it('sin datos (404, 403, respuesta que no calza): no hay cierre para mostrar', () => {
    expect(textoDeLaLectura({ estado: 'sin-datos' }, '2026-10-28')).toBe(TEXTO_SIN_CIERRE_PARA_MOSTRAR);
  });

  it('error de red: lo dice, para ofrecer «Reintentar»', () => {
    expect(textoDeLaLectura({ estado: 'error' }, '2026-10-28')).toBe(TEXTO_NO_SE_PUDO_LEER);
  });

  it('con datos no hay texto de espera', () => {
    expect(textoDeLaLectura({ estado: 'datos', cierre: cierre() }, '2026-10-28')).toBeNull();
  });

  it('con datos que no dicen cómo quedó, el día y que no hay cierre', () => {
    const sinEstado = cierre({ estado: null, cerradoEn: null });
    expect(textoDeLaLectura({ estado: 'datos', cierre: sinEstado }, '2026-10-28')).toBe(`Miércoles 28 · ${TEXTO_SIN_CIERRE_PARA_MOSTRAR}`);
  });
});
