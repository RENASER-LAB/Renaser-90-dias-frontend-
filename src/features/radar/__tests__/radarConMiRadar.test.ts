import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Mi Radar dentro de `RadarProvider` (spec 012).
 *
 * - **Los días 1 a 7 no cambian en nada**: no se pide Mi Radar y los avisos se sincronizan como siempre.
 * - **Desde el día 8 Hoy no muestra nada del Radar** (ni se lee `/radar/latest`, ni se abre el formulario, ni se
 *   marca la capa obligatoria), con Mi Radar encendido o apagado.
 * - Mi Radar se lee una vez y de ahí salen los avisos del teléfono; si no se pudo leer, no se toca lo programado.
 */

const mockObtenerUltimo = jest.fn<() => Promise<string | null>>();
const mockRegistrar = jest.fn<(c: unknown) => Promise<{ createdAt: string }>>();
const mockObtenerMiRadar = jest.fn<() => Promise<{ encendido: boolean; horas: number[]; dias?: Array<{ dia: number; horas: number[] }> }>>();
const mockGuardarMiRadar = jest.fn<(c: { encendido: boolean; horas: number[] }) => Promise<{ encendido: boolean; horas: number[] }>>();
jest.mock('../api/radarApi', () => ({
  obtenerUltimoCheckIn: () => mockObtenerUltimo(),
  registrarCheckIn: (c: unknown) => mockRegistrar(c),
  obtenerMiRadar: () => mockObtenerMiRadar(),
  guardarMiRadar: (c: { encendido: boolean; horas: number[] }) => mockGuardarMiRadar(c),
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
jest.mock('../../mapa-renacimiento/MapaRenacimientoContext', () => {
  const mapa = { abierto: false };
  return { useMapaRenacimientoAbierto: () => mapa };
});
const mockSincronizar = jest.fn<(dia: number | null, miRadar: unknown, usuarioId: string | null) => Promise<void>>();
jest.mock('../notificaciones/recordatoriosDeRadar', () => ({
  sincronizarRecordatoriosDeRadar: (dia: number | null, miRadar: unknown, usuarioId: string | null) =>
    mockSincronizar(dia, miRadar, usuarioId),
}));

type PropsDelModal = { visible: boolean; slot: unknown };
const mockDibujosDelModal: PropsDelModal[] = [];
jest.mock('../components/CodigoRenaserModal', () => ({
  CodigoRenaserModal: (props: PropsDelModal) => {
    mockDibujosDelModal.push(props);
    return null;
  },
}));

import { hayCapaObligatoriaAbierta, olvidarCapasObligatorias } from '../../../navigation/capasObligatorias';
import { ApiError } from '../../../services/http/apiClient';
import { CodigoRenaserOverlay } from '../components/CodigoRenaserOverlay';
import { RadarProvider, useRadar } from '../RadarContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Martes 20/10/2026 a la hora local indicada (la zona de las pruebas es America/Lima). */
const enHora = (hora: number, minuto = 0) => new Date(2026, 9, 20, hora, minuto, 0, 0);

let raiz: ReactTestRenderer | null = null;
let visto: ReturnType<typeof useRadar>;

function Sonda() {
  visto = useRadar();
  return null;
}

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

async function montar() {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(RadarProvider, null, React.createElement(CodigoRenaserOverlay), React.createElement(Sonda)),
    );
  });
  await vaciar(); // llega /home
  await vaciar(); // y, desde el día 8, Mi Radar
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate'], now: enHora(10, 30) });
  for (const m of [mockObtenerUltimo, mockRegistrar, mockObtenerMiRadar, mockGuardarMiRadar, mockObtenerResumenHome, mockSincronizar]) {
    m.mockReset();
  }
  mockSincronizar.mockResolvedValue(undefined);
  mockObtenerUltimo.mockResolvedValue(null);
  mockDibujosDelModal.length = 0;
  olvidarCapasObligatorias();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('días 1 a 7: sin ningún cambio', () => {
  it('no se pide Mi Radar y los avisos se sincronizan con el día, sin Mi Radar', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 3 });
    await montar();
    expect(mockObtenerMiRadar).not.toHaveBeenCalled();
    expect(mockSincronizar).toHaveBeenCalledWith(3, null, 'u1');
    expect(visto.miRadar.lectura.estado).toBe('pendiente');
    // Y el Código Renaser de la semana 1 sigue pidiendo lo de siempre.
    expect(mockObtenerUltimo).toHaveBeenCalledTimes(1);
    expect(visto.estado.tipo).toBe('abierto');
  });
});

describe('desde el día 8, Hoy no muestra nada del Radar', () => {
  it.each([8, 9, 90])('el día %i, con Mi Radar encendido: no se lee /latest, no hay formulario ni capa obligatoria', async dia => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: dia });
    mockObtenerMiRadar.mockResolvedValue({ encendido: true, horas: [10, 14] });
    await montar();
    expect(visto.estado).toEqual({ tipo: 'apagado', motivo: 'etapa-terminada' });
    expect(visto.slot).toBeNull();
    expect(visto.abierto).toBe(false);
    expect(mockObtenerUltimo).not.toHaveBeenCalled();
    expect(mockDibujosDelModal.map(d => d.visible)).not.toContain(true);
    expect(hayCapaObligatoriaAbierta()).toBe(false);
  });

  it('y con Mi Radar apagado, igual', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 10 });
    mockObtenerMiRadar.mockResolvedValue({ encendido: false, horas: [] });
    await montar();
    expect(visto.estado).toEqual({ tipo: 'apagado', motivo: 'etapa-terminada' });
    expect(mockObtenerUltimo).not.toHaveBeenCalled();
    expect(mockDibujosDelModal.map(d => d.visible)).not.toContain(true);
  });
});

describe('Mi Radar y los avisos', () => {
  it('desde el día 8 se lee una vez y de ahí salen los avisos', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 8 });
    mockObtenerMiRadar.mockResolvedValue({ encendido: true, horas: [9, 14, 20] });
    await montar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(1);
    expect(visto.miRadar.lectura).toEqual({ estado: 'lista', config: { encendido: true, horas: [9, 14, 20] } });
    expect(mockSincronizar).toHaveBeenLastCalledWith(8, { encendido: true, horas: [9, 14, 20] }, 'u1');
  });

  it('mientras se lee no se toca lo programado', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 8 });
    let resolver!: (m: { encendido: boolean; horas: number[] }) => void;
    mockObtenerMiRadar.mockReturnValue(new Promise(r => (resolver = r)));
    await montar();
    expect(mockSincronizar).not.toHaveBeenCalled();
    await act(async () => resolver({ encendido: false, horas: [] }));
    await vaciar();
    expect(mockSincronizar).toHaveBeenLastCalledWith(8, { encendido: false, horas: [] }, 'u1');
  });

  it('un 404 (backend anterior) es «no hay Mi Radar»: la fila no aparece y no suena ningún aviso de Mi Radar', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 8 });
    mockObtenerMiRadar.mockRejectedValue(new ApiError(404, 'no encontrado'));
    await montar();
    expect(visto.miRadar.lectura.estado).toBe('no-disponible');
    expect(mockSincronizar).toHaveBeenLastCalledWith(8, null, 'u1');
  });

  it('una red caída no apaga los avisos: no se sabe, no se toca', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 8 });
    mockObtenerMiRadar.mockRejectedValue(new ApiError(0, 'sin red'));
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await montar();
    expect(visto.miRadar.lectura.estado).toBe('fallo');
    expect(mockSincronizar).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('guardar deja a la vista lo que respondió el servidor y reprograma los avisos con eso', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 9 });
    mockObtenerMiRadar.mockResolvedValue({ encendido: false, horas: [] });
    await montar();
    mockGuardarMiRadar.mockResolvedValue({ encendido: true, horas: [9, 14, 20] });
    await act(async () => {
      await visto.miRadar.guardar({ encendido: true, horas: [9, 14, 20] });
    });
    expect(mockGuardarMiRadar).toHaveBeenCalledWith({ encendido: true, horas: [9, 14, 20] });
    expect(visto.miRadar.lectura).toEqual({ estado: 'lista', config: { encendido: true, horas: [9, 14, 20] } });
    expect(mockSincronizar).toHaveBeenLastCalledWith(9, { encendido: true, horas: [9, 14, 20] }, 'u1');
  });

  it('con días que van distinto, los avisos se programan con ellos; cambiar solo un día los reprograma', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 9 });
    const conSabado = { encendido: true, horas: [9, 14], dias: [{ dia: 6, horas: [11] }] };
    mockObtenerMiRadar.mockResolvedValue(conSabado);
    await montar();
    expect(mockSincronizar).toHaveBeenLastCalledWith(9, conSabado, 'u1');
    const llamadas = mockSincronizar.mock.calls.length;
    // Las mismas horas de todos los días, pero el sábado cambia: es otra huella, hay que reprogramar.
    const conOtroSabado = { encendido: true, horas: [9, 14], dias: [{ dia: 6, horas: [12] }] };
    mockObtenerMiRadar.mockResolvedValue(conOtroSabado);
    act(() => visto.miRadar.recargar());
    await vaciar();
    expect(mockSincronizar.mock.calls.length).toBe(llamadas + 1);
    expect(mockSincronizar).toHaveBeenLastCalledWith(9, conOtroSabado, 'u1');
  });

  it('releer lo mismo no reprograma los avisos', async () => {
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 9 });
    mockObtenerMiRadar.mockResolvedValue({ encendido: true, horas: [9] });
    await montar();
    const llamadas = mockSincronizar.mock.calls.length;
    act(() => visto.miRadar.recargar());
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(2);
    expect(mockSincronizar.mock.calls.length).toBe(llamadas);
  });
});
