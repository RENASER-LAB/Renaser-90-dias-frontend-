import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLlamadas: string[] = [];
let mockPermiso = 'concedido';
const mockAlerta = jest.fn();
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Ana Pérez' } }) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: jest.fn() }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({ cargarNotificaciones: () => null }));
jest.mock('../../hooks/useCarreraEnVivo', () => ({ useCarreraEnVivo: () => null, usePreferenciasDeLaCarrera: () => ({ guardarRuta: true }) }));
jest.mock('../../servicios/almacenCarrera', () => ({ guardarPreferencias: jest.fn(), leerPreferencias: async () => ({}) }));
jest.mock('../../servicios/carreraEnVivo', () => ({
  cargarCarrera: async () => null,
  carreraActual: () => null,
  cerrarCarrera: jest.fn(),
  descartarCarrera: async () => undefined,
  empezarCarrera: () => mockLlamadas.push('empezarCarrera'),
  latido: jest.fn(),
  pausarCarrera: jest.fn(),
  ponerEfectos: jest.fn(),
  ponerPreferencias: jest.fn(),
  recibirPasos: jest.fn(),
  resumenParaLaNotificacion: () => null,
  seguirCarrera: jest.fn(),
}));
jest.mock('../../servicios/calentarLaCarrera', () => ({ pedirCalentarElMapa: jest.fn(), ponerCuentaDeLaCarrera: jest.fn() }));
jest.mock('../../servicios/centroDelMapa', () => ({ olvidarCentroDelMapa: jest.fn(), prepararCentroDelMapa: async () => undefined }));
jest.mock('../../servicios/colaDeCarreras', () => ({ encolar: jest.fn(), procesarCola: async () => undefined }));
jest.mock('../../servicios/datosDeLaPersona', () => ({ leerDatosDeLaPersona: async () => ({ figura: 'neutral', pesoKg: 70 }) }));
jest.mock('../../servicios/notificacionDeCarrera', () => ({ mostrarNotificacionDeCarrera: jest.fn(), quitarNotificacionDeCarrera: async () => undefined }));
jest.mock('../../servicios/podometro', () => ({ escucharPasos: () => () => undefined, prepararPodometro: async () => false }));
jest.mock('../../servicios/vozDeLaCarrera', () => ({ efectoDeVoz: jest.fn() }));
jest.mock('../../servicios/tareaDeUbicacion', () => ({
  pedirPermisoDeUbicacion: async () => {
    mockLlamadas.push('permiso');
    return mockPermiso;
  },
  empezarGps: async () => {
    mockLlamadas.push('empezarGps');
    return true;
  },
  detenerGps: async () => undefined,
}));
jest.mock('../../servicios/guiaDeBateriaDeLaCarrera', () => ({
  guiaDeBateriaPendiente: async () => null,
  esperarElRegreso: async () => {
    mockLlamadas.push('regreso');
  },
}));
jest.mock('../../../alarmas/abrirGuiaDeLaMarca', () => ({
  abrirGuiaDeLaMarca: async () => {
    mockLlamadas.push('abrirGuia');
    return 'ajustes_de_la_app';
  },
}));
jest.mock('../CalentadorDelMapa', () => ({ CalentadorDelMapa: () => null }));
jest.mock('../CuentaRegresiva', () => ({ CuentaRegresiva: () => null }));
jest.mock('../PantallaDeCarrera', () => ({ PantallaCorriendo: () => null, PantallaTerminaste: () => null }));
jest.mock('../HojaGuiaDeBateria', () => ({
  HojaGuiaDeBateria: (p: { visible: boolean; alRevisar: () => void; alAhoraNo: () => void }) => {
    mockLlamadas.push(p.visible ? 'hoja-visible' : 'hoja-oculta');
    mockHoja.actual = p;
    return null;
  },
}));
const mockHoja: { actual: { visible: boolean; alRevisar: () => void; alAhoraNo: () => void } | null } = { actual: null };

import { TEXTOS_DE_LA_CARRERA } from '../../utils/textosDeLaCarrera';
import { pedirLaCarrera } from '../../servicios/pedidosDeLaCarrera';
import { AnfitrionDeLaCarrera } from '../AnfitrionDeLaCarrera';

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
const ponerSistema = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });

let mockRender: ReactTestRenderer | null = null;
async function empezar() {
  await act(async () => {
    mockRender = TestRenderer.create(React.createElement(AnfitrionDeLaCarrera));
  });
  await flush();
  await act(async () => pedirLaCarrera({ tipo: 'empezar', registroId: 'r1' }));
  await flush();
}

/** Spec 042 FR-047 a FR-049 (2026-11-16): el anfitrión de la carrera también corre en iPhone. */
describe('el anfitrión de la carrera en iPhone', () => {
  afterEach(() => {
    act(() => mockRender?.unmount());
    mockRender = null;
  });
  beforeEach(() => {
    mockLlamadas.length = 0;
    mockAlerta.mockClear();
    mockPermiso = 'concedido';
  });

  // spec 042 FR-047, FR-048
  it('en iOS, con permiso, la carrera arranca y se prende el GPS', async () => {
    ponerSistema('ios');
    await empezar();
    expect(mockLlamadas).toEqual(expect.arrayContaining(['permiso', 'empezarCarrera', 'empezarGps']));
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  // spec 042 FR-049
  it('en iOS, sin permiso, no arranca y el aviso dice dónde activar la ubicación', async () => {
    ponerSistema('ios');
    mockPermiso = 'denegado';
    await empezar();
    expect(mockLlamadas).not.toContain('empezarCarrera');
    expect(mockLlamadas).not.toContain('empezarGps');
    expect(mockAlerta).toHaveBeenCalledWith('Ubicación', TEXTOS_DE_LA_CARRERA.sinPermisoUbicacionIos);
    expect(TEXTOS_DE_LA_CARRERA.sinPermisoUbicacionIos).toMatch(/Ajustes/);
  });

  // spec 042 FR-049
  it('en Android, sin permiso, el aviso es el de siempre', async () => {
    ponerSistema('android');
    mockPermiso = 'denegado';
    await empezar();
    expect(mockAlerta).toHaveBeenCalledWith('Ubicación', TEXTOS_DE_LA_CARRERA.sinPermisoUbicacion);
  });

  // spec 042 FR-047
  it('en la web no monta nada: la carrera no se ofrece', async () => {
    ponerSistema('web');
    await empezar();
    expect(mockLlamadas).not.toContain('permiso');
  });
});
