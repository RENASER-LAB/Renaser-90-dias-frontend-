/**
 * El CALENDARIO de Training por hora (spec 014), con fechas fijas: lo que pasa en los bordes de la semana (domingo,
 * lunes, medianoche), cuando el Día 1 cae a mitad de semana, cuando el reloj del teléfono y el del servidor no dicen
 * lo mismo, con hábitos de días propios, con una pausa «solo hoy», con dos ítems a la misma hora y pasado el día 90.
 *
 * Solo lógica pura (sin React ni red). Las partes con hooks y con la pantalla montada están en
 * `hooks/__tests__/calendarioDeTraining.test.ts` y `components/__tests__/calendarioDeTraining.test.ts`.
 *
 * El calendario de 2026 que se usa (el jest del proyecto corre en `America/Lima`, UTC−5, sin horario de verano):
 *   jue 29/10 · vie 30 · sáb 31 · dom 1/11 · lun 2/11 · mar 3 · mié 4 …
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import type { Ocurrencia } from '../../../eventos/types/eventos.types';
import type { PreferenciaHabitoApi } from '../../../habits/types/habits.types';
import {
  contarElDia,
  armarListaDelDia,
  minutosDeAhora,
  minutosDeLaHora,
  textoDelResumenDeHoy,
  type ItemBase,
} from '../listaDelDia';
import {
  itemsDeHoy,
  itemsDeUnDiaCerrado,
  itemsPlanificados,
  puntosDeHoy,
  type ContextoPlanificado,
  type ItemDelDia,
} from '../itemsDelDia';
import { lineaDelPrograma } from '../lineaDelPrograma';
import {
  fechaDelDiaUno,
  indiceIsoDeLaFecha,
  lunesDe,
  relacionConHoy,
  semanaDe,
  sePuedeLeerElDia,
  tituloDelDia,
} from '../semanaDeTraining';
import { vistaDeOtroDia } from '../vistaDeOtroDia';

/** Lo que dibuja la pastilla de cada día: «Lunes 26», …, para comparar de un vistazo. */
const rotulos = (hoyIso: string) => semanaDe(hoyIso).map(d => `${d.nombre} ${d.numero}`);
const relaciones = (hoyIso: string) => semanaDe(hoyIso).map(d => d.relacion);
const fechas = (hoyIso: string) => semanaDe(hoyIso).map(d => d.iso);

/** Un texto «visible»: sin `NaN`, `undefined`, `null` ni `[object Object]`. */
const esTextoLimpio = (texto: unknown) => typeof texto === 'string' && texto.length > 0 && !/NaN|undefined|null|\[object/.test(texto);

const habito = (id: string, extra: Partial<HabitItem> = {}): HabitItem => ({
  id,
  habitoId: `h-${id}`,
  dimension: 'CUERPO',
  title: `Hábito ${id}`,
  time: '',
  tag: 'Innegociable',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  estado: 'PENDIENTE',
  ...extra,
});

const TODOS = { LUN: true, MAR: true, 'MIÉ': true, JUE: true, VIE: true, 'SÁB': true, DOM: true };

const ctx = (hoyIso: string) => ({ hoyIso, zona: 'America/Lima', titulos: {} as Record<string, string> });
const claves = (items: ItemBase[]) => items.map(x => x.clave);
const m = (hora: string) => minutosDeLaHora(hora) as number;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/* ---------------------------------------------------------------------------------------------------------------
 * 1 · DOMINGO
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 1 · DOMINGO (hoyIso = dom 1/11)', () => {
  const hoy = '2026-11-01';

  it('DOMINGO: la fila muestra lunes 26 a domingo 1 de ESA semana, no la siguiente (lunes 2 a domingo 8)', () => {
    expect(fechas(hoy)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
    expect(rotulos(hoy)).toEqual(['Lunes 26', 'Martes 27', 'Miércoles 28', 'Jueves 29', 'Viernes 30', 'Sábado 31', 'Domingo 1']);
    expect(fechas(hoy)).not.toContain('2026-11-02');
    expect(semanaDe(hoy).map(d => d.letra).join('')).toBe('LMMJVSD');
  });

  it('DOMINGO: el domingo es el día de hoy (el que se elige por defecto) y es el último de la fila', () => {
    const semana = semanaDe(hoy);
    expect(semana.filter(d => d.relacion === 'hoy').map(d => d.iso)).toEqual([hoy]);
    expect(semana[6].iso).toBe(hoy);
    expect(tituloDelDia(hoy)).toBe('Domingo 1');
    expect(indiceIsoDeLaFecha(hoy)).toBe(6);
    expect(lunesDe(hoy)).toBe('2026-10-26');
  });

  it('DOMINGO: lunes a sábado son días anteriores (pasado) y NO hay días que vienen', () => {
    expect(relaciones(hoy)).toEqual(['pasado', 'pasado', 'pasado', 'pasado', 'pasado', 'pasado', 'hoy']);
    expect(semanaDe(hoy).some(d => d.relacion === 'futuro')).toBe(false);
  });

  it('DOMINGO: lunes a sábado se pueden leer del servidor (≥ Día 1 y < hoy); el domingo y la otra semana, no', () => {
    // Día 20 hoy: el Día 1 fue hace casi tres semanas.
    for (const dia of fechas(hoy).slice(0, 6)) expect(sePuedeLeerElDia(dia, hoy, 20)).toBe(true);
    expect(sePuedeLeerElDia(hoy, hoy, 20)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-25', hoy, 20)).toBe(false); // el domingo de la semana anterior
    expect(sePuedeLeerElDia('2026-11-02', hoy, 20)).toBe(false); // el lunes que viene
  });

  it('DOMINGO: a las 23:59 de Lima sigue siendo domingo y de la misma semana (no salta como la fila de Planificar)', () => {
    jest.setSystemTime(new Date('2026-11-02T04:59:00Z')); // dom 1/11, 23:59 en Lima
    expect(minutosDeAhora(Date.now())).toBe(23 * 60 + 59);
    expect(fechas(hoy)[0]).toBe('2026-10-26');
    expect(relacionConHoy('2026-11-02', hoy)).toBe('futuro');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 2 · LUNES
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 2 · LUNES (hoyIso = lun 2/11)', () => {
  const hoy = '2026-11-02';

  it('LUNES: la semana nueva va de lunes 2 a domingo 8; hoy es el lunes y el resto viene', () => {
    expect(rotulos(hoy)).toEqual(['Lunes 2', 'Martes 3', 'Miércoles 4', 'Jueves 5', 'Viernes 6', 'Sábado 7', 'Domingo 8']);
    expect(relaciones(hoy)).toEqual(['hoy', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro']);
    expect(lunesDe(hoy)).toBe(hoy);
    expect(semanaDe(hoy)[0].numero).toBe('2'); // sin cero a la izquierda
  });

  it('LUNES: ningún día se puede leer del servidor (no hay días cerrados de la semana), con cualquier día de programa', () => {
    for (const diaPrograma of [1, 2, 7, 40, 90, 200, null, 0]) {
      for (const dia of fechas(hoy)) expect(sePuedeLeerElDia(dia, hoy, diaPrograma)).toBe(false);
      // Ni siquiera los días de la semana que acaba de cerrar: el servidor solo entrega la semana en curso.
      for (const dia of fechas('2026-11-01')) expect(sePuedeLeerElDia(dia, hoy, diaPrograma)).toBe(false);
    }
  });

  it('LUNES: martes a domingo muestran lo PLANIFICADO (hábito de todos los días, con su hora general)', () => {
    const base: Omit<ContextoPlanificado, 'fechaIso'> = {
      ...ctx(hoy),
      inventario: [habito('a', { time: '06:00', diasCatalogo: TODOS })],
      preferencias: new Map(),
      acciones: [],
      ocurrencias: [],
    };
    for (const dia of semanaDe(hoy).slice(1)) {
      const items = itemsPlanificados({ ...base, fechaIso: dia.iso });
      expect(items.map(x => [x.titulo, x.hora, x.hecho])).toEqual([['Hábito a', '06:00', false]]);
    }
  });

  it('LUNES: el lunes ya no es «ayer»: el domingo 1 queda fuera de esta semana y no es de ningún día elegible', () => {
    expect(fechas(hoy)).not.toContain('2026-11-01');
    expect(relacionConHoy('2026-11-01', hoy)).toBe('pasado');
    expect(sePuedeLeerElDia('2026-11-01', hoy, 40)).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 3 (parte pura) · el cruce de medianoche domingo 23:59 → lunes 00:00
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 3 (parte pura) · cruce de medianoche domingo → lunes', () => {
  it('MEDIANOCHE: con hoyIso = domingo la semana es la vieja; con hoyIso = lunes, la nueva; sin pasos intermedios', () => {
    const antes = semanaDe('2026-11-01');
    const despues = semanaDe('2026-11-02');
    expect(antes[0].iso).toBe('2026-10-26');
    expect(despues[0].iso).toBe('2026-11-02');
    // El domingo, que era «hoy», deja de estar en la fila: el día elegido tiene que volver a hoy (lo hace la pantalla).
    expect(despues.map(d => d.iso)).not.toContain('2026-11-01');
    expect(despues.find(d => d.relacion === 'hoy')?.iso).toBe('2026-11-02');
  });

  it('MEDIANOCHE: el instante 00:00 de Lima es 0 minutos y las 23:59 son 1439 (el reloj de «ahora» da la vuelta)', () => {
    jest.setSystemTime(new Date('2026-11-02T04:59:59Z'));
    expect(minutosDeAhora(Date.now())).toBe(1439);
    jest.setSystemTime(new Date('2026-11-02T05:00:00Z'));
    expect(minutosDeAhora(Date.now())).toBe(0);
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 4 · DÍA 1 A MITAD DE SEMANA
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 4 · el Día 1 cae a mitad de semana', () => {
  // Hoy es el viernes 30/10 y es el Día 3 → el Día 1 fue el miércoles 28/10. Lunes 26 y martes 27 son anteriores al Día 1.
  const hoy = '2026-10-30';
  const diaPrograma = 3;

  it('PROGRAMA: el Día 1 sale de hoy y del día del programa (miércoles 28)', () => {
    expect(fechaDelDiaUno(hoy, diaPrograma)).toBe('2026-10-28');
    expect(fechaDelDiaUno(hoy, 1)).toBe(hoy);
  });

  it('PROGRAMA: lunes y martes (antes del Día 1) no se piden al servidor; miércoles (Día 1) y jueves sí', () => {
    expect(sePuedeLeerElDia('2026-10-26', hoy, diaPrograma)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-27', hoy, diaPrograma)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-28', hoy, diaPrograma)).toBe(true);
    expect(sePuedeLeerElDia('2026-10-29', hoy, diaPrograma)).toBe(true);
    expect(sePuedeLeerElDia(hoy, hoy, diaPrograma)).toBe(false);
  });

  it('PROGRAMA: el día anterior al Día 1 dice «Tu programa empezó después de este día.» y no trae lista ni se planifica', () => {
    const itemsPlanificadosSiSeLlama = jest.fn(() => [] as ItemDelDia[]);
    const itemsLeidosSiSeLlama = jest.fn(() => [] as ItemDelDia[]);
    for (const iso of ['2026-10-26', '2026-10-27']) {
      const diaUno = fechaDelDiaUno(hoy, diaPrograma);
      const vista = vistaDeOtroDia({
        relacion: 'pasado',
        leible: sePuedeLeerElDia(iso, hoy, diaPrograma),
        // La misma cuenta que hace `TrainingPorHora`.
        previoAlPrograma: diaUno != null && iso < diaUno,
        lectura: undefined,
        itemsLeidos: itemsLeidosSiSeLlama,
        itemsPlanificados: itemsPlanificadosSiSeLlama,
      });
      expect(vista.resumen).toBe('Tu programa empezó después de este día.');
      expect(vista.estado).toBe('listo');
      expect(vista.items).toEqual([]);
      expect(vista.conLectura).toBe(false);
      expect(vista.puedeReintentar).toBe(false);
    }
    expect(itemsPlanificadosSiSeLlama).not.toHaveBeenCalled();
    expect(itemsLeidosSiSeLlama).not.toHaveBeenCalled();
  });

  it('PROGRAMA: el propio Día 1 (miércoles) sí se lee: cargando mientras llega, no el texto de «empezó después»', () => {
    const diaUno = fechaDelDiaUno(hoy, diaPrograma);
    const vista = vistaDeOtroDia({
      relacion: 'pasado',
      leible: sePuedeLeerElDia('2026-10-28', hoy, diaPrograma),
      previoAlPrograma: diaUno != null && '2026-10-28' < diaUno,
      lectura: undefined,
      itemsLeidos: () => [],
      itemsPlanificados: () => [],
    });
    expect(vista.estado).toBe('cargando');
    expect(vista.resumen).not.toBe('Tu programa empezó después de este día.');
  });

  it('PROGRAMA: por qué hay que releer el día del programa a medianoche: con el Día N de AYER y el hoy de HOY, el Día 1 se corre un día', () => {
    // El Día 1 real fue el miércoles 28/10: el viernes 30 es el Día 3 y el sábado 31 el Día 4.
    expect(fechaDelDiaUno('2026-10-30', 3)).toBe('2026-10-28');
    expect(fechaDelDiaUno('2026-10-31', 4)).toBe('2026-10-28');
    // Con la app abierta al pasar la medianoche, si `diaPrograma` sigue en 3 (no se releyó `/home`), el Día 1 sale jueves 29
    // y el miércoles 28 —el propio Día 1— queda «antes del programa» y sin pedirse. Lo vigila `screens/__tests__/trainingMedianoche.test.ts`.
    expect(fechaDelDiaUno('2026-10-31', 3)).toBe('2026-10-29');
    expect(sePuedeLeerElDia('2026-10-28', '2026-10-31', 3)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-28', '2026-10-31', 4)).toBe(true);
  });

  it('PROGRAMA: el Día 1 es hoy mismo (diaPrograma 1): toda la semana anterior es «antes del programa»', () => {
    const diaUno = fechaDelDiaUno(hoy, 1) as string;
    for (const iso of ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']) {
      expect(sePuedeLeerElDia(iso, hoy, 1)).toBe(false);
      expect(iso < diaUno).toBe(true);
    }
  });

  it('PROGRAMA: «Tu programa empezó después de este día.» existe en el código (utils/vistaDeOtroDia), no solo en esta prueba', () => {
    const vista = vistaDeOtroDia({
      relacion: 'pasado', leible: false, previoAlPrograma: true, lectura: undefined, itemsLeidos: () => [], itemsPlanificados: () => [],
    });
    expect(vista.resumen).toBe('Tu programa empezó después de este día.');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 5 · RELOJ DEL TELÉFONO DISTINTO AL DEL SERVIDOR
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 5 · el reloj del teléfono no manda: la semana y «hoy» salen de hoyIso', () => {
  const hoyDelServidor = '2026-11-02'; // lunes

  it('RELOJ: con el teléfono en domingo 22:30 (otra fecha que el servidor), la semana es la del lunes 2', () => {
    const base = semanaDe(hoyDelServidor);
    jest.setSystemTime(new Date('2026-11-02T03:30:00Z')); // dom 1/11, 22:30 en Lima
    expect(new Date(Date.now()).getDate()).toBe(1);
    expect(semanaDe(hoyDelServidor)).toEqual(base);
    expect(semanaDe(hoyDelServidor).find(d => d.relacion === 'hoy')?.iso).toBe('2026-11-02');
  });

  it('RELOJ: con el teléfono una semana adelantada o atrasada, o a la madrugada UTC, el resultado es el mismo', () => {
    const base = semanaDe(hoyDelServidor);
    const baseLeer = fechas(hoyDelServidor).map(d => sePuedeLeerElDia(d, hoyDelServidor, 40));
    for (const relojDelTelefono of [
      '2026-10-20T15:00:00Z', // una semana antes
      '2026-11-10T15:00:00Z', // una semana después
      '2026-11-02T04:59:59Z', // domingo 23:59:59 en Lima
      '2026-11-02T05:00:00Z', // lunes 00:00:00 en Lima
      '2026-11-02T23:59:59Z', // lunes 18:59 en Lima, ya martes en UTC
      '2027-01-01T00:00:00Z', // otro año
    ]) {
      jest.setSystemTime(new Date(relojDelTelefono));
      expect(semanaDe(hoyDelServidor)).toEqual(base);
      expect(fechas(hoyDelServidor).map(d => sePuedeLeerElDia(d, hoyDelServidor, 40))).toEqual(baseLeer);
      expect(fechaDelDiaUno(hoyDelServidor, 40)).toBe('2026-09-24');
      expect(relacionConHoy('2026-11-02', hoyDelServidor)).toBe('hoy');
    }
  });

  it('RELOJ: el día de hoy de los ítems también sale de hoyIso: un evento de «ayer del servidor» no entra aunque sea «hoy» del teléfono', () => {
    jest.setSystemTime(new Date('2026-11-02T03:30:00Z')); // el teléfono (Lima) todavía está en domingo 1/11
    // Un evento el lunes 2/11 a las 10:00 de Lima. Para el servidor es hoy; para el reloj del teléfono, mañana.
    const evento = {
      evento: { id: 'e', titulo: 'Clase', duracionMinutos: 60, tipoUbicacion: 'ZOOM', valorUbicacion: 'https://zoom.us/j/1' },
      inicioOcurrencia: '2026-11-02T15:00:00Z',
      iniciaEn: '2026-11-02T15:00:00Z',
      duracionMinutos: 60,
      titulo: 'Clase',
      asistencia: null,
    } as unknown as Ocurrencia;
    expect(itemsDeHoy([], [evento], ctx(hoyDelServidor)).map(x => [x.titulo, x.hora])).toEqual([['Clase', '10:00']]);
    expect(itemsDeHoy([], [evento], ctx('2026-11-01'))).toEqual([]);
  });

  it('RELOJ (documentado): los minutos de «ahora» para «Te toca ahora» SÍ salen del reloj del TELÉFONO, no del servidor', () => {
    // El servidor dice que hoy es el lunes 2/11, pero el teléfono está en domingo a las 22:30.
    jest.setSystemTime(new Date('2026-11-02T03:30:00Z'));
    const ahora = minutosDeAhora(Date.now());
    expect(ahora).toBe(22 * 60 + 30);

    const items = itemsDeHoy([habito('noche', { time: '22:00' }), habito('manana', { time: '06:00' })], [], ctx(hoyDelServidor));
    const lista = armarListaDelDia(items, ahora);
    // Con 22:30 en el teléfono, el de las 06:00 ya «pasó» su hora y el de las 22:00 es el que toca: así funciona hoy.
    expect(claves(lista.atrasados)).toEqual(['manana']);
    expect(claves(lista.enCurso)).toEqual(['noche']);
    expect(lista.marcaDelPrimero).toBe('ahora');

    // Con el reloj en el lunes 06:00, en cambio, lo primero es el de las 06:00.
    jest.setSystemTime(new Date('2026-11-02T11:00:00Z'));
    const lunes = armarListaDelDia(items, minutosDeAhora(Date.now()));
    expect(claves(lunes.enCurso)).toEqual(['manana', 'noche']);
    expect(lunes.marcaDelPrimero).toBe('ahora');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 6 · HÁBITO CON DÍAS PROPIOS (spec 008)
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 6 · hábito con días propios (solo lunes, miércoles y viernes)', () => {
  const soloLMV = { LUN: true, MAR: false, 'MIÉ': true, JUE: false, VIE: true, 'SÁB': false, DOM: false };
  const pref = (habitId: string, weekdays: PreferenciaHabitoApi['weekdays']): PreferenciaHabitoApi => ({
    habitId,
    title: habitId,
    triggerTime: '06:00:00',
    limitTime: null,
    customized: true,
    pendingChange: null,
    weekdays,
  });
  // La semana de Training del jueves 29/10: lun 26, mar 27, mié 28, jue 29, vie 30, sáb 31, dom 1.
  const FECHAS = { LUN: '2026-10-26', MAR: '2026-10-27', MIE: '2026-10-28', JUE: '2026-10-29', VIE: '2026-10-30', SAB: '2026-10-31', DOM: '2026-11-01' };
  const gimnasio = habito('gym', { title: 'Gimnasio', time: '06:00', diasCatalogo: soloLMV });
  const preferencias = new Map([
    [
      'h-gym',
      pref('h-gym', [
        { weekday: 'MONDAY', triggerTime: '05:30:00' },
        { weekday: 'WEDNESDAY', triggerTime: '07:45:00' },
        { weekday: 'FRIDAY', triggerTime: '18:15:00' },
      ]),
    ],
  ]);
  const planificado = (fechaIso: string, inventario = [gimnasio], prefs = preferencias) =>
    itemsPlanificados({ ...ctx('2026-10-29'), fechaIso, inventario, preferencias: prefs, acciones: [], ocurrencias: [] });

  it('DÍAS PROPIOS: el día que no le toca (martes, jueves, sábado, domingo) no aparece', () => {
    for (const iso of [FECHAS.MAR, FECHAS.JUE, FECHAS.SAB, FECHAS.DOM]) expect(planificado(iso)).toEqual([]);
  });

  it('DÍAS PROPIOS: el día que viene lo muestra con la hora de ESE día (weekdays[i].triggerTime), no con la general', () => {
    expect(planificado(FECHAS.LUN).map(x => [x.titulo, x.hora])).toEqual([['Gimnasio', '05:30']]);
    expect(planificado(FECHAS.MIE).map(x => [x.titulo, x.hora])).toEqual([['Gimnasio', '07:45']]);
    expect(planificado(FECHAS.VIE).map(x => [x.titulo, x.hora])).toEqual([['Gimnasio', '18:15']]);
    for (const iso of [FECHAS.LUN, FECHAS.MIE, FECHAS.VIE]) expect(planificado(iso)[0].hora).not.toBe('06:00');
  });

  it('DÍAS PROPIOS: un día suyo sin hora propia (o con la hora en null) usa la general; sin ninguna, queda «sin hora»', () => {
    const sinHoraPropia = new Map([['h-gym', pref('h-gym', [{ weekday: 'WEDNESDAY' }, { weekday: 'FRIDAY', triggerTime: null }])]]);
    expect(planificado(FECHAS.MIE, [gimnasio], sinHoraPropia)[0].hora).toBe('06:00');
    expect(planificado(FECHAS.VIE, [gimnasio], sinHoraPropia)[0].hora).toBe('06:00');
    const sinNinguna = habito('gym', { title: 'Gimnasio', time: '', diasCatalogo: soloLMV });
    expect(planificado(FECHAS.MIE, [sinNinguna], sinHoraPropia)[0].hora).toBeNull();
    // Y una hora propia sin segundos se lee igual.
    const sinSegundos = new Map([['h-gym', pref('h-gym', [{ weekday: 'WEDNESDAY', triggerTime: '07:45' }])]]);
    expect(planificado(FECHAS.MIE, [gimnasio], sinSegundos)[0].hora).toBe('07:45');
  });

  it('DÍAS PROPIOS: un día que la persona apagó (weekdays[i].active === false) no aparece aunque el catálogo lo tenga', () => {
    const yoga = habito('yoga', { title: 'Yoga', time: '06:00', diasCatalogo: TODOS });
    const apagados = new Map([
      [
        'h-yoga',
        pref('h-yoga', [
          { weekday: 'TUESDAY', active: false },
          { weekday: 'THURSDAY', active: false },
          { weekday: 'WEDNESDAY', active: true, triggerTime: '09:00:00' },
        ]),
      ],
    ]);
    expect(planificado(FECHAS.MAR, [yoga], apagados)).toEqual([]);
    expect(planificado(FECHAS.JUE, [yoga], apagados)).toEqual([]);
    expect(planificado(FECHAS.MIE, [yoga], apagados).map(x => x.hora)).toEqual(['09:00']);
    expect(planificado(FECHAS.LUN, [yoga], apagados).map(x => x.hora)).toEqual(['06:00']); // sin nada propio: lo general
  });

  it('DÍAS PROPIOS: los días de la semana siguiente (lun 2/11 …) usan SU día de la semana, no el de la fecha de hoy', () => {
    // lun 2/11 es LUNES igual que lun 26/10: misma hora propia.
    expect(planificado('2026-11-02').map(x => x.hora)).toEqual(['05:30']);
    expect(planificado('2026-11-03')).toEqual([]); // martes
  });

  it('DÍAS PROPIOS: un hábito sin habitoId (una acción mal armada) no entra ni rompe', () => {
    expect(planificado(FECHAS.LUN, [habito('x', { habitoId: null, diasCatalogo: TODOS })])).toEqual([]);
  });

  it('DÍAS PROPIOS: las horas por día ordenan la lista del día que viene (la hora de ESE día, no la general)', () => {
    const tarde = habito('tarde', { title: 'Tarde', time: '05:00', diasCatalogo: TODOS }); // la general es la más temprana
    const prefs = new Map([['h-tarde', pref('h-tarde', [{ weekday: 'MONDAY', triggerTime: '20:00:00' }])]]);
    const items = planificado(FECHAS.LUN, [tarde, gimnasio], new Map([...preferencias, ...prefs]));
    const lista = armarListaDelDia(items, m('00:00'));
    expect(lista.enCurso.map(x => x.titulo)).toEqual(['Gimnasio', 'Tarde']);
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 7 · «PAUSAR SOLO HOY»
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 7 · «Pausar solo hoy»', () => {
  // jue 29/10 es JUE. La pausa de «solo hoy» deja el hábito apagado el jueves y encendido el resto.
  const pausadoElJueves = { ...TODOS, JUE: false };
  const hoy = '2026-10-29';
  const manana = '2026-10-30';

  it('PAUSA: el hábito pausado hoy sale marcado `pausado` y no aparece en NINGUNA sección de la lista de hoy', () => {
    const items = itemsDeHoy([habito('agua', { time: '07:00', diasCatalogo: pausadoElJueves }), habito('otro', { time: '08:00' })], [], ctx(hoy));
    expect(items.find(x => x.clave === 'agua')?.pausado).toBe(true);
    const lista = armarListaDelDia(items, m('06:00'));
    expect(claves(lista.enCurso)).toEqual(['otro']);
    expect(claves([...lista.sinHora, ...lista.atrasados, ...lista.cerrados, ...lista.hechos])).toEqual([]);
  });

  it('PAUSA: el hábito pausado hoy tampoco cuenta en el resumen («N de M») ni en los puntos', () => {
    const items = itemsDeHoy(
      [
        habito('agua', { time: '07:00', diasCatalogo: pausadoElJueves, pointsAtStake: 10 }),
        habito('otro', { time: '08:00', done: true, estado: 'COMPLETADO', puntosOtorgados: 6 }),
      ],
      [],
      ctx(hoy),
    );
    expect(contarElDia(items)).toEqual({ hechos: 1, total: 1 });
    expect(puntosDeHoy(items)).toBe(6);
    expect(textoDelResumenDeHoy(1, 1, 6)).toBe('1 de 1 hecho · 6 pts');
  });

  it('PAUSA: y no deja atrasado a otro por su hora (el pausado no cuenta como «el siguiente»)', () => {
    const items = itemsDeHoy([habito('a', { time: '05:30' }), habito('agua', { time: '06:00', diasCatalogo: pausadoElJueves })], [], ctx(hoy));
    const lista = armarListaDelDia(items, m('07:00'));
    expect(claves(lista.enCurso)).toEqual(['a']);
    expect(lista.atrasados).toEqual([]);
  });

  it('PAUSA: al día siguiente (otro hoyIso, sin pausa) el mismo hábito sí aparece', () => {
    const habits = [habito('agua', { time: '07:00', diasCatalogo: pausadoElJueves })];
    const hoyItems = itemsDeHoy(habits, [], ctx(hoy));
    expect(hoyItems[0].pausado).toBe(true);
    const mananaItems = itemsDeHoy(habits, [], ctx(manana)); // viernes: el catálogo sí lo tiene encendido
    expect(mananaItems[0].pausado).toBe(false);
    expect(claves(armarListaDelDia(mananaItems, m('06:00')).enCurso)).toEqual(['agua']);
  });

  it('PAUSA: el mismo día de la semana siguiente (jueves 5/11) también aparece: la pausa era solo de hoy', () => {
    // El servidor vuelve a mandar `diasCatalogo` sin la pausa cuando termina; con el mismo catálogo del jueves
    // encendido, el hábito aparece el jueves 5.
    const habits = [habito('agua', { time: '07:00', diasCatalogo: TODOS })];
    expect(itemsDeHoy(habits, [], ctx('2026-11-05'))[0].pausado).toBe(false);
  });

  it('PAUSA: lo ya cumplido antes de pausar sigue entre los hechos; y un hábito sin registro de hoy no entra', () => {
    const hecho = itemsDeHoy([habito('agua', { time: '07:00', diasCatalogo: pausadoElJueves, done: true, estado: 'COMPLETADO' })], [], ctx(hoy));
    expect(hecho[0].pausado).toBe(false);
    expect(claves(armarListaDelDia(hecho, m('09:00')).hechos)).toEqual(['agua']);
    expect(itemsDeHoy([habito('agua', { tieneTrackHoy: false })], [], ctx(hoy))).toEqual([]);
  });

  it('PAUSA: una acción (VIDA Y NEGOCIO) no se pausa por días del catálogo', () => {
    const [accion] = itemsDeHoy([habito('r', { dimension: 'VIDA Y NEGOCIO', habitoId: null, diasCatalogo: pausadoElJueves })], [], ctx(hoy));
    expect(accion.pausado).toBe(false);
  });

  it('PAUSA: en un día que viene, el hábito pausado ese día no aparece planificado (y el siguiente sí)', () => {
    // Pausa «hasta el viernes»: jueves y viernes apagados.
    const pausaHastaElViernes = habito('agua', { time: '07:00', diasCatalogo: { ...TODOS, JUE: false, VIE: false } });
    const plan = (fechaIso: string) =>
      itemsPlanificados({ ...ctx(hoy), fechaIso, inventario: [pausaHastaElViernes], preferencias: new Map(), acciones: [], ocurrencias: [] });
    expect(plan('2026-10-30')).toEqual([]); // viernes
    expect(plan('2026-10-31').map(x => x.titulo)).toEqual(['Hábito agua']); // sábado
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 8 · DOS ÍTEMS A LA MISMA HORA, Y UNO A LAS 23:30
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 8 · empates de hora y el final del día', () => {
  const h = (clave: string, hora: string | null, extra: Partial<ItemBase> = {}): ItemBase => ({ clave, tipo: 'habito', hora, hecho: false, ...extra });

  describe('dos ítems a la misma hora', () => {
    it('EMPATE: orden estable (el de llegada primero) y ninguno queda «atrasado» por el otro', () => {
      for (const ahora of ['06:30', '07:00', '07:01', '12:00', '23:59']) {
        const lista = armarListaDelDia([h('a', '07:00'), h('b', '07:00')], m(ahora));
        expect(claves(lista.enCurso)).toEqual(['a', 'b']);
        expect(lista.atrasados).toEqual([]);
      }
    });

    it('EMPATE: si llegan al revés se mantiene ese orden (no se ordena por clave)', () => {
      expect(claves(armarListaDelDia([h('b', '07:00'), h('a', '07:00')], m('07:00')).enCurso)).toEqual(['b', 'a']);
      expect(claves(armarListaDelDia([h('z', '07:00'), h('y', '07:00'), h('x', '07:00')], m('07:00')).enCurso)).toEqual(['z', 'y', 'x']);
    });

    it('EMPATE: la hora del «siguiente» es mayor ESTRICTA: con la hora igual no se atrasa; con una más tarde, sí', () => {
      const dos = [h('a', '07:00'), h('b', '07:00')];
      expect(armarListaDelDia(dos, m('07:00')).atrasados).toEqual([]);
      const tres = [...dos, h('c', '08:00')];
      // A las 07:59 el de las 08:00 todavía no llegó.
      expect(armarListaDelDia(tres, m('07:59')).atrasados).toEqual([]);
      // A las 08:00 llega: los DOS de las 07:00 se atrasan juntos, en su orden, y sube el de las 08:00.
      const alas8 = armarListaDelDia(tres, m('08:00'));
      expect(claves(alas8.atrasados)).toEqual(['a', 'b']);
      expect(claves(alas8.enCurso)).toEqual(['c']);
      expect(alas8.marcaDelPrimero).toBe('ahora');
    });

    it('EMPATE: marca del primero: «Te toca ahora» desde la hora común (ambos en curso), «Lo que sigue» antes', () => {
      const dos = [h('a', '07:00'), h('b', '07:00')];
      expect(armarListaDelDia(dos, m('06:59')).marcaDelPrimero).toBe('sigue');
      expect(armarListaDelDia(dos, m('07:00')).marcaDelPrimero).toBe('ahora');
    });

    it('EMPATE: un hecho a la misma hora no atrasa al pendiente (misma hora ≠ hora siguiente)', () => {
      const lista = armarListaDelDia([h('hecho', '07:00', { hecho: true }), h('pendiente', '07:00')], m('09:00'));
      expect(claves(lista.hechos)).toEqual(['hecho']);
      expect(claves(lista.enCurso)).toEqual(['pendiente']);
      expect(lista.atrasados).toEqual([]);
    });

    it('EMPATE: un hábito y un evento a la misma hora no se atrasan entre sí; la acción tampoco', () => {
      const evento: ItemBase = { clave: 'e', tipo: 'evento', hora: '07:00', hecho: false, duracionMin: 120 };
      const accion: ItemBase = { clave: 'r', tipo: 'accion', hora: '07:00', hecho: false };
      const lista = armarListaDelDia([h('a', '07:00'), evento, accion], m('08:00'));
      expect(claves(lista.enCurso)).toEqual(['a', 'e', 'r']);
      expect(lista.atrasados).toEqual([]);
    });

    it('EMPATE: un empate en el pasado y otro más tarde: los dos del empate temprano se atrasan; los del tardío no', () => {
      const lista = armarListaDelDia([h('a', '06:00'), h('b', '06:00'), h('c', '09:00'), h('d', '09:00')], m('09:00'));
      expect(claves(lista.atrasados)).toEqual(['a', 'b']);
      expect(claves(lista.enCurso)).toEqual(['c', 'd']);
    });
  });

  describe('un ítem a las 23:30', () => {
    it('23:30: solo, con «ahora» = 23:45 y 23:59 no se atrasa (no hay siguiente) y el primero dice «Te toca ahora»', () => {
      for (const ahora of ['23:29', '23:30', '23:45', '23:59']) {
        const lista = armarListaDelDia([h('noche', '23:30')], m(ahora));
        expect(claves(lista.enCurso)).toEqual(['noche']);
        expect(lista.atrasados).toEqual([]);
        expect(lista.marcaDelPrimero).toBe(ahora === '23:29' ? 'sigue' : 'ahora');
      }
    });

    it('23:30: con otro a las 23:45, el de las 23:30 se atrasa recién a las 23:45; a las 23:59 también', () => {
      const dos = [h('a', '23:30'), h('b', '23:45')];
      expect(armarListaDelDia(dos, m('23:44')).atrasados).toEqual([]);
      const a2345 = armarListaDelDia(dos, m('23:45'));
      expect(claves(a2345.atrasados)).toEqual(['a']);
      expect(claves(a2345.enCurso)).toEqual(['b']);
      const a2359 = armarListaDelDia(dos, m('23:59'));
      expect(claves(a2359.atrasados)).toEqual(['a']);
      expect(claves(a2359.enCurso)).toEqual(['b']);
    });

    it('23:30: al pasar la medianoche («ahora» = 00:00 del día nuevo) la lista del día NUEVO no hereda atrasos del anterior', () => {
      // El día nuevo trae su propia lista: lo del 23:30 y 23:45 de HOY es del día que empieza, y a las 00:00 aún no llegó.
      const delDiaNuevo = [h('a', '23:30'), h('b', '23:45'), h('c', '06:00')];
      const lista = armarListaDelDia(delDiaNuevo, m('00:00'));
      expect(lista.atrasados).toEqual([]);
      expect(claves(lista.enCurso)).toEqual(['c', 'a', 'b']);
      expect(lista.marcaDelPrimero).toBe('sigue');
    });

    it('23:30: con el reloj real dando la vuelta (23:59:59 → 00:00:00) los minutos pasan de 1439 a 0 y la lista se recalcula bien', () => {
      const items = [h('a', '23:30'), h('b', '23:45')];
      jest.setSystemTime(new Date('2026-11-02T04:59:59Z')); // 23:59:59 en Lima
      const antes = armarListaDelDia(items, minutosDeAhora(Date.now()));
      expect(claves(antes.atrasados)).toEqual(['a']);
      jest.setSystemTime(new Date('2026-11-02T05:00:00Z')); // 00:00:00 del día siguiente
      const despues = armarListaDelDia(items, minutosDeAhora(Date.now()));
      expect(despues.atrasados).toEqual([]);
      expect(claves(despues.enCurso)).toEqual(['a', 'b']);
    });

    it('23:30: un evento de 23:30 a 00:30 sigue «en curso» hasta el final del día (nunca «terminado» a las 23:59)', () => {
      const evento: ItemBase = { clave: 'e', tipo: 'evento', hora: '23:30', hecho: false, duracionMin: 60 };
      expect(claves(armarListaDelDia([evento], m('23:59')).enCurso)).toEqual(['e']);
      // Y uno de 30 min que termina justo a medianoche tampoco se da por terminado a las 23:59.
      expect(claves(armarListaDelDia([{ ...evento, duracionMin: 30 }], m('23:59')).enCurso)).toEqual(['e']);
    });

    it('23:30: un ítem a las 00:00 (medianoche) es válido: el primero, «Te toca ahora» desde el minuto 0', () => {
      const lista = armarListaDelDia([h('medianoche', '00:00'), h('b', '06:00')], 0);
      expect(claves(lista.enCurso)).toEqual(['medianoche', 'b']);
      expect(lista.marcaDelPrimero).toBe('ahora');
      expect(minutosDeLaHora('00:00')).toBe(0);
      expect(minutosDeLaHora('23:59')).toBe(1439);
      expect(minutosDeLaHora('24:00')).toBeNull();
    });
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 9 · DESPUÉS DEL DÍA 90 (GRADUADO) Y DATOS QUE FALTAN
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 9 · pasado el día 90 (graduado), sin día del programa, sin fase', () => {
  const hoy = '2026-10-29';

  it('GRADUADO: ninguna función de fechas lanza ni da NaN/undefined con diaPrograma > 90, null, 0, NaN o Infinity', () => {
    for (const diaPrograma of [91, 120, 365, 5000, 90, null, undefined, 0, -3, NaN, Infinity, -Infinity]) {
      const semana = semanaDe(hoy);
      expect(semana).toHaveLength(7);
      for (const d of semana) {
        expect(esTextoLimpio(d.iso) && esTextoLimpio(d.letra) && esTextoLimpio(d.numero) && esTextoLimpio(d.nombre)).toBe(true);
        expect(typeof sePuedeLeerElDia(d.iso, hoy, diaPrograma)).toBe('boolean');
      }
      const diaUno = fechaDelDiaUno(hoy, diaPrograma);
      expect(diaUno === null || /^\d{4}-\d{2}-\d{2}$/.test(diaUno)).toBe(true);
      const linea = lineaDelPrograma(null, diaPrograma);
      expect(linea === null || esTextoLimpio(linea)).toBe(true);
      expect(() => lineaDelPrograma('FASE_QUE_NO_EXISTE', diaPrograma)).not.toThrow();
    }
  });

  it('GRADUADO: sin Día 1 conocido (null, 0, no finito) no se pide ningún día; con un día de programa > 90 la semana entera es leíble', () => {
    for (const diaPrograma of [null, undefined, 0, NaN, Infinity]) {
      expect(fechaDelDiaUno(hoy, diaPrograma)).toBeNull();
      for (const d of semanaDe(hoy)) expect(sePuedeLeerElDia(d.iso, hoy, diaPrograma)).toBe(false);
    }
    // Pasado el día 90 el Día 1 queda lejos: los días anteriores de ESTA semana son leíbles.
    expect(fechaDelDiaUno(hoy, 120)).toBe('2026-07-02');
    expect(['2026-10-26', '2026-10-27', '2026-10-28'].map(d => sePuedeLeerElDia(d, hoy, 120))).toEqual([true, true, true]);
  });

  it('GRADUADO: la línea del programa se dibuja o no, pero nunca con NaN/undefined/null', () => {
    expect(lineaDelPrograma(null, null)).toBeNull();
    expect(lineaDelPrograma(null, 0)).toBeNull();
    expect(lineaDelPrograma(null, NaN)).toBeNull();
    expect(lineaDelPrograma(undefined, 90)).toBe('Día 90 de 90');
    for (const dia of [91, 150]) for (const fase of [null, undefined, '', 'GRADUADO', 'FASE_4_MAESTRIA']) {
      const linea = lineaDelPrograma(fase, dia);
      expect(esTextoLimpio(linea)).toBe(true);
    }
  });

  it('GRADUADO: itemsDeHoy / itemsPlanificados / itemsDeUnDiaCerrado con listas vacías y datos nulos no lanzan', () => {
    expect(itemsDeHoy([], [], ctx(hoy))).toEqual([]);
    expect(itemsPlanificados({ ...ctx(hoy), fechaIso: '2026-10-30', inventario: [], preferencias: new Map(), acciones: [], ocurrencias: [] })).toEqual([]);
    expect(itemsDeUnDiaCerrado([], [], { ...ctx(hoy), fechaIso: '2026-10-28' })).toEqual([]);
    // Un hábito con todo lo opcional en null/undefined.
    const flaco = {
      id: 'x', habitoId: 'h-x', dimension: 'CUERPO', title: 'Flaco', time: null, tag: 'Innegociable', streak: null, done: true, hasEvidence: false,
      tieneTrackHoy: true, estado: undefined, completadoEn: undefined, puntosOtorgados: undefined, pointsAtStake: undefined, respuestaTexto: undefined,
    } as unknown as HabitItem;
    const [item] = itemsDeHoy([flaco], [], ctx(hoy));
    expect(item.hora).toBeNull();
    expect(item.puntos).toBeNull();
    expect(item.cumplido).toEqual({ hora: null, puntos: null, escrito: null });
    expect(puntosDeHoy([item])).toBe(0);
    expect(Number.isNaN(puntosDeHoy([item]))).toBe(false);
  });

  it('GRADUADO: la lista del día y su resumen con nada, con horas rotas o todo sin hora, no dan NaN ni se caen', () => {
    expect(armarListaDelDia([], m('10:00'))).toEqual({ enCurso: [], primero: null, marcaDelPrimero: null, sinHora: [], atrasados: [], cerrados: [], hechos: [], cierre: null });
    const roto: ItemBase[] = ['', null, '25:61', 'abc', '7', '07:5', '99:99'].map((hora, i) => ({ clave: `k${i}`, tipo: 'habito', hora, hecho: false }));
    const lista = armarListaDelDia(roto, m('10:00'));
    expect(claves(lista.sinHora)).toEqual(roto.map(x => x.clave));
    expect(lista.marcaDelPrimero).toBeNull();
    expect(contarElDia([])).toEqual({ hechos: 0, total: 0 });
    expect(textoDelResumenDeHoy(0, 0, 0)).toBe('Hoy no tienes nada planificado.');
    expect(esTextoLimpio(textoDelResumenDeHoy(3, 3, 0))).toBe(true);
    expect(minutosDeAhora(NaN)).toBeNaN(); // documentado: `Date` inválido; el reloj del teléfono nunca da NaN
  });

  it('GRADUADO: la vista de otro día con todo nulo (sin lectura, sin Día 1) no se cae y siempre tiene un resumen limpio', () => {
    for (const relacion of ['pasado', 'futuro'] as const) {
      for (const lectura of [undefined, { estado: 'cargando' }, { estado: 'sin-datos' }, { estado: 'error' }, { estado: 'datos', tracks: [] }] as const) {
        for (const leible of [true, false]) {
          const v = vistaDeOtroDia({ relacion, leible, lectura: lectura as never, itemsLeidos: () => [], itemsPlanificados: () => [] });
          expect(esTextoLimpio(v.resumen)).toBe(true);
          expect(v.nota === null || esTextoLimpio(v.nota)).toBe(true);
          expect(Array.isArray(v.items)).toBe(true);
        }
      }
    }
  });

  it('GRADUADO: la semana de un hoyIso en el cambio de año o en 29 de febrero se arma completa y sin repetir días', () => {
    for (const hoyRaro of ['2026-12-31', '2027-01-01', '2028-02-29', '2028-03-01', '2026-11-01']) {
      const f = fechas(hoyRaro);
      expect(new Set(f).size).toBe(7);
      expect(f.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
      expect(indiceIsoDeLaFecha(f[0])).toBe(0);
      expect(indiceIsoDeLaFecha(f[6])).toBe(6);
      expect(semanaDe(hoyRaro).filter(d => d.relacion === 'hoy')).toHaveLength(1);
    }
    expect(rotulos('2027-01-01')).toEqual(['Lunes 28', 'Martes 29', 'Miércoles 30', 'Jueves 31', 'Viernes 1', 'Sábado 2', 'Domingo 3']);
  });
});
