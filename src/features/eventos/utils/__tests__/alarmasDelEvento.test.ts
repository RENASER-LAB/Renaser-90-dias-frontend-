import { describe, expect, it } from '@jest/globals';

import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { claveDeOcurrencia, instantesDeAviso, planDeSincronizacion } from '../alarmasDelEvento';
import { armarAgenda } from '../miAgenda';
import { fechaEnZona, instanteEnZona } from '../zonaHoraria';

function oc(parcial: Partial<Evento> = {}, extra: Partial<Ocurrencia> = {}): Ocurrencia {
  const evento: Evento = {
    id: 'e1',
    titulo: 'Clase',
    descripcion: null,
    iniciaEn: '2026-10-01T00:30:00Z', // miércoles 30/09 19:30 en Lima
    duracionMinutos: 60,
    zona: 'America/Lima',
    tipoUbicacion: 'MEET',
    valorUbicacion: 'https://meet.google.com/x',
    tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null,
    notificarAlCrear: false,
    recurrente: false,
    creadoPor: null,
    audiencia: 'ALL_MEMBERS',
    rolesDestino: [],
    ...parcial,
  };
  return {
    evento,
    inicioOcurrencia: evento.iniciaEn,
    iniciaEn: evento.iniciaEn,
    duracionMinutos: 60,
    titulo: evento.titulo,
    asistencia: 'GOING',
    ...extra,
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

describe('zona del evento (regla 02: la medianoche local no es una hora UTC fija)', () => {
  it('un evento de las 19:30 de Lima cae el 30, aunque en UTC ya sea el 1', () => {
    expect(fechaEnZona('2026-10-01T00:30:00Z', 'America/Lima')).toBe('2026-09-30');
  });

  it('las 06:00 de Lima son las 11:00 UTC', () => {
    expect(iso(instanteEnZona('2026-09-30', '06:00', 'America/Lima') as number)).toBe('2026-09-30T11:00:00.000Z');
  });
});

describe('cuándo suena la alarma de un evento (E-7)', () => {
  it('sin reglas propias usa las del tipo: 06:00 del día del evento en Lima y 10 min antes', () => {
    // Reloj a las 02:00 UTC del 30 = 21:00 del 29 en Lima: el caso que esconde el fixture de las 10 UTC.
    const ahora = Date.parse('2026-09-30T02:00:00Z');
    expect(instantesDeAviso(oc(), ahora).map(iso)).toEqual([
      '2026-09-30T11:00:00.000Z',
      '2026-10-01T00:20:00.000Z',
    ]);
  });

  it('la Semana de Manifestación suena a las 04:50 de Lima y un día antes', () => {
    const ahora = Date.parse('2026-09-28T00:00:00Z');
    const semana = oc({ tipoEvento: 'SEMANA_MANIFESTACION', iniciaEn: '2026-09-30T10:00:00Z' });
    expect(instantesDeAviso(semana, ahora).map(iso)).toEqual([
      '2026-09-29T10:00:00.000Z',
      '2026-09-30T09:50:00.000Z',
    ]);
  });

  it('las reglas propias del evento mandan sobre las del tipo', () => {
    const propio = oc({ reglasDeAviso: [{ tipo: 'minutosAntes', minutos: 30 }] });
    expect(instantesDeAviso(propio, 0).map(iso)).toEqual(['2026-10-01T00:00:00.000Z']);
  });

  it('un tipo nuevo cae a 10 minutos antes; lo que ya pasó no se programa', () => {
    expect(instantesDeAviso(oc({ tipoEvento: 'TALLER' }), 0).map(iso)).toEqual(['2026-10-01T00:20:00.000Z']);
    expect(instantesDeAviso(oc(), Date.parse('2026-10-01T00:25:00Z'))).toEqual([]);
  });
});

describe('poner las alarmas de acuerdo con el servidor', () => {
  const ahora = Date.parse('2026-09-26T15:00:00Z');
  const ventana = { desdeMs: ahora - 3_600_000, hastaMs: ahora + 30 * 86_400_000 };
  const guardada = (inicio = '2026-10-01T00:30:00Z') => ({ ids: ['a1'], iniciaEn: inicio });

  it('quita la alarma de un evento cancelado (ya no está en la lista)', () => {
    const plan = planDeSincronizacion({
      guardadas: { [claveDeOcurrencia('e1', '2026-10-01T00:30:00Z')]: guardada() },
      ocurrencias: [],
      ventana,
      ahoraMs: ahora,
      activas: true,
    });
    expect(plan.cancelar).toEqual(['e1|2026-10-01T00:30:00Z']);
  });

  it('quita la de un evento al que ya no va (dijo «No voy» en otro lado)', () => {
    const plan = planDeSincronizacion({
      guardadas: { 'e1|2026-10-01T00:30:00Z': guardada() },
      ocurrencias: [oc({}, { asistencia: 'NOT_GOING' })],
      ventana,
      ahoraMs: ahora,
      activas: true,
    });
    expect(plan.cancelar).toHaveLength(1);
    expect(plan.programar).toHaveLength(0);
  });

  it('no toca una alarma fuera de la ventana leída: que no esté en la lista no dice nada', () => {
    const plan = planDeSincronizacion({
      guardadas: { 'e9|2026-12-01T00:00:00Z': guardada('2026-12-01T00:00:00Z') },
      ocurrencias: [],
      ventana,
      ahoraMs: ahora,
      activas: true,
    });
    expect(plan.cancelar).toEqual([]);
  });

  it('pone la que falta a un «Voy» (respondió desde la web o reinstaló) y no repite la que ya está', () => {
    const plan = planDeSincronizacion({
      guardadas: { 'e1|2026-10-01T00:30:00Z': guardada() },
      ocurrencias: [oc(), oc({ id: 'e2' })],
      ventana,
      ahoraMs: ahora,
      activas: true,
    });
    expect(plan.programar.map(o => o.evento.id)).toEqual(['e2']);
    expect(plan.cancelar).toEqual([]);
  });

  it('con las alarmas de eventos apagadas en Yo, se quitan todas y no se pone ninguna', () => {
    const plan = planDeSincronizacion({
      guardadas: { 'e1|2026-10-01T00:30:00Z': guardada() },
      ocurrencias: [oc(), oc({ id: 'e2' })],
      ventana,
      ahoraMs: ahora,
      activas: false,
    });
    expect(plan.cancelar).toHaveLength(1);
    expect(plan.programar).toHaveLength(0);
  });
});

describe('Mi agenda (E-8)', () => {
  it('siete días desde hoy, con eventos, hábitos del día y acciones, en orden de hora', () => {
    // Martes 29/09 a las 23:00 de Lima = 04:00 UTC del 30: «hoy» es el 29, no el 30.
    const ahora = Date.parse('2026-09-30T04:00:00Z');
    const dias = armarAgenda({
      ahoraMs: ahora,
      zona: 'America/Lima',
      ocurrencias: [oc(), oc({ id: 'e2' }, { asistencia: 'NOT_GOING' })],
      habitos: [
        { titulo: 'Despertar', hora: '05:00', diasActivos: [true, true, true, true, true, true, true], bloqueado: false },
        { titulo: 'Solo lunes', hora: '08:00', diasActivos: [true, false, false, false, false, false, false], bloqueado: false },
        { titulo: 'Sin hora', hora: '', diasActivos: [true, true, true, true, true, true, true], bloqueado: false },
      ],
      acciones: [{ fecha: '2026-09-30', titulo: 'Llamar a Ana', hora: '20:00:00' }],
    });
    expect(dias).toHaveLength(7);
    expect(dias[0].fecha).toBe('2026-09-29');
    expect(dias[1].fecha).toBe('2026-09-30');
    expect(dias[1].entradas.map(e => `${e.hora} ${e.titulo}`)).toEqual(['05:00 Despertar', '19:30 Clase', '20:00 Llamar a Ana']);
    // El lunes 05/10 aparece el hábito de solo lunes; el evento al que no va, nunca.
    expect(dias[6].entradas.map(e => e.titulo)).toEqual(['Despertar', 'Solo lunes']);
    expect(dias.flatMap(d => d.entradas).some(e => e.eventoId === 'e2')).toBe(false);
  });
});
