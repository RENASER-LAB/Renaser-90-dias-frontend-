import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El Código Renaser de punta a punta dentro de la app, sin parpadeo (2026-10-19).
 *
 * Fallo visto en el emulador: el formulario (un `Modal` a pantalla completa) se abría al entrar a Hoy y
 * ~300 ms después, al llegar `GET /radar/latest` con la hora ya respondida, se cerraba. En Android eso
 * deja una ventana vacía y oscura sobre Hoy que ni «atrás» ni tocar quitan. Lo que se prueba acá es lo
 * que ve `CodigoRenaserOverlay`: el `visible` que recibe el `Modal` y la capa obligatoria que se anota.
 * El `Modal` real se reemplaza por una sonda que anota los `visible` de cada dibujo.
 */

const mockObtenerUltimo = jest.fn<() => Promise<string | null>>();
const mockRegistrar = jest.fn<(checkIn: unknown) => Promise<{ createdAt: string }>>();
jest.mock('../api/radarApi', () => ({
  obtenerUltimoCheckIn: () => mockObtenerUltimo(),
  registrarCheckIn: (checkIn: unknown) => mockRegistrar(checkIn),
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

type PropsDelModal = {
  visible: boolean;
  slot: { hora: number } | null;
  onEnviar: (checkIn: unknown) => Promise<boolean>;
  onCerrar: () => void;
};
const mockDibujosDelModal: PropsDelModal[] = [];
jest.mock('../components/CodigoRenaserModal', () => ({
  CodigoRenaserModal: (props: PropsDelModal) => {
    mockDibujosDelModal.push(props);
    return null;
  },
}));

import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  olvidarCapasObligatorias,
} from '../../../navigation/capasObligatorias';
import { ApiError } from '../../../services/http/apiClient';
import { CodigoRenaserOverlay } from '../components/CodigoRenaserOverlay';
import { RadarProvider } from '../RadarContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Lunes 19/10/2026 a la hora local indicada (la zona de las pruebas es America/Lima). */
const enHora = (hora: number, minuto = 0) => new Date(2026, 9, 19, hora, minuto, 0, 0);

const checkIn = {
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 5,
  whatAmIAvoiding: 'd',
};

function diferida<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

let raiz: ReactTestRenderer | null = null;
let capaAbiertaAlgunaVez = false;
let dejarDeEscuchar: (() => void) | null = null;

async function montar() {
  act(() => {
    raiz = TestRenderer.create(React.createElement(RadarProvider, null, React.createElement(CodigoRenaserOverlay)));
  });
  await vaciar(); // llega /home (el día de programa)
}

const visibles = () => mockDibujosDelModal.map(d => d.visible);
const ultimo = () => mockDibujosDelModal[mockDibujosDelModal.length - 1];

describe('Código Renaser: el formulario no se abre hasta saber si la hora ya se respondió', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'], now: enHora(10, 30) });
    mockObtenerUltimo.mockReset();
    mockRegistrar.mockReset();
    mockObtenerResumenHome.mockReset();
    mockObtenerResumenHome.mockResolvedValue({ inscrito: true, diaPrograma: 3 });
    mockDibujosDelModal.length = 0;
    olvidarCapasObligatorias();
    capaAbiertaAlgunaVez = false;
    dejarDeEscuchar = alCambiarLasCapasObligatorias(() => {
      if (hayCapaObligatoriaAbierta()) capaAbiertaAlgunaVez = true;
    });
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    dejarDeEscuchar?.();
    olvidarCapasObligatorias();
    jest.useRealTimers();
  });

  it('mientras /radar/latest no responde, el Modal no está visible ni se marca la capa obligatoria', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);

    await montar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(1);
    expect(mockDibujosDelModal.length).toBeGreaterThan(0);
    expect(visibles()).not.toContain(true);
    expect(hayCapaObligatoriaAbierta()).toBe(false);
  });

  it('si esa hora no estaba respondida, se abre recién cuando llega la lectura', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    await montar();
    expect(visibles()).not.toContain(true);

    await act(async () => lectura.resolver(null));

    expect(ultimo().visible).toBe(true);
    expect(ultimo().slot?.hora).toBe(10);
    expect(hayCapaObligatoriaAbierta()).toBe(true);
  });

  it('con la hora ya respondida (otro teléfono) el Modal no se abre NUNCA, ni un cuadro', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    await montar();

    await act(async () => lectura.resolver(enHora(10, 5).toISOString()));

    expect(visibles()).not.toContain(true);
    expect(capaAbiertaAlgunaVez).toBe(false);
    expect(hayCapaObligatoriaAbierta()).toBe(false);
  });

  it('si la lectura falla por la red, se abre igual (sin haber parpadeado antes)', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await montar();
    expect(visibles()).not.toContain(true);

    await act(async () => lectura.rechazar(new ApiError(0, 'Sin conexión')));

    expect(ultimo().visible).toBe(true);
    expect(visibles().filter((v, i, todos) => v !== todos[i - 1])).toEqual([false, true]);
    aviso.mockRestore();
  });

  it('un 403 lo apaga: no se abre ni se marca la capa', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    await montar();

    await act(async () => lectura.rechazar(new ApiError(403, 'Prohibido')));

    expect(visibles()).not.toContain(true);
    expect(capaAbiertaAlgunaVez).toBe(false);
  });

  it('un 409 al registrar, con /radar/latest en esta hora, se da por registrado y el formulario se cierra', async () => {
    mockObtenerUltimo.mockResolvedValueOnce(null);
    await montar();
    await vaciar();
    expect(ultimo().visible).toBe(true);
    expect(hayCapaObligatoriaAbierta()).toBe(true);

    mockRegistrar.mockRejectedValueOnce(new ApiError(409, 'La operacion entra en conflicto con datos que ya existen'));
    mockObtenerUltimo.mockResolvedValueOnce(enHora(10, 12).toISOString());
    let ok = false;
    await act(async () => {
      ok = await ultimo().onEnviar(checkIn);
    });

    expect(ok).toBe(true);
    expect(ultimo().visible).toBe(false);
    expect(hayCapaObligatoriaAbierta()).toBe(false);
  });
});
