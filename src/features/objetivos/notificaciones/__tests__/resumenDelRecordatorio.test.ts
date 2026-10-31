import { describe, expect, it } from '@jest/globals';

import { PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, type PreferenciasDeAcciones } from '../preferenciasPorDia';
import { RESUMEN_DE_LOS_RECORDATORIOS_POR_OMISION, resumenDeLosRecordatorios } from '../resumenDelRecordatorio';

const prefs = (extra: Partial<PreferenciasDeAcciones>): PreferenciasDeAcciones => ({ ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, ...extra });

describe('resumenDeLosRecordatorios (la línea de «Recordatorios de tus acciones ›»)', () => {
  it('diario y un aviso: «Todos los días a las 08:00 · aviso 10 min antes»', () => {
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, horaDiaria: '08:00', antelaciones: [10] }))).toBe(
      'Todos los días a las 08:00 · aviso 10 min antes',
    );
  });

  it('varios avisos se juntan en una frase, de el más temprano al más tardío', () => {
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [10, 30] }))).toBe(
      'Todos los días a las 08:00 · avisos 30 y 10 min antes',
    );
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: false, antelaciones: [0, 10, 30] }))).toBe(
      'Sin recordatorio diario · avisos 30 y 10 min antes y a la hora',
    );
  });

  it('«a la hora» solo, y las horas se dicen en horas', () => {
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [0] }))).toBe('Todos los días a las 08:00 · aviso a la hora');
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [60] }))).toBe('Todos los días a las 08:00 · aviso 1 h antes');
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [90, 10] }))).toBe(
      'Todos los días a las 08:00 · avisos 1 h 30 y 10 min antes',
    );
  });

  it('sin aviso, o sin diario, lo dice', () => {
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, horaDiaria: '06:30', antelaciones: [] }))).toBe(
      'Todos los días a las 06:30 · sin aviso antes de cada acción',
    );
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: false, antelaciones: [10] }))).toBe('Sin recordatorio diario · aviso 10 min antes');
  });

  it('todo apagado: «Apagados en este teléfono» (lo de fábrica)', () => {
    expect(resumenDeLosRecordatorios(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO)).toBe('Apagados en este teléfono');
  });

  it('con días distintos no los enumera: dice «según el día»', () => {
    expect(
      resumenDeLosRecordatorios(prefs({ diarioActivo: true, horaDiaria: '08:00', antelaciones: [10], dias: { 6: { horaDiaria: '10:00' }, 7: { diarioActivo: false } } })),
    ).toBe('Recordatorio diario según el día · aviso 10 min antes');
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [10], dias: { 6: { antelaciones: [] } } }))).toBe(
      'Todos los días a las 08:00 · avisos según el día',
    );
  });

  it('un día que repite lo general no cuenta como distinto', () => {
    expect(resumenDeLosRecordatorios(prefs({ diarioActivo: true, antelaciones: [10], dias: { 6: { horaDiaria: '08:00', antelaciones: [10] } } }))).toBe(
      'Todos los días a las 08:00 · aviso 10 min antes',
    );
  });

  it('mientras no se lee lo guardado, la fila dice una frase general', () => {
    expect(RESUMEN_DE_LOS_RECORDATORIOS_POR_OMISION).toBe('Recordatorio diario y aviso de cada acción');
  });
});
