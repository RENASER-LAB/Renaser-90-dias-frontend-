/**
 * De dónde vienen los pasos y de cuáles no hay que fiarse (spec 037, D-310). Health Connect no filtra por método de registro: la
 * app lee los registros del día y descarta los orígenes con algo escrito a mano o de método desconocido ANTES de pedir el agregado.
 */
import { describe, expect, it } from '@jest/globals';

import type { RegistroDeSalud } from '../../types/pasos.types';
import {
  ETIQUETA_DE_OTRA_APP,
  ETIQUETA_DEL_TELEFONO,
  esElTelefono,
  fuenteDe,
  ordenarFuentes,
  origenesDelDia,
  registroEsDeFiar,
} from '../fuentesDeSalud';

const AUTOMATICO = 2;
const MANUAL = 3;
const DESCONOCIDO = 0;
const ACTIVO = 1;

const registro = (origen: string, metodo: number | undefined, extra: Partial<RegistroDeSalud> = {}): RegistroDeSalud => ({
  origen,
  metodo,
  ...extra,
});

describe('registroEsDeFiar', () => {
  it('lo automático y lo que la persona inició (una sesión) cuentan; lo escrito a mano y lo desconocido, no', () => {
    expect(registroEsDeFiar(registro('a', AUTOMATICO))).toBe(true);
    expect(registroEsDeFiar(registro('a', ACTIVO))).toBe(true);
    expect(registroEsDeFiar(registro('a', MANUAL))).toBe(false);
    expect(registroEsDeFiar(registro('a', DESCONOCIDO))).toBe(false);
  });

  it('un registro sin método no se puede verificar y no cuenta', () => {
    expect(registroEsDeFiar(registro('a', undefined))).toBe(false);
  });
});

describe('origenesDelDia', () => {
  it('un origen es limpio si todos sus registros son de fiar', () => {
    const { limpios, sucios } = origenesDelDia([
      registro('com.android.healthconnect.phone.abc', AUTOMATICO),
      registro('com.android.healthconnect.phone.abc', AUTOMATICO),
      registro('com.sec.android.app.shealth', AUTOMATICO),
    ]);
    expect(limpios).toEqual(['com.android.healthconnect.phone.abc', 'com.sec.android.app.shealth']);
    expect(sucios).toEqual([]);
  });

  // spec 037 FR-005
  it('con UN registro escrito a mano el origen entero queda fuera: no se fía del resto', () => {
    const { limpios, sucios } = origenesDelDia([
      registro('com.mala.app', AUTOMATICO),
      registro('com.mala.app', MANUAL),
      registro('com.sec.android.app.shealth', AUTOMATICO),
    ]);
    expect(limpios).toEqual(['com.sec.android.app.shealth']);
    expect(sucios).toEqual(['com.mala.app']);
  });

  it('un origen de método desconocido tampoco cuenta', () => {
    const { limpios, sucios } = origenesDelDia([registro('com.rara.app', DESCONOCIDO)]);
    expect(limpios).toEqual([]);
    expect(sucios).toEqual(['com.rara.app']);
  });

  it('sin registros no hay ningún origen', () => {
    expect(origenesDelDia([])).toEqual({ limpios: [], sucios: [] });
  });
});

describe('esElTelefono', () => {
  it('reconoce el origen antiguo (`android`) y el sintético por dispositivo, que cambia de nombre', () => {
    expect(esElTelefono('android')).toBe(true);
    expect(esElTelefono('com.android.healthconnect.phone.jd5bdd37e0a1')).toBe(true);
    expect(esElTelefono('com.sec.android.app.shealth')).toBe(false);
    expect(esElTelefono('androidx.algo')).toBe(false);
  });
});

describe('fuenteDe', () => {
  it('el teléfono se llama «Tu teléfono» y es del teléfono', () => {
    const fuente = fuenteDe('com.android.healthconnect.phone.x', [registro('com.android.healthconnect.phone.x', AUTOMATICO)]);
    expect(fuente).toEqual({ paquete: 'com.android.healthconnect.phone.x', etiqueta: ETIQUETA_DEL_TELEFONO, dispositivo: 'TELEFONO' });
  });

  it('un reloj se nombra por su modelo, y es un reloj', () => {
    const fuente = fuenteDe('com.sec.android.app.shealth', [
      registro('com.sec.android.app.shealth', AUTOMATICO, { tipoDeDispositivo: 1, modelo: 'Galaxy Watch' }),
    ]);
    expect(fuente.etiqueta).toBe('Galaxy Watch');
    expect(fuente.dispositivo).toBe('RELOJ');
  });

  it('una pulsera y un anillo cuentan como reloj', () => {
    expect(fuenteDe('p', [registro('p', AUTOMATICO, { tipoDeDispositivo: 6, modelo: 'Mi Band' })]).dispositivo).toBe('RELOJ');
    expect(fuenteDe('p', [registro('p', AUTOMATICO, { tipoDeDispositivo: 4, modelo: 'Oura' })]).dispositivo).toBe('RELOJ');
  });

  it('una app de teléfono se nombra por la app y mide como el teléfono', () => {
    const fuente = fuenteDe('com.sec.android.app.shealth', [
      registro('com.sec.android.app.shealth', AUTOMATICO, { tipoDeDispositivo: 2, modelo: 'SM-S921B' }),
    ]);
    expect(fuente.etiqueta).toBe('Samsung Health');
    expect(fuente.dispositivo).toBe('TELEFONO');
  });

  it('un paquete que no conocemos sale con su modelo, o «Otra app», y como «otro» dispositivo', () => {
    expect(fuenteDe('com.desconocida', [registro('com.desconocida', AUTOMATICO, { modelo: 'Ring X' })])).toEqual({
      paquete: 'com.desconocida',
      etiqueta: 'Ring X',
      dispositivo: 'OTRO',
    });
    expect(fuenteDe('com.desconocida', [registro('com.desconocida', AUTOMATICO)]).etiqueta).toBe(ETIQUETA_DE_OTRA_APP);
  });

  it('la etiqueta de la fuente que se manda al servidor nunca pasa de 60 caracteres', () => {
    // El servidor la corta a 60; la app ya la manda cortada (`cuerpoParaElServidor`). Aquí, que un modelo largo no rompa nada.
    const largo = 'M'.repeat(100);
    expect(fuenteDe('p', [registro('p', AUTOMATICO, { tipoDeDispositivo: 1, modelo: largo })]).etiqueta).toBe(largo);
  });
});

describe('ordenarFuentes', () => {
  it('primero el reloj, luego el teléfono y al final lo demás', () => {
    const orden = ordenarFuentes([
      { paquete: 'c', etiqueta: 'Otra', dispositivo: 'OTRO' },
      { paquete: 'b', etiqueta: 'Tu teléfono', dispositivo: 'TELEFONO' },
      { paquete: 'a', etiqueta: 'Galaxy Watch', dispositivo: 'RELOJ' },
    ]);
    expect(orden.map(f => f.paquete)).toEqual(['a', 'b', 'c']);
  });
});
