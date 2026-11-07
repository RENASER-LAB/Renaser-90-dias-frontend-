import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLlamadas: string[] = [];
let mockLinea: string | null = 'Línea de la marca.';
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Ana Pérez' } }) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: jest.fn() }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));
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
    return 'denegado';
  },
  empezarGps: async () => true,
  detenerGps: async () => undefined,
}));
jest.mock('../../servicios/guiaDeBateriaDeLaCarrera', () => ({
  guiaDeBateriaPendiente: async () => mockLinea,
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

import { pedirLaCarrera } from '../../servicios/pedidosDeLaCarrera';
import { AnfitrionDeLaCarrera } from '../AnfitrionDeLaCarrera';

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

let mockRender: ReactTestRenderer | null = null;
async function empezar() {
  await act(async () => {
    mockRender = TestRenderer.create(React.createElement(AnfitrionDeLaCarrera));
  });
  await flush();
  await act(async () => pedirLaCarrera({ tipo: 'empezar', registroId: 'r1' }));
  await flush();
}

describe('el anfitrión de la carrera y la guía de batería', () => {
  afterEach(() => {
    act(() => mockRender?.unmount());
    mockRender = null;
  });
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    mockLlamadas.length = 0;
    mockLinea = 'Línea de la marca.';
    mockHoja.actual = null;
  });

  it('muestra la hoja ANTES de pedir la ubicación y espera la decisión', async () => {
    await empezar();
    expect(mockHoja.actual?.visible).toBe(true);
    expect(mockLlamadas).not.toContain('permiso');
  });

  it('«Revisar» abre la guía, espera el regreso y sigue a la ubicación', async () => {
    await empezar();
    await act(async () => mockHoja.actual!.alRevisar());
    await flush();
    const i = (x: string) => mockLlamadas.indexOf(x);
    expect(i('abrirGuia')).toBeGreaterThan(-1);
    expect(i('regreso')).toBeGreaterThan(i('abrirGuia'));
    expect(i('permiso')).toBeGreaterThan(i('regreso'));
    expect(mockHoja.actual?.visible).toBe(false);
  });

  it('«Ahora no» (y cerrar la hoja) sigue de inmediato, sin abrir la guía', async () => {
    await empezar();
    await act(async () => mockHoja.actual!.alAhoraNo());
    await flush();
    expect(mockLlamadas).toContain('permiso');
    expect(mockLlamadas).not.toContain('abrirGuia');
  });

  it('si no corresponde (otra marca, ya mostrada, web), sigue directo a la ubicación', async () => {
    mockLinea = null;
    await empezar();
    expect(mockLlamadas).toContain('permiso');
    expect(mockLlamadas).not.toContain('hoja-visible');
  });
});
