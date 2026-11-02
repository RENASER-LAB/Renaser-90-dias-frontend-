import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

/**
 * Spec 038: el hook que guarda cuál ritual pidió SER y entrega las props de la hoja de texto de Training. Abrir muestra el ritual con su título
 * en tipo oración, completar cierra la hoja y avisa, y cambiar el día cierra y avisa con el registro de ese ritual.
 */

import type { PedidoDeFotoUI } from '../../types/renasia.types';
import { useRitualPorTexto } from '../useRitualPorTexto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RITUAL: PedidoDeFotoUI = {
  registroId: 'r-ritual',
  titulo: 'RITUAL TIERRA - AGUA - FUEGO (mañana)',
  venceEn: '2026-11-03T05:00:00Z',
  conPregunta: true,
  destino: 'habito',
  estado: 'pendiente',
};

function montar(alCompletar = jest.fn(), alCambiarElDia = jest.fn()) {
  const salida: { actual: ReturnType<typeof useRitualPorTexto> | null } = { actual: null };
  function Prueba() {
    salida.actual = useRitualPorTexto({ alCompletar, alCambiarElDia });
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(Prueba));
  });
  return { salida, alCompletar, alCambiarElDia };
}

describe('useRitualPorTexto', () => {
  it('empieza cerrado y sin registro', () => {
    const { salida } = montar();
    expect(salida.actual!.modal.visible).toBe(false);
    expect(salida.actual!.modal.registroId).toBeNull();
  });

  it('abrir muestra el registro de ESE ritual, con su título en tipo oración', () => {
    const { salida } = montar();
    act(() => salida.actual!.abrir(RITUAL));

    expect(salida.actual!.modal.visible).toBe(true);
    expect(salida.actual!.modal.registroId).toBe('r-ritual');
    expect(salida.actual!.modal.titulo).toBe('Ritual tierra - agua - fuego (mañana)');
  });

  it('completar cierra la hoja y avisa con el registro y el resultado del servidor', () => {
    const { salida, alCompletar } = montar();
    act(() => salida.actual!.abrir(RITUAL));
    act(() => salida.actual!.modal.alCompletado('r-ritual', { puntosOtorgados: 7, yaEstabaCompletado: false }));

    expect(salida.actual!.modal.visible).toBe(false);
    expect(alCompletar).toHaveBeenCalledWith('r-ritual', { puntosOtorgados: 7, yaEstabaCompletado: false });
  });

  it('si cambió el día con la hoja abierta, cierra y avisa con el registro de ese ritual', () => {
    const { salida, alCambiarElDia } = montar();
    act(() => salida.actual!.abrir(RITUAL));
    act(() => salida.actual!.modal.alCambiarElDia());

    expect(salida.actual!.modal.visible).toBe(false);
    expect(alCambiarElDia).toHaveBeenCalledWith('r-ritual');
  });

  it('cerrar sin enviar solo baja la hoja: no avisa que se registró', () => {
    const { salida, alCompletar } = montar();
    act(() => salida.actual!.abrir(RITUAL));
    act(() => salida.actual!.modal.alCerrar());

    expect(salida.actual!.modal.visible).toBe(false);
    expect(alCompletar).not.toHaveBeenCalled();
  });
});
