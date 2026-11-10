import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 048 (2026-11-10): el Código Renaser innegociable (días 1 a 7) sin señal.
 *
 * Fallo encontrado en la auditoría: sin señal, la lectura de `/radar/latest` fallaba, se daba la hora por leída y el formulario
 * innegociable se abría solo. Su cuerpo dice «Necesitas conexión» (`SoloConConexion`), no tiene X y el retroceso está bloqueado:
 * la persona quedaba atrapada sin poder usar la app. Ahora sin señal no se abre solo, lo ya abierto se puede cerrar, y al volver
 * la señal se lee de nuevo y se pide como siempre.
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

  it('si la lectura falla sin señal, no se abre solo; al volver la señal lee de nuevo y se pide como siempre', async () => { // spec 048 FR-005
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerUltimo.mockImplementationOnce(async () => {
      // Lo que hace `apiFetch` cuando no hay respuesta: marca «sin conexión» y rechaza con un error de red.
      marcarSinConexion();
      throw new ApiError(0, 'No se pudo conectar con el servidor.');
    });
    await montar();

    expect(mockDibujos.map(d => d.visible)).not.toContain(true);

    mockObtenerUltimo.mockResolvedValueOnce(null);
    await act(async () => marcarConConexion());
    await vaciar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(2);
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);
    aviso.mockRestore();
  });

  it('al volver la señal, si la hora ya se respondió desde otro teléfono, no se abre', async () => { // spec 048 FR-005
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerUltimo.mockImplementationOnce(async () => {
      marcarSinConexion();
      throw new ApiError(0, 'No se pudo conectar con el servidor.');
    });
    await montar();

    mockObtenerUltimo.mockResolvedValueOnce(enHora(10, 12).toISOString());
    await act(async () => marcarConConexion());
    await vaciar();

    expect(mockDibujos.map(d => d.visible)).not.toContain(true);
    aviso.mockRestore();
  });

  it('abierto con señal, si la señal se va sigue abierto pero se puede cerrar; al volver la señal se pide de nuevo', async () => { // spec 048 FR-005
    mockObtenerUltimo.mockResolvedValueOnce(null);
    await montar();
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);

    await act(async () => marcarSinConexion());
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(false);

    await act(async () => ultimo().onCerrar());
    expect(ultimo().visible).toBe(false);

    await act(async () => marcarConConexion());
    expect(ultimo().visible).toBe(true);
    expect(ultimo().obligatorio).toBe(true);
  });
});
