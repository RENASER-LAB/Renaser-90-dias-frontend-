import { describe, expect, it } from '@jest/globals';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import type { Ocurrencia } from '../../../eventos/types/eventos.types';
import type { PreferenciaHabitoApi, TrackDelDiaApi } from '../../../habits/types/habits.types';
import {
  diaDelPlanDeLaFecha,
  itemsDeEventos,
  itemsDeHoy,
  itemsDeUnDiaCerrado,
  itemsPlanificados,
  puntosDeHoy,
} from '../itemsDelDia';
import { armarListaDelDia, minutosDeLaHora } from '../listaDelDia';

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

const evento = (id: string, iniciaEn: string, extra: Partial<Ocurrencia> = {}): Ocurrencia => ({
  evento: { id, titulo: `Evento ${id}`, duracionMinutos: 60, tipoUbicacion: 'ZOOM', valorUbicacion: 'https://zoom.us/j/1' } as Ocurrencia['evento'],
  inicioOcurrencia: iniciaEn,
  iniciaEn,
  duracionMinutos: 60,
  titulo: `Evento ${id}`,
  asistencia: null,
  ...extra,
});

const ctx = { hoyIso: '2026-10-29', zona: 'America/Lima', titulos: {} as Record<string, string> };

describe('itemsDeHoy', () => {
  it('solo entra lo que tiene registro de hoy; un hábito sin registro (pausado, no le toca) no está', () => {
    const items = itemsDeHoy([habito('a', { time: '06:00' }), habito('b', { tieneTrackHoy: false, time: '07:00' })], [], ctx);
    expect(items.map(x => x.clave)).toEqual(['a']);
  });

  it('las acciones de VIDA Y NEGOCIO son acciones, y llevan su hora', () => {
    const [accion] = itemsDeHoy([habito('r1', { dimension: 'VIDA Y NEGOCIO', title: 'Enviar propuesta', time: '09:30', habitoId: null })], [], ctx);
    expect(accion).toMatchObject({ tipo: 'accion', titulo: 'Enviar propuesta', hora: '09:30', dimension: null });
  });

  it('la hora vacía es «sin hora»', () => {
    expect(itemsDeHoy([habito('a', { time: '' })], [], ctx)[0].hora).toBeNull();
  });

  it('un título del catálogo que llega TODO en mayúsculas se muestra en tipo oración (2026-10-31); el nombre propio y las acciones, tal cual', () => {
    const items = itemsDeHoy(
      [
        habito('a', { title: 'AGUA TIBIA CON LIMÓN', habitoId: 'h-a' }),
        habito('b', { title: 'RITUAL TIERRA - AGUA - FUEGO (mañana)', habitoId: 'h-b' }),
        habito('c', { title: 'AGUA TIBIA CON LIMÓN', habitoId: 'h-c' }),
        habito('d', { title: 'Clase diaria', habitoId: 'h-d' }),
        habito('r1', { title: 'LLAMAR A MI HIJO', dimension: 'VIDA Y NEGOCIO', habitoId: null }),
      ],
      [],
      { ...ctx, titulos: { 'h-c': 'MI AGUA' } },
    );
    expect(items.map(x => x.titulo)).toEqual([
      'Agua tibia con limón',
      'Ritual tierra - agua - fuego (mañana)',
      'MI AGUA',
      'Clase diaria',
      'LLAMAR A MI HIJO',
    ]);
  });

  it('usa el nombre que la persona le puso al hábito (D-127)', () => {
    const [item] = itemsDeHoy([habito('a', { title: 'Agua tibia', habitoId: 'h-agua' })], [], { ...ctx, titulos: { 'h-agua': 'Mi agua' } });
    expect(item.titulo).toBe('Mi agua');
  });

  it('un hábito pausado después de generarse su registro (pendiente, y su día ya no corre) no aparece hoy', () => {
    // 2026-10-29 es JUE.
    const dias = { LUN: true, MAR: true, 'MIÉ': true, JUE: false, VIE: true, 'SÁB': true, DOM: true };
    const items = itemsDeHoy([habito('a', { diasCatalogo: dias })], [], ctx);
    expect(items[0].pausado).toBe(true);
    const lista = armarListaDelDia(items, minutosDeLaHora('10:00') as number);
    expect([...lista.enCurso, ...lista.sinHora, ...lista.atrasados, ...lista.cerrados, ...lista.hechos]).toEqual([]);
  });

  it('pero si ya lo hizo, sigue entre los hechos aunque después lo pausen', () => {
    const dias = { LUN: true, MAR: true, 'MIÉ': true, JUE: false, VIE: true, 'SÁB': true, DOM: true };
    const items = itemsDeHoy([habito('a', { diasCatalogo: dias, done: true, estado: 'COMPLETADO' })], [], ctx);
    expect(items[0].pausado).toBe(false);
  });

  it('un registro cuyo día ya cerró queda cerrado, no atrasado', () => {
    const [item] = itemsDeHoy([habito('a', { estado: 'EXPIRADO', time: '05:00' })], [], ctx);
    expect(item.cerrado).toBe(true);
  });

  it('los eventos de hoy entran con su hora en la zona del teléfono; los de otro día y los «No voy», no', () => {
    const items = itemsDeHoy(
      [],
      [
        evento('hoy', '2026-10-29T15:00:00Z'), // 10:00 Lima
        evento('ayer', '2026-10-28T15:00:00Z'),
        evento('no-voy', '2026-10-29T16:00:00Z', { asistencia: 'NOT_GOING' }),
      ],
      ctx,
    );
    expect(items.map(x => [x.clave.startsWith('evento-hoy'), x.hora])).toEqual([[true, '10:00']]);
    expect(items[0]).toMatchObject({ tipo: 'evento', lugar: 'Zoom', duracionMin: 60, hecho: false });
  });

  it('los puntos de hoy son los que pagó el servidor, solo de lo cumplido', () => {
    const items = itemsDeHoy(
      [
        habito('a', { done: true, estado: 'COMPLETADO', puntosOtorgados: 8 }),
        habito('b', { done: true, estado: 'COMPLETADO', puntosOtorgados: 5 }),
        habito('c', { pointsAtStake: 10 }),
      ],
      [],
      ctx,
    );
    expect(puntosDeHoy(items)).toBe(13);
  });

  it('lo cumplido lleva la hora, los puntos y lo escrito', () => {
    const [item] = itemsDeHoy(
      [habito('a', { done: true, estado: 'COMPLETADO', puntosOtorgados: 8, completadoEn: '2026-10-29T11:12:00Z', respuestaTexto: ' Me sentí bien ' })],
      [],
      ctx,
    );
    expect(item.cumplido).toEqual({ hora: '06:12', puntos: 8, escrito: 'Me sentí bien' });
  });
});

describe('itemsDeUnDiaCerrado (lo que dijo GET /habit-tracks/day)', () => {
  const track = (id: string, estado: string, extra: Partial<TrackDelDiaApi> = {}): TrackDelDiaApi => ({
    id,
    habitoId: `h-${id}`,
    fechaEjecucion: '2026-10-28',
    diaPrograma: 5,
    tipoDia: 'TODOS',
    esOpcional: false,
    estado,
    puntosOtorgados: estado === 'COMPLETADO' ? 8 : 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: estado === 'COMPLETADO' ? '2026-10-28T11:12:00Z' : null,
    tituloHabito: `Hábito ${id}`,
    tipoHabito: 'CHECKBOX',
    guia: null,
    horaDisparo: '06:00:00',
    horaLimite: null,
    puntosEnJuego: null,
    rachaDias: null,
    ...extra,
  });

  it('lo COMPLETADO es ✓ y todo lo demás, candado: nada pendiente, nada atrasado', () => {
    const items = itemsDeUnDiaCerrado([track('a', 'COMPLETADO'), track('b', 'EXPIRADO'), track('c', 'PENDIENTE')], [], {
      ...ctx,
      fechaIso: '2026-10-28',
    });
    expect(items.map(x => [x.hecho, x.cerrado])).toEqual([[true, false], [false, true], [false, true]]);
  });

  it('no muestra puntos en juego ni racha de un día pasado: sin puntos si no se hizo', () => {
    const [hecho, noHecho] = itemsDeUnDiaCerrado([track('a', 'COMPLETADO'), track('b', 'EXPIRADO')], [], { ...ctx, fechaIso: '2026-10-28' });
    expect(hecho.puntos).toBe(8);
    expect(noHecho.puntos).toBeNull();
  });

  it('un día sin registros ([]) no inventa nada', () => {
    expect(itemsDeUnDiaCerrado([], [], { ...ctx, fechaIso: '2026-10-28' })).toEqual([]);
  });

  it('los eventos de ese día van sin estado', () => {
    const items = itemsDeUnDiaCerrado([], [evento('e', '2026-10-28T15:00:00Z')], { ...ctx, fechaIso: '2026-10-28' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tipo: 'evento', hecho: false });
  });
});

describe('itemsPlanificados (lo que viene, o un día anterior sin lectura)', () => {
  const pref = (habitId: string, weekdays: PreferenciaHabitoApi['weekdays']): PreferenciaHabitoApi => ({
    habitId,
    title: habitId,
    triggerTime: '06:00:00',
    limitTime: null,
    customized: false,
    pendingChange: null,
    weekdays,
  });
  const todos = { LUN: true, MAR: true, 'MIÉ': true, JUE: true, VIE: true, 'SÁB': true, DOM: true };
  const base = { ...ctx, fechaIso: '2026-10-30', acciones: [], ocurrencias: [] }; // viernes

  it('usa la hora de ESE día (spec 008) y, sin ella, la general del hábito', () => {
    const items = itemsPlanificados({
      ...base,
      inventario: [habito('a', { time: '06:00', diasCatalogo: todos }), habito('b', { time: '07:00', diasCatalogo: todos })],
      preferencias: new Map([['h-a', pref('h-a', [{ weekday: 'FRIDAY', triggerTime: '09:30:00' }])]]),
    });
    expect(items.map(x => [x.titulo, x.hora])).toEqual([['Hábito a', '09:30'], ['Hábito b', '07:00']]);
  });

  it('un día en que el hábito no corre, o que la persona apagó, no entra', () => {
    const items = itemsPlanificados({
      ...base,
      inventario: [
        habito('no-corre', { time: '06:00', diasCatalogo: { ...todos, VIE: false } }),
        habito('apagado', { time: '06:00', diasCatalogo: todos }),
        habito('si', { time: '06:00', diasCatalogo: todos }),
      ],
      preferencias: new Map([['h-apagado', pref('h-apagado', [{ weekday: 'FRIDAY', active: false }])]]),
    });
    expect(items.map(x => x.titulo)).toEqual(['Hábito si']);
  });

  it('un cambio de hora general ya guardado que rige desde mañana (D-91) se ve en el día que viene a su hora NUEVA', () => {
    const conCambio: PreferenciaHabitoApi = {
      ...pref('h-gym', [{ weekday: 'FRIDAY', triggerTime: '14:30:00' }]),
      pendingChange: { triggerTime: '21:30:00', limitTime: null, effectiveDate: '2026-10-30' },
    };
    const inventario = [habito('gym', { time: '14:30', diasCatalogo: todos })];
    const viernes = itemsPlanificados({ ...base, inventario, preferencias: new Map([['h-gym', conCambio]]) });
    expect(viernes.map(x => x.hora)).toEqual(['21:30']);
    // El sábado y el domingo (después de la fecha en que rige) también; el jueves de HOY, antes de esa fecha, no.
    const sabado = itemsPlanificados({ ...base, fechaIso: '2026-10-31', inventario, preferencias: new Map([['h-gym', { ...conCambio, weekdays: [{ weekday: 'SATURDAY', triggerTime: '14:30:00' }] }]]) });
    expect(sabado.map(x => x.hora)).toEqual(['21:30']);
    const jueves = itemsPlanificados({ ...base, fechaIso: '2026-10-29', inventario, preferencias: new Map([['h-gym', { ...conCambio, weekdays: [{ weekday: 'THURSDAY', triggerTime: '14:30:00' }] }]]) });
    expect(jueves.map(x => x.hora)).toEqual(['14:30']);
  });

  it('el cambio general que rige desde mañana NO pisa la hora propia de un día (spec 008)', () => {
    const conCambio: PreferenciaHabitoApi = {
      ...pref('h-gym', [{ weekday: 'FRIDAY', triggerTime: '08:00:00', customTime: true }]),
      pendingChange: { triggerTime: '21:30:00', limitTime: null, effectiveDate: '2026-10-30' },
    };
    const items = itemsPlanificados({ ...base, inventario: [habito('gym', { time: '14:30', diasCatalogo: todos })], preferencias: new Map([['h-gym', conCambio]]) });
    expect(items.map(x => x.hora)).toEqual(['08:00']);
  });

  it('las acciones agendadas para esa fecha y los eventos de ese día', () => {
    const items = itemsPlanificados({
      ...base,
      inventario: [],
      preferencias: new Map(),
      acciones: [
        { id: 'r1', fecha: '2026-10-30', titulo: 'Llamar', horaInicio: '10:00:00', completada: false },
        { id: 'r2', fecha: '2026-10-31', titulo: 'Otra fecha', horaInicio: null, completada: false },
      ],
      ocurrencias: [evento('e', '2026-10-30T20:00:00Z')],
    });
    expect(items.map(x => [x.tipo, x.hora])).toEqual([['accion', '10:00'], ['evento', '15:00']]);
  });

  it('nada de lo planificado está hecho ni cerrado', () => {
    const items = itemsPlanificados({ ...base, inventario: [habito('a', { diasCatalogo: todos })], preferencias: new Map() });
    expect(items.every(x => !x.hecho && !x.cerrado && x.puntos === null)).toBe(true);
  });
});

describe('utilidades', () => {
  it('el día de la semana de una fecha', () => {
    expect(diaDelPlanDeLaFecha('2026-10-26')).toBe('LUN');
    expect(diaDelPlanDeLaFecha('2026-10-29')).toBe('JUE');
    expect(diaDelPlanDeLaFecha('2026-11-01')).toBe('DOM');
  });
  it('un evento con una dirección dice la dirección', () => {
    const [item] = itemsDeEventos(
      [evento('e', '2026-10-29T15:00:00Z', { evento: { id: 'e', tipoUbicacion: 'ADDRESS', valorUbicacion: 'Av. Ejército 100' } as Ocurrencia['evento'] })],
      '2026-10-29',
      'America/Lima',
    );
    expect(item.lugar).toBe('Av. Ejército 100');
  });
});
