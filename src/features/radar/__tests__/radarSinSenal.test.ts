import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 048 (2026-11-10): el Código Renaser innegociable (días 1 a 7) sin señal.
 *
 * #179 (auditoría): sin señal, el formulario innegociable se abría solo con el cuerpo en «Necesitas conexión» (`SoloConConexion`), sin
 * X y con el retroceso bloqueado: la persona quedaba atrapada. Entonces se decidió que sin señal no se abriera solo.
 *
 * **Fase 3, P8 (decisión del dueño, 2026-11-10): se revierte.** Ahora el Código Renaser se responde sin señal (se guarda en la cola con
 * la hora real, `radarSinRed.ts`) y el cuerpo ya no va en `SoloConConexion`: el innegociable vuelve a abrirse solo y SIN X también
 * sin señal. Lo que queda de #179: si la lectura falla sin señal, al volver la señal se lee de nuevo la hora.
 */

const mockObtenerUltimo = jest.fn<() => Promise<string | null>>();
jest.mock('../api/radarApi', () => ({
  obtenerUltimoCheckIn: () => mockObtenerUltimo(),
  registrarCheckIn: async () => ({ createdAt: new Date().toISOString() }),
}));
const mockObtenerResumenHome = jest.fn<() => Promise<{ inscrito: boolean; diaPrograma: number }>>();
jest.mock('../../home/api/homeApi', () => ({ obtenerResumenHome: () => mockObtenerResumenHome() }));
jest.mock('../../../context/AuthContext', () => {
  const sesion = { user: { id: 'u1', role: 'TRAINEE' }, isOnboardingCompleted: true, onboardingResuelto: true };
  return { useAuth: () => sesion };
});
jest.mock('../../sparkie/hooks/useArranqueGuiado', () => {
  const arranque = { estado: { paso: 'NINGUNO' } };
  return { useArranqueGuiado: () => arranque };
});
jest.mock('../notificaciones/recordatoriosDeRadar', () => ({ sincronizarRecordatoriosDeRadar: async () => undefined }));

type PropsDelModal = { visible: boolean; obligatorio: boolean; onCerrar: () => void };
const mockDibujos: PropsDelModal[] = [];
jest.mock('../components/CodigoRenaserModal', () => ({
  CodigoRenaserModal: (props: PropsDelModal) => {
    mockDibujos.push(props);
    return null;
  },
}));

import { olvidarCapasObligatorias } from '../../../navigation/capasObligatorias';
import { ApiError } from '../../../services/http/apiClient';
import { _reiniciarConexion, marcarConConexion, marcarSinConexion } from '../../sinRed/estadoDeConexion';
import { CodigoRenaserOverlay } from '../components/CodigoRenaserOverlay';
import { RadarProvider } from '../RadarContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Lunes 19/10/2026, día 3 del programa, pasada la cortesía de la franja de las 10:00. */
const enHora = (hora: number, minuto = 0) => new Date(2026, 9, 19, hora, minuto, 0, 0);

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

let raiz: ReactTestRenderer | null = null;
async function montar() {
  act(() => {
    raiz = TestRenderer.create(React.createElement(RadarProvider, null, React.createElement(CodigoRenaserOverlay)));
  });
  await vaciar();
  await vaciar();
}
const ultimo = () => mockDibujos[mockDibujos.length - 1];

describe('Código Renaser innegociable sin señal (spec 048)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'], now: enHora(10, 30) });
    _reiniciarConexion();
    mockObtenerUltimo.mockReset();
    mockObtenerResumenHome.mockReset();
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 3 });
    mockDibujos.length = 0;
    olvidarCapasObligatorias();
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    olvidarCapasObligatorias();
    _reiniciarConexion();
    jest.useRealTimers();
  });

  it('si la lectura falla sin señal, se abre solo y sin X (P8); al volver la señal lee de nuevo y sigue pidiéndose', async () => { // spec 048 FR-019
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerUltimo.mockImplementationOnce(async () => {
      // Lo que hace `apiFetch` cuando no hay respuesta: marca «sin conexión» y rechaza con un error de red.
      marcarSinConexion();
      throw new ApiError(0, 'No se pudo conectar con el servidor.');
    });
    await montar();

    // Sin señal el innegociable se abre solo y no se puede cerrar: ahora se responde sin señal (antes de la fase 3 atrapaba).
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);

    mockObtenerUltimo.mockResolvedValueOnce(null);
    await act(async () => marcarConConexion());
    await vaciar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(2);
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);
    aviso.mockRestore();
  });

  it('al volver la señal, si la hora ya se respondió desde otro teléfono, se cierra', async () => { // spec 048 FR-005
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerUltimo.mockImplementationOnce(async () => {
      marcarSinConexion();
      throw new ApiError(0, 'No se pudo conectar con el servidor.');
    });
    await montar();

    mockObtenerUltimo.mockResolvedValueOnce(enHora(10, 12).toISOString());
    await act(async () => marcarConConexion());
    await vaciar();

    expect(ultimo().visible).toBe(false);
    aviso.mockRestore();
  });

  it('abierto con señal, si la señal se va sigue abierto y sin X: se responde sin señal (P8)', async () => { // spec 048 FR-019
    mockObtenerUltimo.mockResolvedValueOnce(null);
    await montar();
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);

    await act(async () => marcarSinConexion());
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);

    await act(async () => marcarConConexion());
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);
  });

  it('el formulario ya no va en SoloConConexion: sin señal también se puede escribir y registrar', () => { // spec 048 FR-019
    const fuente = readFileSync(join(__dirname, '../components/CodigoRenaserModal.tsx'), 'utf8');
    expect(fuente).not.toContain('SoloConConexion');
  });
});
