/**
 * El orden y las cifras de la bandeja de tickets.
 *
 * Lo que estas pruebas protegen es la propiedad que hace útil la pantalla: **lo que lleva más
 * tiempo esperando respuesta tiene que quedar arriba**. El fallo que esconderían si no
 * existieran es el silencioso: ordenar la bandeja solo por fecha —lo más nuevo primero, que es
 * el orden natural de una página del backend— entierra el ticket de hace nueve días bajo el que
 * llegó esta mañana, y nadie se entera de que alguien lleva nueve días sin respuesta.
 */
import { describe, expect, it } from '@jest/globals';

import {
  etiquetaDeEstadoDeTicket,
  ordenarBandeja,
  resumenDeBandeja,
} from '../bandeja';
import type { WireTicketMentor } from '../../types/tickets.types';

function ticket(parcial: Partial<WireTicketMentor> & { id: string }): WireTicketMentor {
  return {
    traineeProfileId: 'p-1',
    blockDescription: 'Un bloqueo',
    attemptedSolutions: 'Lo intenté así',
    smartGoalImpact: 'Frena mi meta',
    status: 'OPEN',
    mentorAnswer: null,
    answeredAt: null,
    savedToLibrary: false,
    createdAt: '2026-09-10T12:00:00Z',
    ...parcial,
  };
}

describe('ordenarBandeja', () => {
  it('pone lo que espera respuesta antes que lo ya respondido', () => {
    const orden = ordenarBandeja([
      ticket({ id: 'respondido', status: 'ANSWERED', createdAt: '2026-09-14T12:00:00Z' }),
      ticket({ id: 'abierto', status: 'OPEN', createdAt: '2026-09-01T12:00:00Z' }),
    ]).map(t => t.id);

    expect(orden).toEqual(['abierto', 'respondido']);
  });

  it('entre los que esperan, el que lleva más tiempo va primero', () => {
    const orden = ordenarBandeja([
      ticket({ id: 'de-hoy', createdAt: '2026-09-15T08:00:00Z' }),
      ticket({ id: 'de-hace-nueve-dias', createdAt: '2026-09-06T08:00:00Z' }),
      ticket({ id: 'de-anteayer', createdAt: '2026-09-13T08:00:00Z' }),
    ]).map(t => t.id);

    expect(orden).toEqual(['de-hace-nueve-dias', 'de-anteayer', 'de-hoy']);
  });

  it('entre los respondidos, el más reciente va primero', () => {
    const orden = ordenarBandeja([
      ticket({ id: 'viejo', status: 'ANSWERED', createdAt: '2026-09-01T08:00:00Z' }),
      ticket({ id: 'nuevo', status: 'ANSWERED', createdAt: '2026-09-14T08:00:00Z' }),
    ]).map(t => t.id);

    expect(orden).toEqual(['nuevo', 'viejo']);
  });

  /* Una fecha ilegible no es una fecha antigua: mandarla al frente pondría arriba de todo un
     ticket del que no se sabe cuánto lleva esperando. */
  it('manda al fondo de su mitad lo que no tiene fecha legible', () => {
    const orden = ordenarBandeja([
      ticket({ id: 'sin-fecha', createdAt: 'no es una fecha' }),
      ticket({ id: 'con-fecha', createdAt: '2026-09-14T08:00:00Z' }),
    ]).map(t => t.id);

    expect(orden).toEqual(['con-fecha', 'sin-fecha']);
  });

  it('no toca la lista que recibe', () => {
    const original = [
      ticket({ id: 'b', status: 'ANSWERED' }),
      ticket({ id: 'a', status: 'OPEN' }),
    ];
    ordenarBandeja(original);
    expect(original.map(t => t.id)).toEqual(['b', 'a']);
  });
});

describe('resumenDeBandeja', () => {
  it('cuenta lo que hay, separando lo que espera de lo hecho', () => {
    const resumen = resumenDeBandeja([
      ticket({ id: '1', status: 'OPEN' }),
      ticket({ id: '2', status: 'OPEN' }),
      ticket({ id: '3', status: 'ANSWERED' }),
    ]);
    expect(resumen).toEqual({ total: 3, sinResponder: 2, respondidos: 1 });
  });

  it('una bandeja vacía es cero, no un hueco', () => {
    expect(resumenDeBandeja([])).toEqual({ total: 0, sinResponder: 0, respondidos: 0 });
  });
});

describe('etiquetaDeEstadoDeTicket', () => {
  it('no muestra el enum crudo', () => {
    expect(etiquetaDeEstadoDeTicket('OPEN')).toBe('Sin responder');
    expect(etiquetaDeEstadoDeTicket('ANSWERED')).toBe('Respondido');
  });
});
