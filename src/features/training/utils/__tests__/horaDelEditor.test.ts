import { describe, expect, it } from '@jest/globals';

import type { PreferenciaHabitoApi } from '../../../habits/types/habits.types';
import { horaDelEditor, preferenciaTrasGuardar, textoDelCambioProgramado } from '../horaDelEditor';

/**
 * PLN-02 (e2e web del 27/09): el editor de un hábito en «PLANIFICAR» tiene que decir la hora de hoy
 * Y el cambio ya guardado que rige desde mañana (D-91), y la rueda arranca en la que va a regir.
 */
const jugo = (triggerTime: string | null, pendingChange: PreferenciaHabitoApi['pendingChange'] = null): PreferenciaHabitoApi => ({
  habitId: 'h-jugo',
  title: 'JUGO VERDE',
  triggerTime,
  limitTime: '10:00:00',
  customized: true,
  reminderEnabled: true,
  reminderMinutesBefore: 10,
  pendingChange,
});
const desdeMañana = { triggerTime: '09:30:00', limitTime: null, effectiveDate: '2026-09-28' };

describe('horaDelEditor', () => {
  it('con un cambio pendiente: hoy la de siempre, la rueda en la nueva', () => {
    expect(horaDelEditor(jugo('09:00:00', desdeMañana), '09:00')).toEqual({
      ahora: '09:00',
      programado: { hora: '09:30', desde: '2026-09-28' },
      arranqueDeLaRueda: '09:30',
    });
  });

  it('sin cambio pendiente, todo es la hora de hoy', () => {
    expect(horaDelEditor(jugo('09:00:00'), '07:00')).toEqual({ ahora: '09:00', programado: null, arranqueDeLaRueda: '09:00' });
  });

  it('sin preferencia del servidor, la hora de la tarjeta (o nada)', () => {
    expect(horaDelEditor(undefined, '07:15')).toEqual({ ahora: '07:15', programado: null, arranqueDeLaRueda: '07:15' });
    expect(horaDelEditor(undefined, '')).toEqual({ ahora: '', programado: null, arranqueDeLaRueda: '' });
  });

  it('un pendiente sin hora no se anuncia', () => {
    expect(horaDelEditor(jugo('09:00:00', { ...desdeMañana, triggerTime: null }), '09:00').programado).toBeNull();
  });
});

describe('textoDelCambioProgramado', () => {
  it('la misma frase que la tarjeta del hábito en Plan', () => {
    expect(textoDelCambioProgramado({ hora: '09:30', desde: '2026-09-28' })).toBe('Desde el lunes 28 de septiembre: 09:30');
  });

  it('sin fecha del servidor, «Desde mañana»', () => {
    expect(textoDelCambioProgramado({ hora: '09:30', desde: '' })).toBe('Desde mañana: 09:30');
  });
});

describe('preferenciaTrasGuardar', () => {
  const aviso = { activo: true, minutosAntes: 30 };

  it('diferido: la hora de hoy queda, el cambio queda pendiente con su fecha', () => {
    const despues = preferenciaTrasGuardar(jugo('09:00:00'), {
      habitoId: 'h-jugo',
      titulo: 'JUGO VERDE',
      horaDeLaTarjeta: '09:00',
      horaNueva: '09:30',
      recordatorio: aviso,
      resultado: { deferred: true, deferredEffectiveDate: '2026-09-28' },
    });
    expect(despues.triggerTime).toBe('09:00:00');
    expect(despues.pendingChange).toEqual({ triggerTime: '09:30:00', limitTime: '10:00:00', effectiveDate: '2026-09-28' });
    expect([despues.reminderEnabled, despues.reminderMinutesBefore]).toEqual([true, 30]);
    expect(horaDelEditor(despues, '09:00')).toEqual({
      ahora: '09:00',
      programado: { hora: '09:30', desde: '2026-09-28' },
      arranqueDeLaRueda: '09:30',
    });
  });

  it('inmediato: cambia la hora de hoy y no queda nada pendiente', () => {
    const despues = preferenciaTrasGuardar(jugo('09:00:00', desdeMañana), {
      habitoId: 'h-jugo',
      titulo: 'JUGO VERDE',
      horaDeLaTarjeta: '09:00',
      horaNueva: '08:00',
      recordatorio: aviso,
      resultado: { deferred: false },
    });
    expect(despues.triggerTime).toBe('08:00:00');
    expect(despues.pendingChange).toBeNull();
  });

  it('sin preferencia previa, la arma con la hora de la tarjeta', () => {
    const despues = preferenciaTrasGuardar(undefined, {
      habitoId: 'h-nuevo',
      titulo: 'CAMINAR',
      horaDeLaTarjeta: '07:00',
      horaNueva: '07:30',
      recordatorio: { activo: false, minutosAntes: null },
      resultado: { deferred: true, deferredEffectiveDate: '2026-09-28' },
    });
    expect(horaDelEditor(despues, '07:00')).toEqual({
      ahora: '07:00',
      programado: { hora: '07:30', desde: '2026-09-28' },
      arranqueDeLaRueda: '07:30',
    });
  });
});
