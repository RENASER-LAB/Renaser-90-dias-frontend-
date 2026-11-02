import { describe, expect, it } from '@jest/globals';

import type { SemanaDelHabitoApi } from '../../../habits/types/habits.types';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../../habits/utils/semanaDelPlan';
import {
  OPCIONES_DE_ALCANCE,
  alternarDiaDeLaSemana,
  apagadoPorElPlanDeSiempre,
  cambiosDeLaSemana,
  cambiosParaApagar,
  cambiosParaVolverAlPlanDeSiempre,
  confirmacionDeLaSemana,
  diasConCambioSoloEstaSemana,
  diasDelEditorDeLaSemana,
  diasQueSePuedenMarcar,
  elServidorSabeDeLaSemana,
  hayAlgoQueGuardarEnLaSemana,
  textoDelBotonDeLaSemana,
} from '../alcanceDeLaSemana';

const FECHAS: Record<DiaDelPlan, string> = {
  LUN: '2026-11-02', MAR: '2026-11-03', 'MIÉ': '2026-11-04', JUE: '2026-11-05', VIE: '2026-11-06', 'SÁB': '2026-11-07', DOM: '2026-11-08',
};
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const semana = (cambios: Record<string, Partial<SemanaDelHabitoApi['days'][number]>> = {}): SemanaDelHabitoApi => ({
  weekStart: '2026-11-02',
  weekEnd: '2026-11-08',
  days: NOMBRES.map((weekday, i) => ({
    weekday,
    date: `2026-11-0${2 + i}`,
    triggerTime: '06:00:00',
    limitTime: null,
    active: true,
    reminderEnabled: true,
    reminderMinutesList: [30],
    customTime: false,
    customReminder: false,
    customDate: false,
    editable: true,
    ...(cambios[weekday] ?? {}),
  })),
});

const todosCorren = Object.fromEntries(DIAS_DEL_PLAN.map(d => [d, true])) as Record<DiaDelPlan, boolean>;
const hastaElJueves = (d: DiaDelPlan) => ['VIE', 'SÁB', 'DOM'].includes(d); // hoy es jueves: solo vie, sáb y dom se pueden cambiar

describe('elServidorSabeDeLaSemana (FR-021)', () => {
  it('solo si el servidor mandó dateOverrides, aunque venga vacío', () => {
    const base = { habitId: 'h', title: 'h', triggerTime: null, limitTime: null, customized: false, pendingChange: null };
    expect(elServidorSabeDeLaSemana({ ...base, dateOverrides: [] })).toBe(true);
    expect(elServidorSabeDeLaSemana({ ...base })).toBe(false);
    expect(elServidorSabeDeLaSemana(undefined)).toBe(false);
  });
});

describe('diasDelEditorDeLaSemana: la semana leída tiene la forma del editor', () => {
  it('lee hora, aviso, alarma y si la fecha tiene cambio propio', () => {
    const dias = diasDelEditorDeLaSemana(
      semana({
        SATURDAY: {
          triggerTime: '09:00:00', customTime: true, customDate: true,
          reminderMinutesList: [30, 0], customReminder: true,
          alarm: { sound: true, vibration: false, voice: false, repeat: true }, customAlarm: true,
        },
        SUNDAY: { active: false, customDate: true },
      }),
      [30],
    );
    expect(dias['SÁB']).toEqual(expect.objectContaining({
      hora: '09:00', propio: true, activo: true, aviso: [30, 0], avisoPropio: true, alarmaPropia: true, propioDeLaFecha: true,
      alarma: { sonido: true, vibracion: false, voz: false, repetir: true },
    }));
    expect(dias.LUN).toEqual(expect.objectContaining({ hora: '06:00', propio: false, aviso: [30], avisoPropio: false, propioDeLaFecha: false }));
    expect(dias.DOM).toEqual(expect.objectContaining({ activo: false, propioDeLaFecha: true }));
  });

  it('un aviso apagado ese día es una lista vacía (no el aviso general)', () => {
    const dias = diasDelEditorDeLaSemana(semana({ FRIDAY: { reminderEnabled: false, reminderMinutesList: [], customReminder: true } }), [30]);
    expect(dias.VIE.aviso).toEqual([]);
    expect(dias.VIE.avisoPropio).toBe(true);
  });
});

describe('qué días se pueden marcar en «Solo esta semana»', () => {
  const dias = diasDelEditorDeLaSemana(semana({ SUNDAY: { active: false } }), [30]);

  it('un día apagado por el plan de siempre (sin cambio propio de la fecha) cuenta como un día en que no corre', () => {
    expect(apagadoPorElPlanDeSiempre(dias.DOM)).toBe(true);
    expect(apagadoPorElPlanDeSiempre(dias.VIE)).toBe(false);
    expect(apagadoPorElPlanDeSiempre({ ...dias.DOM, propioDeLaFecha: true })).toBe(false);
  });

  it('hoy y lo pasado van con candado, el que no corre no se marca y el apagado por el plan tampoco', () => {
    expect(diasQueSePuedenMarcar(todosCorren, hastaElJueves, dias)).toEqual(['VIE', 'SÁB']);
    expect(diasQueSePuedenMarcar({ ...todosCorren, VIE: false }, hastaElJueves, dias)).toEqual(['SÁB']);
  });

  it('los días con cambio propio de la fecha, entre los marcables', () => {
    const conCambio = diasDelEditorDeLaSemana(semana({ SATURDAY: { customDate: true } }), [30]);
    expect(diasConCambioSoloEstaSemana(['VIE', 'SÁB'], conCambio)).toEqual(['SÁB']);
  });
});

describe('marcar y desmarcar: nunca queda vacío', () => {
  const marcables: DiaDelPlan[] = ['VIE', 'SÁB', 'DOM'];

  it('suma en el orden de la semana', () => {
    expect(alternarDiaDeLaSemana(['DOM'], 'VIE', marcables)).toEqual(['VIE', 'DOM']);
  });
  it('quita un día si queda otro', () => {
    expect(alternarDiaDeLaSemana(['VIE', 'SÁB'], 'SÁB', marcables)).toEqual(['VIE']);
  });
  it('el último marcado no se puede quitar: «sin días» no significaría «general»', () => {
    expect(alternarDiaDeLaSemana(['SÁB'], 'SÁB', marcables)).toEqual(['SÁB']);
  });
  it('un día que no se puede marcar no hace nada', () => {
    expect(alternarDiaDeLaSemana(['SÁB'], 'LUN', marcables)).toEqual(['SÁB']);
  });
});

describe('los alcances: «Siempre | Por semana»', () => {
  it('se llaman así, en ese orden, y el lector de pantalla oye hasta cuándo vale cada uno', () => {
    expect(OPCIONES_DE_ALCANCE.map(o => [o.valor, o.etiqueta])).toEqual([['siempre', 'Siempre'], ['semana', 'Por semana']]);
    expect(OPCIONES_DE_ALCANCE[0].accessibilityLabel).toContain('todas las semanas');
    expect(OPCIONES_DE_ALCANCE[1].accessibilityLabel).toContain('semana que elijas');
  });
});

describe('los textos', () => {
  const marcables: DiaDelPlan[] = ['VIE', 'SÁB', 'DOM'];

  it('el botón: «Guardar 21:30 · semana 9–15 nov» con todos y con los días con algunos', () => {
    const base = { guardando: false, marcables, hora: '21:30', alarma: false, semana: '9–15 nov' };
    expect(textoDelBotonDeLaSemana({ ...base, marcados: marcables, que: 'hora' })).toBe('Guardar 21:30 · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, marcados: ['SÁB', 'DOM'], que: 'hora' })).toBe('Guardar 21:30 · sáb, dom · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, marcados: marcables, que: 'aviso' })).toBe('Guardar aviso · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, marcados: ['SÁB'], que: 'aviso' })).toBe('Guardar aviso · sáb · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, marcados: marcables, que: 'ninguno', alarma: true })).toBe('Guardar alarma · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, marcados: ['SÁB'], que: 'ambos', alarma: true })).toBe('Guardar hora, aviso y alarma · sáb · semana 9–15 nov');
    expect(textoDelBotonDeLaSemana({ ...base, guardando: true, marcados: marcables, que: 'hora' })).toBe('Guardando…');
  });
  it('la semana que cruza de mes se dice entera en el botón', () => {
    expect(textoDelBotonDeLaSemana({ guardando: false, marcados: marcables, marcables, que: 'hora', hora: '07:00', alarma: false, semana: '26 oct–1 nov' }))
      .toBe('Guardar 07:00 · semana 26 oct–1 nov');
  });
  it('la confirmación nombra lo guardado, los días y la semana, en una línea', () => {
    expect(confirmacionDeLaSemana({ que: 'hora', hora: '09:00', aviso: null, dias: ['SÁB', 'DOM'], alarma: false, semana: '9–15 nov' }))
      .toBe('Queda a las 09:00 los sáb, dom de la semana 9–15 nov.');
    expect(confirmacionDeLaSemana({ que: 'hora', hora: '21:30', aviso: null, dias: [...DIAS_DEL_PLAN], alarma: false, semana: '9–15 nov' }))
      .toBe('Queda a las 21:30 todos los días de la semana 9–15 nov.');
    expect(confirmacionDeLaSemana({ que: 'aviso', hora: '09:00', aviso: [], dias: ['SÁB'], alarma: true, semana: '9–15 nov' }))
      .toContain('sin aviso, con su alarma nueva');
  });
});

describe('el pedido: SOLO lo tocado de los días marcados', () => {
  const alarmas = { 'SÁB': { sonido: true, vibracion: false, voz: false, repetir: true } };
  const base = { dias: ['SÁB', 'DOM'] as DiaDelPlan[], fechas: FECHAS, hora: '09:00', limite: '10:00:00', aviso: [30, 0], alarmaPorDia: null };

  it('moviendo la rueda: hora y límite, y nada de aviso ni alarma', () => {
    expect(cambiosDeLaSemana({ ...base, que: 'hora' })).toEqual([
      { date: '2026-11-07', triggerTime: '09:00:00', limitTime: '10:00:00' },
      { date: '2026-11-08', triggerTime: '09:00:00', limitTime: '10:00:00' },
    ]);
  });
  it('tocando solo el aviso: el aviso y nada de hora', () => {
    expect(cambiosDeLaSemana({ ...base, que: 'aviso' })).toEqual([
      { date: '2026-11-07', reminderEnabled: true, reminderMinutesList: [30, 0] },
      { date: '2026-11-08', reminderEnabled: true, reminderMinutesList: [30, 0] },
    ]);
  });
  it('un aviso vacío apaga el aviso de ese día', () => {
    expect(cambiosDeLaSemana({ ...base, que: 'aviso', aviso: [] })[0]).toEqual({ date: '2026-11-07', reminderEnabled: false, reminderMinutesList: [] });
  });
  it('solo «Cómo suena»: la combinación de cada día y nada más', () => {
    const pedido = cambiosDeLaSemana({ ...base, dias: ['SÁB'], que: 'ninguno', alarmaPorDia: alarmas });
    expect(pedido).toEqual([{ date: '2026-11-07', alarm: { sound: true, vibration: false, voice: false, repeat: true } }]);
  });
  it('las tres cosas juntas', () => {
    const pedido = cambiosDeLaSemana({ ...base, dias: ['SÁB'], que: 'ambos', alarmaPorDia: alarmas });
    expect(Object.keys(pedido[0]).sort()).toEqual(['alarm', 'date', 'limitTime', 'reminderEnabled', 'reminderMinutesList', 'triggerTime']);
  });
  it('apagar y volver al plan de siempre llevan solo la fecha y su orden', () => {
    expect(cambiosParaApagar(['SÁB'], FECHAS)).toEqual([{ date: '2026-11-07', active: false }]);
    expect(cambiosParaVolverAlPlanDeSiempre(['VIE', 'SÁB'], FECHAS)).toEqual([
      { date: '2026-11-06', reset: true },
      { date: '2026-11-07', reset: true },
    ]);
  });
  it('sin tocar nada no hay nada que guardar', () => {
    expect(hayAlgoQueGuardarEnLaSemana({ movioLaRueda: false, cambioElAviso: false, cambioLaAlarma: false })).toBe(false);
    expect(hayAlgoQueGuardarEnLaSemana({ movioLaRueda: false, cambioElAviso: true, cambioLaAlarma: false })).toBe(true);
  });
});
