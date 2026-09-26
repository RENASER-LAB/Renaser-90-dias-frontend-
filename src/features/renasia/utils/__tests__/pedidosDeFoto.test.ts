/**
 * Tarjeta "Tomar foto" del acompañante (evento `evidencia`, 2026-09-26).
 */
import { describe, expect, it } from '@jest/globals';

import {
  agregarPedido,
  cambioAlRegistrar,
  cambioTrasIniciar,
  conMarcaDeCierre,
  estadoVisibleDelPedido,
  pedidoDesdeEvento,
  solicitudDelPedido,
} from '../pedidosDeFoto';

const EVENTO = {
  tipo: 'evidencia' as const,
  registroId: 'r-1',
  titulo: 'Ducha fría',
  venceEn: '2026-09-26T23:00:00Z',
};
const ANTES = Date.parse('2026-09-26T15:00:00Z');
const DESPUES = Date.parse('2026-09-26T23:00:01Z');

describe('pedidoDesdeEvento', () => {
  it('arranca pendiente con los datos del evento', () => {
    expect(pedidoDesdeEvento(EVENTO)).toEqual({
      registroId: 'r-1',
      titulo: 'Ducha fría',
      venceEn: '2026-09-26T23:00:00Z',
      conPregunta: false,
      destino: 'habito',
      estado: 'pendiente',
    });
  });

  it('D-178: con destino roca es una acción del día; sin destino, un hábito (backend viejo)', () => {
    expect(pedidoDesdeEvento({ ...EVENTO, destino: 'roca' }).destino).toBe('roca');
    expect(pedidoDesdeEvento({ ...EVENTO, destino: 'habito' }).destino).toBe('habito');
    expect(pedidoDesdeEvento(EVENTO).destino).toBe('habito');
  });
});

describe('solicitudDelPedido', () => {
  it('le pasa al registro con foto el destino de la tarjeta', () => {
    expect(solicitudDelPedido(pedidoDesdeEvento({ ...EVENTO, destino: 'roca' }))).toEqual({
      registroId: 'r-1',
      titulo: 'Ducha fría',
      conPregunta: false,
      destino: 'roca',
    });
  });
});

describe('agregarPedido', () => {
  it('no repite el mismo registro', () => {
    const uno = agregarPedido(undefined, pedidoDesdeEvento(EVENTO));
    expect(agregarPedido(uno, pedidoDesdeEvento(EVENTO))).toHaveLength(1);
    expect(agregarPedido(uno, pedidoDesdeEvento({ ...EVENTO, registroId: 'r-2' }))).toHaveLength(2);
  });
});

describe('estadoVisibleDelPedido', () => {
  it('pasado venceEn se ve vencido', () => {
    const pedido = pedidoDesdeEvento(EVENTO);
    expect(estadoVisibleDelPedido(pedido, ANTES)).toBe('pendiente');
    expect(estadoVisibleDelPedido(pedido, DESPUES)).toBe('vencido');
  });

  it('un registrado sigue registrado aunque pase el plazo', () => {
    expect(estadoVisibleDelPedido({ ...pedidoDesdeEvento(EVENTO), estado: 'registrado' }, DESPUES)).toBe('registrado');
  });

  it('un venceEn ilegible no bloquea el botón', () => {
    expect(estadoVisibleDelPedido({ ...pedidoDesdeEvento(EVENTO), venceEn: 'mañana' }, DESPUES)).toBe('pendiente');
  });
});

describe('cambioTrasIniciar', () => {
  it('cancelar la cámara deja la tarjeta disponible', () => {
    expect(cambioTrasIniciar('cancelado')).toEqual({ estado: 'pendiente' });
    expect(cambioTrasIniciar('ocupado')).toEqual({ estado: 'pendiente' });
    expect(cambioTrasIniciar('abierto')).toEqual({ estado: 'pendiente' });
  });

  it('si ya estaba completado la marca como registrada', () => {
    expect(cambioTrasIniciar('completado').estado).toBe('registrado');
  });

  it('vencido o de otro día la deshabilita', () => {
    expect(cambioTrasIniciar('vencido').estado).toBe('vencido');
    expect(cambioTrasIniciar('no-es-de-hoy').estado).toBe('vencido');
  });

  it('D-178: una acción bloqueada por Pareto queda disponible para cuando haga la verde', () => {
    expect(cambioTrasIniciar('bloqueada', 'roca')).toEqual({ estado: 'pendiente' });
    expect(cambioTrasIniciar('completado', 'roca')).toEqual({ estado: 'registrado', mensaje: 'Ya estaba registrada.' });
  });
});

describe('cambioAlRegistrar', () => {
  it('D-178: una acción dice "quedó registrada tu acción"; un hábito, lo de siempre', () => {
    expect(cambioAlRegistrar('roca')).toEqual({ estado: 'registrado', mensaje: 'Listo, quedó registrada tu acción.' });
    expect(cambioAlRegistrar()).toEqual({ estado: 'registrado', mensaje: 'Listo, quedó registrado.' });
  });
});

describe('conMarcaDeCierre', () => {
  it('anota cuándo se cerró solo si cerró', () => {
    expect(conMarcaDeCierre(cambioAlRegistrar(), ANTES).resueltoEnMs).toBe(ANTES);
    expect(conMarcaDeCierre({ estado: 'pendiente' }, ANTES).resueltoEnMs).toBeUndefined();
  });
});
