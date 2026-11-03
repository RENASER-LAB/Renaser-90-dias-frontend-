/**
 * Spec 038 (issue #33): cuando SER cumple un hábito por una propuesta confirmada, la app hace lo mismo que cuando se cumple desde Training: avisa
 * `habitoCumplido` con el hábito y el día del registro (las alarmas de ese día se apagan, sale la celebración y se refresca el semáforo).
 * Contra el código anterior falla: `confirmarPropuestaRenasia` solo recargaba Training y Hoy y no sabía qué hábito se había cumplido.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {}
  return { ApiError, apiFetch: jest.fn() };
});

import { apiFetch } from '../../../../services/http/apiClient';
import { alCumplirUnHabito, tomarPuntosDe, type HabitoCumplido } from '../../../habits/eventos/habitoCumplido';
import { escucharPropuestaConfirmada } from '../../events/avisoPropuestaConfirmada';
import { confirmarPropuestaRenasia } from '../renasiaApi';

const pedir = jest.mocked(apiFetch);
const PROPUESTA = '3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f';
const CUMPLIDO = { registroId: 'reg-1', habitoId: 'hab-despertar', fecha: '2026-11-02', puntos: 8 };

describe('confirmar una propuesta que cumple un hábito', () => {
  beforeEach(() => {
    pedir.mockReset();
  });

  it('emite habitoCumplido con el registro, el hábito, el día y los puntos del servidor', async () => {
    const oyente = jest.fn<(cumplido: HabitoCumplido) => void>();
    const baja = alCumplirUnHabito(oyente);
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Habito marcado como completado. Puntos otorgados: 8.', habitoCumplido: CUMPLIDO });

    await confirmarPropuestaRenasia(PROPUESTA);

    expect(oyente).toHaveBeenCalledTimes(1);
    expect(oyente).toHaveBeenCalledWith({ registroId: 'reg-1', puntosOtorgados: 8, habitoId: 'hab-despertar', fecha: '2026-11-02' });
    // La tarjeta de Training encuentra los puntos al dibujarse cumplida, una sola vez.
    expect(tomarPuntosDe('reg-1')).toBe(8);
    expect(tomarPuntosDe('reg-1')).toBeNull();
    baja();
  });

  it('el aviso sale ANTES de recargar las pantallas, para que la tarjeta ya encuentre los puntos', async () => {
    const orden: string[] = [];
    const bajaCumplido = alCumplirUnHabito(() => orden.push('cumplido'));
    const bajaRecarga = escucharPropuestaConfirmada(() => orden.push('recarga'));
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Listo.', habitoCumplido: CUMPLIDO });

    await confirmarPropuestaRenasia(PROPUESTA);

    expect(orden).toEqual(['cumplido', 'recarga']);
    bajaCumplido();
    bajaRecarga();
  });

  it('una propuesta que no cumple ningún hábito (crear uno, cambiar una hora), o un FALLIDA, no emiten nada', async () => {
    const oyente = jest.fn();
    const baja = alCumplirUnHabito(oyente);

    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Hábito creado.' });
    await confirmarPropuestaRenasia(PROPUESTA);
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Listo.', habitoCumplido: null });
    await confirmarPropuestaRenasia(PROPUESTA);
    pedir.mockResolvedValueOnce({ estado: 'FALLIDA', mensaje: 'Ese día ya cerró.', habitoCumplido: CUMPLIDO });
    await confirmarPropuestaRenasia(PROPUESTA);

    expect(oyente).not.toHaveBeenCalled();
    baja();
  });

  it('un habitoCumplido mal formado no tumba la confirmación (se pierde solo el dato)', async () => {
    const oyente = jest.fn();
    const baja = alCumplirUnHabito(oyente);
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Listo.', habitoCumplido: { registroId: 7 } });

    await expect(confirmarPropuestaRenasia(PROPUESTA)).resolves.toMatchObject({ estado: 'CONFIRMADA', mensaje: 'Listo.' });

    expect(oyente).not.toHaveBeenCalled();
    baja();
  });
});
