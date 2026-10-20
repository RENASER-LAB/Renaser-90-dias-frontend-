/**
 * La lógica de «Cómo suena» en el editor de Planificar (spec 009), sin pantalla: qué muestra cada interruptor con uno
 * o varios días marcados, qué pasa al tocar cada uno (las reglas de sonido, vibración y voz), por qué la sección se
 * atenúa y qué dice el botón de guardar.
 */
import { describe, expect, it } from '@jest/globals';

import tablaDeVoces from '../../../alarmas/vocesDeLasAlarmas.json';
import { canalDeAlarma } from '../../../alarmas/sonidoDeAlarma';
import type { CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import type { DiaDeLaSemanaApi } from '../../../habits/types/habits.types';
import { diasDelEditor, diasPropiosDelEditor, queGuardarConAlarma, servidorInformaAlarmaPorDia, textoDelBoton } from '../avisoDeLosDias';
import {
  alTocarUnaFila,
  combinacionResultante,
  DESCRIPCION_VOZ_GENERAL,
  DESCRIPCION_VOZ_PROPIA,
  estadosIniciales,
  estadosMostrados,
  FILAS_DE_COMO_SUENA,
  filasDeComoSuena,
  hayCambios,
  MENSAJE_SONIDO_O_VIBRACION,
  MENSAJE_TONO_SOLO_VIBRAR,
  MENSAJE_VOZ_DEL_TONO,
  MENSAJE_VOZ_NECESITA_SONIDO,
  mensajesEnLinea,
  motivoDeAtenuacion,
  reglaIncumplidaDeLaSeleccion,
  resumenDeLaCombinacion,
  vozDeshabilitada,
  type Tocados,
} from '../comoSuena';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});
const DE_SIEMPRE = c(true, true);

/** Toca varias filas en orden, como lo haría el dedo. */
function tocar(combinaciones: CombinacionDeAlarma[], ...claves: Array<keyof CombinacionDeAlarma>): Tocados {
  const iniciales = estadosIniciales(combinaciones);
  let tocados: Tocados = {};
  for (const clave of claves) tocados = alTocarUnaFila(iniciales, tocados, clave);
  return tocados;
}

describe('las cuatro filas', () => {
  it('con los rótulos y las explicaciones de la spec, en este orden', () => {
    expect(FILAS_DE_COMO_SUENA.map(f => f.etiqueta)).toEqual([
      'Sonido', 'Vibración', 'Voz que dice el hábito', 'Repetir si no la atiendo',
    ]);
    expect(FILAS_DE_COMO_SUENA.map(f => f.descripcion)).toEqual([
      'Suena el tono que elegiste en Yo → Alarmas',
      'El teléfono vibra',
      'Una voz dice el nombre del hábito',
      'Vuelve a sonar a los 5 y a los 10 minutos',
    ]);
    expect(FILAS_DE_COMO_SUENA.map(f => f.clave)).toEqual(['sonido', 'vibracion', 'voz', 'repetir']);
  });
});

describe('la explicación de la fila «Voz» según el hábito', () => {
  const GIMNASIO = { id: 'ec0f2b08-3a18-4ff4-8e2b-243e5220d211', titulo: 'GIMNASIO' };
  const voz = (habito: { id: string; titulo: string } | undefined) => filasDeComoSuena(habito).find(f => f.clave === 'voz')!.descripcion;

  it('con voz propia dice que la voz dice su nombre; sin ella, la frase general', () => {
    expect(DESCRIPCION_VOZ_PROPIA).toBe('Una voz dice el nombre del hábito');
    expect(DESCRIPCION_VOZ_GENERAL).toBe('Este hábito dice la frase general: «Tu hábito está por empezar»');
    expect(voz(GIMNASIO)).toBe(DESCRIPCION_VOZ_PROPIA);
    expect(voz({ id: 'ea87fdec-d4c1-4c4f-9e61-1557bc7255d1', titulo: 'Kilómetros diarios' })).toBe(DESCRIPCION_VOZ_PROPIA);
  });

  it('la frase general sale de la misma tabla que el audio: si cambia allí, cambia acá', () => {
    expect(DESCRIPCION_VOZ_GENERAL).toContain(tablaDeVoces.genericas.habitos.dice.replace(/\.$/, ''));
  });

  it('renombrado, propio, nuevo o sin hábito: la frase general (no se promete un nombre que no se va a oír)', () => {
    expect(voz({ ...GIMNASIO, titulo: 'Mi gimnasio' })).toBe(DESCRIPCION_VOZ_GENERAL);
    expect(voz({ id: 'h-propio', titulo: 'Leer' })).toBe(DESCRIPCION_VOZ_GENERAL);
    expect(voz({ id: '00000000-0000-0000-0000-000000000000', titulo: 'HÁBITO NUEVO DEL PANEL' })).toBe(DESCRIPCION_VOZ_GENERAL);
    expect(voz(undefined)).toBe(DESCRIPCION_VOZ_GENERAL);
  });

  it('solo cambia la fila de voz: las otras tres y el orden son los de siempre', () => {
    for (const habito of [GIMNASIO, { id: 'h-propio', titulo: 'Leer' }, undefined]) {
      const filas = filasDeComoSuena(habito);
      expect(filas.map(f => f.clave)).toEqual(['sonido', 'vibracion', 'voz', 'repetir']);
      expect(filas.filter(f => f.clave !== 'voz')).toEqual(FILAS_DE_COMO_SUENA.filter(f => f.clave !== 'voz'));
      expect(filas.find(f => f.clave === 'voz')?.etiqueta).toBe('Voz que dice el hábito');
    }
  });

  it('dice lo mismo que suena: para cada hábito de la tabla y para uno cualquiera, coincide con el canal de la alarma', () => {
    const habitos = [
      ...tablaDeVoces.habitos.map(h => ({ id: h.habitoId, titulo: h.tituloDelCatalogo })),
      ...tablaDeVoces.habitos.map(h => ({ id: h.habitoId, titulo: `${h.tituloDelCatalogo} (renombrado)` })),
      { id: 'h-propio', titulo: 'Leer' },
    ];
    for (const habito of habitos) {
      const suenaSuNombre = canalDeAlarma('habitos', 'voz', habito).sonidoDelCanal !== 'voz_habito.mp3';
      expect({ habito, dice: voz(habito) }).toEqual({
        habito,
        dice: suenaSuNombre ? DESCRIPCION_VOZ_PROPIA : DESCRIPCION_VOZ_GENERAL,
      });
    }
  });
});

describe('qué muestra cada interruptor al abrir', () => {
  it('sin días marcados: la general', () => {
    expect(estadosIniciales([c(true, false, false, true)])).toEqual({ sonido: true, vibracion: false, voz: false, repetir: true });
  });

  it('con varios días iguales: lo que tienen en común', () => {
    expect(estadosIniciales([c(true, true), c(true, true)])).toEqual({ sonido: true, vibracion: true, voz: false, repetir: false });
  });

  it('con días distintos: cada interruptor que difiere se ve «Varía»; los que coinciden, no', () => {
    const estados = estadosIniciales([c(true, true, false, true), c(false, true, false, false)]);
    expect(estados).toEqual({ sonido: 'varia', vibracion: true, voz: false, repetir: 'varia' });
  });
});

describe('al tocar un interruptor', () => {
  it('encendido pasa a apagado, apagado a encendido', () => {
    const iniciales = estadosIniciales([DE_SIEMPRE]);
    expect(alTocarUnaFila(iniciales, {}, 'vibracion')).toEqual({ vibracion: false });
    expect(alTocarUnaFila(iniciales, {}, 'repetir')).toEqual({ repetir: true });
    // Y tocarlo otra vez lo deja como estaba.
    const una = alTocarUnaFila(iniciales, {}, 'repetir');
    expect(alTocarUnaFila(iniciales, una, 'repetir')).toEqual({ repetir: false });
  });

  it('«Varía» al tocarlo pasa a encendido para todos los días marcados', () => {
    const dias = [c(true, true, false, true), c(true, true, false, false)];
    const iniciales = estadosIniciales(dias);
    const tocados = alTocarUnaFila(iniciales, {}, 'repetir');
    expect(tocados).toEqual({ repetir: true });
    expect(dias.map(d => combinacionResultante(d, tocados).repetir)).toEqual([true, true]);
  });

  it('apagar «Sonido» apaga «Voz» y la deshabilita', () => {
    const dias = [c(true, true, true)];
    const iniciales = estadosIniciales(dias);
    const tocados = alTocarUnaFila(iniciales, {}, 'sonido');
    expect(tocados).toEqual({ sonido: false, voz: false });
    const mostrados = estadosMostrados(iniciales, tocados);
    expect(mostrados).toMatchObject({ sonido: false, voz: false });
    expect(vozDeshabilitada(mostrados)).toBe(true);
    expect(mensajesEnLinea({ mostrados, regla: null, tonoDeYo: 'sistema' }).voz).toBe(MENSAJE_VOZ_NECESITA_SONIDO);
  });

  it('con «Sonido» apagado, tocar «Voz» no hace nada', () => {
    const dias = [c(false, true)];
    const iniciales = estadosIniciales(dias);
    expect(vozDeshabilitada(estadosMostrados(iniciales, {}))).toBe(true);
    expect(alTocarUnaFila(iniciales, {}, 'voz')).toEqual({});
  });

  it('encender «Voz» enciende «Sonido» (la voz es un sonido), también si el sonido «Varía»', () => {
    expect(tocar([c(true, true)], 'voz')).toEqual({ voz: true });
    const conVaria = tocar([c(true, true), c(false, true)], 'voz');
    expect(conVaria).toEqual({ voz: true, sonido: true });
    expect(combinacionResultante(c(false, true), conVaria)).toEqual(c(true, true, true));
  });

  it('apagar «Sonido» con la voz ya apagada no marca la voz como tocada', () => {
    expect(tocar([DE_SIEMPRE], 'sonido')).toEqual({ sonido: false });
  });

  it('volver a encender «Sonido» no devuelve la voz', () => {
    const tocados = tocar([c(true, true, true)], 'sonido', 'sonido');
    expect(tocados).toEqual({ sonido: true, voz: false });
  });
});

describe('sonido y vibración no pueden quedar los dos apagados', () => {
  it('los dos apagados: la regla se incumple y el mensaje va en línea', () => {
    const dias = [DE_SIEMPRE];
    const tocados = tocar(dias, 'sonido', 'vibracion');
    const regla = reglaIncumplidaDeLaSeleccion(dias, tocados);
    expect(regla).toBe('sinSonidoNiVibracion');
    const mostrados = estadosMostrados(estadosIniciales(dias), tocados);
    expect(mensajesEnLinea({ mostrados, regla, tonoDeYo: 'sistema' }).sonidoOVibracion).toBe(MENSAJE_SONIDO_O_VIBRACION);
    expect(MENSAJE_SONIDO_O_VIBRACION).toContain('Sin aviso');
  });

  it('con uno solo apagado todo está bien', () => {
    expect(reglaIncumplidaDeLaSeleccion([DE_SIEMPRE], tocar([DE_SIEMPRE], 'sonido'))).toBeNull();
    expect(reglaIncumplidaDeLaSeleccion([DE_SIEMPRE], tocar([DE_SIEMPRE], 'vibracion'))).toBeNull();
  });

  it('mira el resultado de CADA día: con el sonido en «Varía», apagar la vibración dejaría mudo al día que no suena', () => {
    const dias = [c(true, true), c(false, true)];
    const tocados = tocar(dias, 'vibracion');
    expect(estadosMostrados(estadosIniciales(dias), tocados).sonido).toBe('varia');
    expect(reglaIncumplidaDeLaSeleccion(dias, tocados)).toBe('sinSonidoNiVibracion');
  });

  it('sin tocar nada no hay regla incumplida', () => {
    expect(reglaIncumplidaDeLaSeleccion([DE_SIEMPRE, c(false, true)], {})).toBeNull();
  });
});

describe('qué cambia de verdad', () => {
  it('tocar y volver a dejarlo como estaba no es un cambio', () => {
    const dias = [DE_SIEMPRE];
    expect(hayCambios(dias, {})).toBe(false);
    expect(hayCambios(dias, tocar(dias, 'repetir'))).toBe(true);
    expect(hayCambios(dias, tocar(dias, 'repetir', 'repetir'))).toBe(false);
  });

  it('con días distintos, tocar un «Varía» cambia a los días que no lo tenían', () => {
    const dias = [c(true, true, false, true), c(true, true, false, false)];
    expect(hayCambios(dias, tocar(dias, 'repetir'))).toBe(true);
  });

  it('lo que no se tocó conserva, día por día, lo que cada día tenía', () => {
    const sabado = c(false, true, false, true);
    const lunes = c(true, true, true, false);
    const tocados = tocar([sabado, lunes], 'vibracion');
    expect(combinacionResultante(sabado, tocados)).toEqual(c(false, false, false, true));
    expect(combinacionResultante(lunes, tocados)).toEqual(c(true, false, true, false));
  });
});

describe('el tono de Yo → Alarmas', () => {
  const mostrados = estadosMostrados(estadosIniciales([DE_SIEMPRE]), {});

  it('«Voz» en Yo: la fila de voz dice por qué ya habla', () => {
    expect(mensajesEnLinea({ mostrados, regla: null, tonoDeYo: 'voz' }).voz).toBe(MENSAJE_VOZ_DEL_TONO);
  });

  it('«Solo vibrar» en Yo: la fila de sonido avisa que no va a sonar', () => {
    expect(mensajesEnLinea({ mostrados, regla: null, tonoDeYo: 'vibrar' }).sonido).toBe(MENSAJE_TONO_SOLO_VIBRAR);
  });

  it('con cualquier otro tono no hay mensajes de más', () => {
    expect(mensajesEnLinea({ mostrados, regla: null, tonoDeYo: 'campana' })).toEqual({
      sonidoOVibracion: null, voz: null, sonido: null,
    });
  });
});

describe('por qué la sección va atenuada', () => {
  const base = { sinAviso: false, todosApagados: false, conDias: true, cuantosDias: 1 };

  it('«Sin aviso» ese día: «Este día no tiene aviso»', () => {
    expect(motivoDeAtenuacion({ ...base, sinAviso: true })?.titulo).toBe('Este día no tiene aviso');
    expect(motivoDeAtenuacion({ ...base, sinAviso: true, cuantosDias: 3 })?.titulo).toBe('Estos días no tienen aviso');
    expect(motivoDeAtenuacion({ ...base, sinAviso: true, conDias: false, cuantosDias: 0 })?.titulo).toBe('Este hábito no tiene aviso');
  });

  it('un día apagado manda sobre el aviso: sin hábito no hay alarma', () => {
    expect(motivoDeAtenuacion({ ...base, sinAviso: true, todosApagados: true })?.titulo).toBe('Ese día el hábito no va');
  });

  it('con aviso (o avisos distintos) se puede usar', () => {
    expect(motivoDeAtenuacion(base)).toBeNull();
  });
});

describe('qué se guarda y qué dice el botón', () => {
  it('solo «Cómo suena»: «Guardar alarma · sáb», sin tocar la hora ni el aviso', () => {
    const que = queGuardarConAlarma({ movioLaRueda: false, cambioElAviso: false, cambioLaAlarma: true });
    expect(que).toBe('ninguno');
    expect(textoDelBoton({ guardando: false, dias: ['SÁB'], que, hora: '07:00', alarma: true })).toBe('Guardar alarma · sáb');
    expect(textoDelBoton({ guardando: false, dias: [], que, hora: '07:00', alarma: true })).toBe('Guardar alarma · todos los días');
  });

  it('con lo demás, lo suma al texto', () => {
    const dias = ['SÁB', 'DOM'] as const;
    const t = (movioLaRueda: boolean, cambioElAviso: boolean) =>
      textoDelBoton({
        guardando: false, dias: [...dias], hora: '07:30', alarma: true,
        que: queGuardarConAlarma({ movioLaRueda, cambioElAviso, cambioLaAlarma: true }),
      });
    expect(t(true, false)).toBe('Guardar hora y alarma · sáb, dom');
    expect(t(false, true)).toBe('Guardar aviso y alarma · sáb, dom');
    expect(t(true, true)).toBe('Guardar hora, aviso y alarma · sáb, dom');
  });

  it('sin tocar «Cómo suena» el botón es el de siempre', () => {
    const textos = [
      [{ movioLaRueda: false, cambioElAviso: false }, 'Guardar 07:00 · sáb'],
      [{ movioLaRueda: true, cambioElAviso: false }, 'Guardar 07:00 · sáb'],
      [{ movioLaRueda: false, cambioElAviso: true }, 'Guardar aviso · sáb'],
      [{ movioLaRueda: true, cambioElAviso: true }, 'Guardar hora y aviso · sáb'],
    ] as const;
    for (const [cambios, esperado] of textos) {
      const que = queGuardarConAlarma({ ...cambios, cambioLaAlarma: false });
      expect(textoDelBoton({ guardando: false, dias: ['SÁB'], que, hora: '07:00' })).toBe(esperado);
    }
    expect(textoDelBoton({ guardando: false, dias: [], que: 'hora', hora: '07:00' })).toBe('Guardar 07:00 · todos los días');
    expect(textoDelBoton({ guardando: true, dias: ['SÁB'], que: 'hora', hora: '07:00', alarma: true })).toBe('Guardando…');
  });
});

describe('el chip del día y el lector de pantalla', () => {
  it('la combinación dicha en pocas palabras', () => {
    expect(resumenDeLaCombinacion(c(false, true, false, true))).toBe('sin sonido, vibra, se repite');
    expect(resumenDeLaCombinacion(c(true, false, true))).toBe('con voz, no vibra');
    expect(resumenDeLaCombinacion(DE_SIEMPRE)).toBe('con sonido, vibra');
  });
});

describe('los días del editor con «cómo suena»', () => {
  const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const semana = (cambios: Record<string, Partial<DiaDeLaSemanaApi>> = {}): DiaDeLaSemanaApi[] =>
    NOMBRES.map(weekday => ({
      weekday, triggerTime: '07:00:00', limitTime: null, custom: false, active: true,
      reminderEnabled: true, reminderMinutesList: [10], customReminder: false,
      alarm: { sound: true, vibration: true, voice: false, repeat: false }, customAlarm: false,
      ...cambios[weekday],
    }));

  it('cada día trae su combinación resuelta y si es propia; el servidor la informa en los siete', () => {
    const dias = diasDelEditor(semana({
      SATURDAY: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: true } },
    }), [10]);
    expect(dias['SÁB']).toMatchObject({ alarma: c(false, true, false, true), alarmaPropia: true });
    expect(dias.LUN).toMatchObject({ alarma: c(true, true), alarmaPropia: false });
    expect(servidorInformaAlarmaPorDia(dias)).toBe(true);
  });

  it('un backend anterior (sin `customAlarm`) no informa: no se ofrece «Cómo suena»', () => {
    const sin = semana().map(({ alarm: _a, customAlarm: _c, ...resto }) => resto) as DiaDeLaSemanaApi[];
    const dias = diasDelEditor(sin, [10]);
    expect(dias.LUN.alarma).toBeUndefined();
    expect(servidorInformaAlarmaPorDia(dias)).toBe(false);
  });

  it('a las alarmas del teléfono solo pasan los días con «cómo suena» PROPIO', () => {
    const dias = diasDelEditor(semana({
      SATURDAY: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: false } },
    }), [10]);
    const propios = diasPropiosDelEditor(dias);
    expect(propios.find(d => d.iso === 6)?.alarma).toEqual(c(false, true));
    expect(propios.filter(d => d.iso !== 6).every(d => d.alarma === undefined)).toBe(true);
  });
});
