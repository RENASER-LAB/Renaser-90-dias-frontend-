/**
 * «Cómo suena» la alarma (spec 009): resolver la combinación de cada día y elegir el canal de Android por el que
 * sale (research R1). Puro: no toca la librería de avisos.
 *
 * La tabla de la spec:
 *
 * | Sonido | Vibración | Voz | Canal |
 * |---|---|---|---|
 * | sí | sí | no | el del sonido de Yo → Alarmas (como hoy) |
 * | sí | no | no | ese mismo + `-sinvib` |
 * | no | sí | — | «solo vibrar» (ya existía) |
 * | sí | sí/no | sí | el de voz del hábito (o la frase general), con o sin `-sinvib` |
 */
import { describe, expect, it } from '@jest/globals';

import {
  archivoDelCanal,
  canalDeAlarma,
  conVibracion,
  sinVibracion,
  SUFIJO_SIN_VIBRACION,
} from '../../../alarmas/sonidoDeAlarma';
import type { DiaDelHabitoApi } from '../../types/habits.types';
import {
  canalDeLaCombinacion,
  codigoDeLaCombinacion,
  combinacionDeLaApi,
  combinacionALaApi,
  combinacionDelDia,
  combinacionEfectiva,
  combinacionGuardada,
  COMBINACION_POR_DEFECTO,
  esLaCombinacionPorDefecto,
  mismaCombinacion,
  reglaIncumplida,
  type CombinacionDeAlarma,
} from '../utils/combinacionDeAlarma';
import { diasPropiosDe, firmaDelPlan, planDeAlarmas, usaEsquemaPorDia } from '../utils/alarmasPorDia';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});

/** Un hábito del catálogo con voz propia (Despertar, V4 del backend) y uno propio de la persona. */
const DEL_CATALOGO = { id: '899a2151-e98c-4b61-a46c-b55134240d17', titulo: 'DESPERTAR' };
const PROPIO = { id: 'h-propio', titulo: 'Leer' };

describe('la combinación de siempre y su lectura', () => {
  it('sin nada guardado es sonido y vibración, sin voz propia y sin repetir (lo que había antes de la spec)', () => {
    expect(COMBINACION_POR_DEFECTO).toEqual({ sonido: true, vibracion: true, voz: false, repetir: false });
    expect(esLaCombinacionPorDefecto(c(true, true))).toBe(true);
    expect(esLaCombinacionPorDefecto(c(true, true, false, true))).toBe(false);
  });

  it('la del día: la propia si la tiene, si no la general, y si tampoco la de siempre', () => {
    expect(combinacionDelDia(c(true, false), c(false, true))).toEqual(c(false, true));
    expect(combinacionDelDia(c(true, false), null)).toEqual(c(true, false));
    expect(combinacionDelDia(null, undefined)).toEqual(COMBINACION_POR_DEFECTO);
    // Una copia: nadie puede cambiar el valor por defecto sin querer.
    expect(combinacionDelDia(null, null)).not.toBe(COMBINACION_POR_DEFECTO);
  });

  it('del servidor: { sound, vibration, voice, repeat } ↔ la de la app; lo que no se entiende es «sin dato»', () => {
    const api = { sound: true, vibration: false, voice: true, repeat: true };
    expect(combinacionDeLaApi(api)).toEqual(c(true, false, true, true));
    expect(combinacionALaApi(c(true, false, true, true))).toEqual(api);
    expect(combinacionDeLaApi(null)).toBeNull();
    expect(combinacionDeLaApi(undefined)).toBeNull();
    expect(combinacionDeLaApi({ sound: true } as never)).toBeNull();
    expect(combinacionDeLaApi({ sound: 'sí', vibration: true, voice: false, repeat: false } as never)).toBeNull();
  });

  it('la guardada en el teléfono se lee con la misma tolerancia', () => {
    expect(combinacionGuardada(c(false, true))).toEqual(c(false, true));
    expect(combinacionGuardada({ sonido: true })).toBeNull();
    expect(combinacionGuardada('x')).toBeNull();
    expect(combinacionGuardada(undefined)).toBeNull();
  });

  it('iguales, y un código corto y estable para la firma', () => {
    expect(mismaCombinacion(c(true, true), c(true, true))).toBe(true);
    expect(mismaCombinacion(c(true, true), c(true, true, false, true))).toBe(false);
    expect(codigoDeLaCombinacion(c(true, false, true, true))).toBe('1011');
  });

  it('las reglas del servidor: sonido o vibración, y la voz necesita sonido', () => {
    expect(reglaIncumplida(c(false, false))).toBe('sinSonidoNiVibracion');
    expect(reglaIncumplida(c(false, true, true))).toBe('vozSinSonido');
    // Con las dos, manda la que bloquea el guardado: la de sonido y vibración.
    expect(reglaIncumplida(c(false, false, true))).toBe('sinSonidoNiVibracion');
    expect(reglaIncumplida(c(true, false, true))).toBeNull();
    expect(reglaIncumplida(c(true, true))).toBeNull();
  });
});

describe('el canal de cada combinación (tabla de la spec)', () => {
  it('sonido sí, vibración sí, voz no: el canal de siempre, el del tono de Yo → Alarmas', () => {
    const canal = canalDeLaCombinacion('habitos', 'sistema', c(true, true), PROPIO);
    expect(canal.id).toBe('recordatorios-habitos');
    expect(canal.id).toBe(canalDeAlarma('habitos', 'sistema').id);
    expect(canal.vibra).toBe(true);
    expect(canalDeLaCombinacion('habitos', 'campana', c(true, true), PROPIO).id).toBe('recordatorios-habitos-campana');
  });

  it('sonido sí, vibración no: ese mismo canal con «-sinvib» y sin vibrar', () => {
    const canal = canalDeLaCombinacion('habitos', 'sistema', c(true, false), PROPIO);
    expect(canal).toMatchObject({ id: `recordatorios-habitos${SUFIJO_SIN_VIBRACION}`, vibra: false });
    // Conserva el sonido del canal de base.
    expect(canal.sonidoDelCanal).toBe(canalDeAlarma('habitos', 'sistema').sonidoDelCanal);
    expect(canalDeLaCombinacion('habitos', 'campana', c(true, false), PROPIO)).toMatchObject({
      id: 'recordatorios-habitos-campana-sinvib', vibra: false, sonidoDelCanal: 'campana_renaser.wav',
    });
  });

  it('sin sonido y con vibración: el canal «solo vibrar» que ya existía, que vibra', () => {
    const canal = canalDeLaCombinacion('habitos', 'campana', c(false, true), PROPIO);
    expect(canal).toMatchObject({ id: 'recordatorios-habitos-vibrar', sonidoDelCanal: null, sonidoDelAviso: false, vibra: true });
  });

  it('voz: el canal de voz del hábito del catálogo; un hábito propio, la frase general', () => {
    const catalogo = canalDeLaCombinacion('habitos', 'sistema', c(true, true, true), DEL_CATALOGO);
    expect(catalogo.id).toBe(canalDeAlarma('habitos', 'voz', DEL_CATALOGO).id);
    expect(catalogo.id).toBe('recordatorios-habitos-voz-despertar');
    expect(catalogo.vibra).toBe(true);
    const propio = canalDeLaCombinacion('habitos', 'sistema', c(true, true, true), PROPIO);
    expect(propio).toMatchObject({ id: 'recordatorios-habitos-voz', sonidoDelCanal: 'voz_habito.mp3' });
  });

  it('voz sin vibración: el canal de voz con «-sinvib», con el mismo archivo', () => {
    const canal = canalDeLaCombinacion('habitos', 'sistema', c(true, false, true), PROPIO);
    expect(canal).toMatchObject({ id: 'recordatorios-habitos-voz-sinvib', vibra: false, sonidoDelCanal: 'voz_habito.mp3' });
    const delCatalogo = canalDeLaCombinacion('habitos', 'sistema', c(true, false, true), DEL_CATALOGO);
    expect(delCatalogo.id).toBe(`${canalDeAlarma('habitos', 'voz', DEL_CATALOGO).id}-sinvib`);
  });

  it('la voz sin sonido no existe: se queda sin voz y solo vibra', () => {
    expect(canalDeLaCombinacion('habitos', 'sistema', c(false, true, true), DEL_CATALOGO).id).toBe('recordatorios-habitos-vibrar');
  });

  it('el tono de Yo → Alarmas manda cuando «Sonido» está encendido y «Voz» apagada', () => {
    expect(canalDeLaCombinacion('habitos', 'alertar-marimba', c(true, true), PROPIO).id).toBe('recordatorios-habitos-alertar-marimba');
    expect(canalDeLaCombinacion('habitos', 'relajar-lluvia', c(true, false), PROPIO).id).toBe('recordatorios-habitos-relajar-lluvia-sinvib');
  });

  it('si el tono de Yo ya es «Voz», las alarmas siguen diciendo el hábito aunque el servidor traiga voice=false', () => {
    const canal = canalDeLaCombinacion('habitos', 'voz', c(true, true), DEL_CATALOGO);
    expect(canal.id).toBe(canalDeAlarma('habitos', 'voz', DEL_CATALOGO).id);
    // Pero sin sonido en la combinación, no suena (la combinación manda sobre Yo).
    expect(canalDeLaCombinacion('habitos', 'voz', c(false, true), DEL_CATALOGO).id).toBe('recordatorios-habitos-vibrar');
  });

  it('si el tono de Yo es «Solo vibrar», solo vibra; salvo que el hábito pida voz', () => {
    expect(canalDeLaCombinacion('habitos', 'vibrar', c(true, true), PROPIO).id).toBe('recordatorios-habitos-vibrar');
    expect(canalDeLaCombinacion('habitos', 'vibrar', c(true, false), PROPIO).id).toBe('recordatorios-habitos-vibrar');
    expect(canalDeLaCombinacion('habitos', 'vibrar', c(true, true, true), PROPIO).id).toBe('recordatorios-habitos-voz');
  });

  it('una alarma nunca queda muda: sin sonido ni vibración (un dato roto), vibra', () => {
    expect(canalDeLaCombinacion('habitos', 'sistema', c(false, false), PROPIO)).toMatchObject({
      id: 'recordatorios-habitos-vibrar', vibra: true,
    });
    expect(combinacionEfectiva(c(false, false), 'sistema')).toEqual(c(false, true));
    expect(combinacionEfectiva(c(true, false), 'vibrar')).toEqual(c(false, true));
  });

  it('el canal «sin vibración» es idempotente y el de «con vibración» no cambia el id', () => {
    const base = canalDeAlarma('habitos', 'sistema');
    const sin = sinVibracion(base);
    expect(sinVibracion(sin)).toBe(sin);
    expect(conVibracion(base)).toMatchObject({ id: base.id, vibra: true });
    expect(conVibracion(conVibracion(base)).vibra).toBe(true);
  });
});

describe('los canales «-sinvib» y el rearmado (archivoDelCanal)', () => {
  it('el rearmado sabe qué archivo suena por cada canal «sin vibración», con el mismo archivo que el canal de base', () => {
    const bases = [
      canalDeAlarma('habitos', 'campana'),
      canalDeAlarma('habitos', 'voz'),
      canalDeAlarma('habitos', 'alertar-kalimba'),
      canalDeAlarma('eventos', 'relajar-cuenco'),
      canalDeAlarma('habitos', 'voz', DEL_CATALOGO),
    ];
    for (const base of bases) {
      expect(typeof base.sonidoDelCanal).toBe('string');
      expect(archivoDelCanal(`${base.id}${SUFIJO_SIN_VIBRACION}`)).toBe(base.sonidoDelCanal);
      expect(archivoDelCanal(base.id)).toBe(base.sonidoDelCanal);
    }
  });

  it('los canales sin archivo propio no inventan uno', () => {
    expect(archivoDelCanal('recordatorios-habitos-sinvib')).toBeNull();
    expect(archivoDelCanal('recordatorios-habitos-vibrar')).toBeNull();
    expect(archivoDelCanal('otra-cosa-sinvib')).toBeNull();
  });
});

describe('«cómo suena» en la semana (los días del servidor)', () => {
  const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const semana = (cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] =>
    NOMBRES.map((weekday, i) => ({
      weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [10],
      customTime: false, customReminder: false, customAlarm: false, alarm: { sound: true, vibration: true, voice: false, repeat: false },
      ...cambios[i + 1],
    }));
  const SABADO_SOLO_VIBRA = { 6: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: false } } };

  it('un día con «cómo suena» propio lo lleva; los demás siguen a la general (la combinación resuelta no cuenta como propia)', () => {
    const dias = diasPropiosDe(semana(SABADO_SOLO_VIBRA))!;
    expect(dias.find(d => d.iso === 6)?.alarma).toEqual(c(false, true));
    // Los demás traen `alarm` resuelta pero `customAlarm: false`: no son propios.
    expect(dias.filter(d => d.iso !== 6).every(d => d.alarma === undefined)).toBe(true);
  });

  it('sin `customAlarm` el backend no informa «cómo suena»: nada propio', () => {
    const sin = semana().map(({ alarm: _a, customAlarm: _c, ...resto }) => resto);
    expect(diasPropiosDe(sin)!.every(d => d.alarma === undefined)).toBe(true);
    // Un `alarm` que no se entiende se descarta sin tumbar nada.
    const roto = semana({ 6: { customAlarm: true, alarm: { sound: 1 } as never } });
    expect(diasPropiosDe(roto)!.find(d => d.iso === 6)?.alarma).toBeUndefined();
  });

  it('un día con «cómo suena» propio pasa al esquema por día, como un día con hora o aviso propios (misma regla que el servidor)', () => {
    expect(usaEsquemaPorDia(diasPropiosDe(semana()))).toBe(false);
    expect(usaEsquemaPorDia(diasPropiosDe(semana(SABADO_SOLO_VIBRA)))).toBe(true);
    // Cada una de las cuatro razones del servidor, por separado: hora, aviso, día apagado y «cómo suena».
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { customTime: true } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [0] } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { active: false } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { customAlarm: true } })))).toBe(true);
    // Un día que dice `customAlarm: false` con su combinación resuelta no es una fila del servidor.
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { customAlarm: false, alarm: { sound: false, vibration: true, voice: false, repeat: true } } })))).toBe(false);
  });

  it('`customAlarm: true` con la combinación ilegible sigue siendo por día (el servidor tiene la fila y su push lleva la etiqueta del día)', () => {
    const dias = diasPropiosDe(semana({ 6: { customAlarm: true, alarm: null } }))!;
    expect(dias.find(d => d.iso === 6)).toMatchObject({ alarmaPropiaSinDato: true });
    expect(usaEsquemaPorDia(dias)).toBe(true);
    // Suena con la general: no se inventa una combinación.
    const plan = planDeAlarmas({ habitoId: 'h', horaGeneral: '07:00', avisosGenerales: [10], dias, alarmaGeneral: c(true, false) });
    if (plan.esquema !== 'porDia') throw new Error('debía ser por día');
    expect(plan.pedidos.find(p => p.diaIso === 6)?.alarma).toEqual(c(true, false));
  });

  it('cada alarma del plan lleva la combinación de SU día; los otros días, la general', () => {
    const dias = diasPropiosDe(semana(SABADO_SOLO_VIBRA));
    const plan = planDeAlarmas({
      habitoId: 'h', horaGeneral: '07:00', avisosGenerales: [10], dias, alarmaGeneral: c(true, false, false, true),
    });
    if (plan.esquema !== 'porDia') throw new Error('debía ser por día');
    expect(plan.pedidos).toHaveLength(7);
    expect(plan.pedidos.find(p => p.diaIso === 6)?.alarma).toEqual(c(false, true));
    expect(plan.pedidos.filter(p => p.diaIso !== 6).every(p => mismaCombinacion(p.alarma, c(true, false, false, true)))).toBe(true);
  });

  it('el esquema diario no cambia cuando ningún día es distinto, aunque la general sea propia', () => {
    const plan = planDeAlarmas({
      habitoId: 'h', horaGeneral: '07:00', avisosGenerales: [10], dias: diasPropiosDe(semana()), alarmaGeneral: c(false, true),
    });
    expect(plan).toEqual({ esquema: 'diario' });
  });

  it('la firma del plan cambia con «cómo suena», pero no para lo de siempre (un plan anterior no se rehace sin motivo)', () => {
    const con = (alarmaGeneral: CombinacionDeAlarma | null) => planDeAlarmas({
      habitoId: 'h', horaGeneral: '07:00', avisosGenerales: [10],
      dias: diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } })), alarmaGeneral,
    });
    const deSiempre = firmaDelPlan(con(null));
    expect(deSiempre).not.toContain('~');
    expect(firmaDelPlan(con(c(true, true)))).toBe(deSiempre);
    expect(firmaDelPlan(con(c(true, false)))).not.toBe(deSiempre);
    expect(firmaDelPlan(con(c(true, false)))).toContain('~1000');
  });
});
