/**
 * Qué muestra el control de los recordatorios de las acciones con días marcados, y qué se guarda (spec 010, T008 en
 * su parte pura): «Estos días tienen avisos distintos», solo lo tocado y «Varía» en «Cómo suena».
 */
import { describe, expect, it } from '@jest/globals';

import type { CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import type { PreferenciasDeAcciones } from '../preferenciasPorDia';
import { huellaDeLasPreferencias, huellaDeLosAvisos } from '../preferenciasPorDia';
import { huellaDelDiario } from '../planDelDiario';
import { hayCambiosPorGuardar, prefsSiSeGuarda, vistaDelRecordatorio } from '../vistaDelRecordatorio';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({ sonido, vibracion, voz, repetir });

const BASE: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '07:00', antelaciones: [10] };

describe('sin días marcados se ve la general', () => {
  it('lo mismo que antes: encendido, la hora y el aviso general', () => {
    const v = vistaDelRecordatorio(BASE, [], {});
    expect(v.diario).toEqual({ valor: true, distintos: false });
    expect(v.hora).toEqual({ valor: '07:00', distintas: false });
    expect(v.aviso).toEqual({ mostrado: [10], distintos: false });
  });

  it('un sábado con aviso propio no cambia lo que se ve de la general', () => {
    const v = vistaDelRecordatorio({ ...BASE, dias: { 6: { antelaciones: [30] } } }, [], {});
    expect(v.aviso).toEqual({ mostrado: [10], distintos: false });
  });
});

describe('con días marcados', () => {
  const PREFS: PreferenciasDeAcciones = {
    ...BASE,
    dias: { 6: { antelaciones: [30], horaDiaria: '09:00' }, 7: { antelaciones: [30], horaDiaria: '09:00' }, 1: { antelaciones: [0] } },
  };

  it('lo que tienen en común', () => {
    const v = vistaDelRecordatorio(PREFS, [6, 7], {});
    expect(v.aviso).toEqual({ mostrado: [30], distintos: false });
    expect(v.hora).toEqual({ valor: '09:00', distintas: false });
    expect(v.diario).toEqual({ valor: true, distintos: false });
  });

  it('«Estos días tienen avisos distintos»: no hay ninguna opción marcada', () => {
    const v = vistaDelRecordatorio(PREFS, [6, 1], {});
    expect(v.aviso).toEqual({ mostrado: [], distintos: true });
    expect(v.hora.distintas).toBe(true);
  });

  it('lo que se elige para esos días reemplaza lo que se veía, y ya no son «distintos»', () => {
    const v = vistaDelRecordatorio(PREFS, [6, 1], { antelaciones: [30, 10], horaDiaria: '08:30' });
    expect(v.aviso).toEqual({ mostrado: [30, 10], distintos: false });
    expect(v.hora).toEqual({ valor: '08:30', distintas: false });
  });

  it('el encendido: días que no coinciden se ven apagados y distintos, hasta que se toca', () => {
    const prefs: PreferenciasDeAcciones = { ...BASE, dias: { 7: { diarioActivo: false } } };
    expect(vistaDelRecordatorio(prefs, [6, 7], {}).diario).toEqual({ valor: false, distintos: true });
    expect(vistaDelRecordatorio(prefs, [6, 7], { diarioActivo: true }).diario).toEqual({ valor: true, distintos: false });
  });

  it('«Cómo suena»: cada interruptor muestra lo común, o «Varía» si los días no coinciden', () => {
    const prefs: PreferenciasDeAcciones = { ...BASE, dias: { 6: { alarma: c(true, false, false, true) } } };
    // El sábado solo no vibra y repite; el domingo es la general (sonido y vibración).
    const solo = vistaDelRecordatorio(prefs, [6], {}).comoSuena.mostrados;
    expect(solo).toEqual({ sonido: true, vibracion: false, voz: false, repetir: true });
    const juntos = vistaDelRecordatorio(prefs, [6, 7], {}).comoSuena;
    expect(juntos.iniciales).toEqual({ sonido: true, vibracion: 'varia', voz: false, repetir: 'varia' });
    // Lo tocado va encima: «Repetir» encendido para los dos.
    expect(vistaDelRecordatorio(prefs, [6, 7], { alarma: { repetir: true } }).comoSuena.mostrados.repetir).toBe(true);
  });
});

describe('guardar solo lo tocado', () => {
  const PREFS: PreferenciasDeAcciones = {
    ...BASE,
    dias: { 6: { horaDiaria: '09:00', antelaciones: [30] }, 7: { horaDiaria: '10:00' } },
  };

  it('tocar solo el aviso cambia solo el aviso: cada día conserva su hora', () => {
    const despues = prefsSiSeGuarda(PREFS, [6, 7], { antelaciones: [0] });
    expect(despues.dias).toEqual({
      6: { horaDiaria: '09:00', antelaciones: [0] },
      7: { horaDiaria: '10:00', antelaciones: [0] },
    });
  });

  it('tocar solo la hora conserva el aviso de cada día', () => {
    const despues = prefsSiSeGuarda(PREFS, [6, 7], { horaDiaria: '11:00' });
    expect(despues.dias).toEqual({
      6: { horaDiaria: '11:00', antelaciones: [30] },
      7: { horaDiaria: '11:00' },
    });
  });

  it('solo «Cómo suena»: no se toca ni la hora ni el aviso', () => {
    const despues = prefsSiSeGuarda(PREFS, [6, 7], { alarma: { vibracion: false } });
    expect(despues.dias?.[6]).toEqual({ horaDiaria: '09:00', antelaciones: [30], alarma: c(true, false) });
    expect(despues.dias?.[7]).toEqual({ horaDiaria: '10:00', alarma: c(true, false) });
  });

  it('sin tocar nada, o tocando y dejándolo como estaba, no hay nada que guardar', () => {
    expect(hayCambiosPorGuardar(PREFS, [6, 7], {})).toBe(false);
    expect(hayCambiosPorGuardar(PREFS, [6], { horaDiaria: '09:00' })).toBe(false);
    expect(hayCambiosPorGuardar(PREFS, [6], { antelaciones: [30] })).toBe(false);
    expect(hayCambiosPorGuardar(PREFS, [6], { alarma: { sonido: true } })).toBe(false);
    expect(hayCambiosPorGuardar(PREFS, [6], { horaDiaria: '09:30' })).toBe(true);
  });
});

describe('las firmas para saber qué alarmas hay que rehacer', () => {
  it('no dependen del orden en que se escribieron las antelaciones', () => {
    expect(huellaDeLasPreferencias({ ...BASE, antelaciones: [30, 10] })).toBe(huellaDeLasPreferencias({ ...BASE, antelaciones: [10, 30] }));
    expect(huellaDeLosAvisos({ ...BASE, antelaciones: [30, 10] })).toBe(huellaDeLosAvisos({ ...BASE, antelaciones: [10, 30] }));
  });

  it('cambiar el aviso de un día no mueve el recordatorio diario, y cambiar la hora diaria no mueve los avisos', () => {
    const conAvisoNuevo: PreferenciasDeAcciones = { ...BASE, dias: { 6: { antelaciones: [30] } } };
    expect(huellaDelDiario(conAvisoNuevo)).toBe(huellaDelDiario(BASE));
    expect(huellaDeLosAvisos(conAvisoNuevo)).not.toBe(huellaDeLosAvisos(BASE));
    const conHoraNueva: PreferenciasDeAcciones = { ...BASE, horaDiaria: '08:00' };
    expect(huellaDeLosAvisos(conHoraNueva)).toBe(huellaDeLosAvisos(BASE));
    expect(huellaDelDiario(conHoraNueva)).not.toBe(huellaDelDiario(BASE));
  });
});
