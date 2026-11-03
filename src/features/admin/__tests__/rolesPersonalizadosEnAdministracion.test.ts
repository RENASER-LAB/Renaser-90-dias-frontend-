/**
 * Los roles personalizados en Administración (spec 002, fase 2, contrato `fase-2.md` §4.5): Equipo y roles y
 * Solicitudes ofrecen los roles de `GET /admin/roles-asignables` (con `rolPersonalizadoId` al asignar o aprobar; sin el
 * endpoint, los seis de siempre) y donde se muestra el rol de alguien se lee el nombre del personalizado. Hábitos del
 * programa NO cambia (decisión P3). Con `fetch` simulado.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: { guardarToken: jest.fn(async () => undefined), borrarToken: jest.fn(async () => undefined), leerToken: jest.fn(async () => null) },
}));
jest.mock('../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { setTokenSesion } from '../../../services/http/apiClient';
import { integrantesDelChat } from '../../chat/utils/infoDelChat';
import { aprobarSolicitud, cambiarRolDeUsuario, listarRolesAsignables, type OpcionDeRol } from '../api/adminApi';
import { SolicitudesAdminScreen } from '../screens/SolicitudesAdminScreen';
import {
  esLaOpcionDeLaPersona,
  esLaOpcionPorDefecto,
  etiquetaDeLaOpcion,
  etiquetaDeLaPersona,
  OPCIONES_BASE,
  opcionesDeRol,
  queImplicaLaOpcion,
} from '../utils/rolesAsignables';
import { personaDeStaff } from '../utils/staff';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Pedido = { url: string; method: string; body: unknown };
let pedidos: Pedido[] = [];
function servidor(responder: (p: Pedido) => { status: number; cuerpo?: unknown }) {
  pedidos = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (url: string, opciones: { method: string; body?: string }) => {
    const pedido: Pedido = { url, method: opciones.method, body: opciones.body ? JSON.parse(opciones.body) : undefined };
    pedidos.push(pedido);
    const { status, cuerpo } = responder(pedido);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
    };
  });
}
const ruta = (p: Pedido) => p.url.replace(/^https?:\/\/[^/]+/, '').replace(/^.*?(\/api\/v1)/, '$1');

const JUNIOR: OpcionDeRol = { clave: 'rp:r-1', nombre: 'Mentor junior', rolBase: 'MENTOR', rolPersonalizadoId: 'r-1' };

let raiz: ReactTestRenderer | null = null;
beforeEach(() => setTokenSesion('sesion-1'));
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('las opciones de rol (lógica pura)', () => {
  it('sin el endpoint, los seis; con él, los seis y debajo los personalizados (nunca Soporte TI)', () => {
    expect(opcionesDeRol(null).map(o => o.clave)).toEqual(['TRAINEE', 'TRAINEE_GUIDE', 'MENTOR', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']);
    const delServidor: OpcionDeRol[] = [
      { clave: 'TRAINEE', nombre: 'Aprendiz', rolBase: 'TRAINEE', rolPersonalizadoId: null },
      JUNIOR,
      { clave: 'rp:x', nombre: 'Raro', rolBase: 'IT_SUPPORT', rolPersonalizadoId: 'x' },
    ];
    expect(opcionesDeRol(delServidor).map(o => o.clave)).toEqual([...OPCIONES_BASE.map(o => o.clave), 'rp:r-1']);
  });

  it('el rol de una persona: el nombre del personalizado si tiene; cuál es su opción de hoy', () => {
    expect(etiquetaDeLaPersona('MENTOR', { id: 'r-1', nombre: 'Mentor junior' })).toBe('Mentor junior');
    expect(etiquetaDeLaPersona('MENTOR', null)).toBe('Mentor');
    const mentorBase = OPCIONES_BASE.find(o => o.clave === 'MENTOR')!;
    expect(esLaOpcionDeLaPersona(JUNIOR, { rol: 'MENTOR', rolPersonalizado: { id: 'r-1' } })).toBe(true);
    expect(esLaOpcionDeLaPersona(mentorBase, { rol: 'MENTOR', rolPersonalizado: { id: 'r-1' } })).toBe(false);
    expect(esLaOpcionDeLaPersona(mentorBase, { rol: 'MENTOR', rolPersonalizado: null })).toBe(true);
    expect(esLaOpcionPorDefecto(OPCIONES_BASE[0])).toBe(true);
    expect(esLaOpcionPorDefecto({ ...JUNIOR, rolBase: 'TRAINEE' })).toBe(false);
    expect(etiquetaDeLaOpcion(JUNIOR)).toBe('Mentor junior · hereda de Mentor');
    expect(queImplicaLaOpcion(JUNIOR)).toMatch(/^Hereda de Mentor, con solo las funcionalidades de «Mentor junior»\. Acompaña grupos/);
  });

  it('las listas y el chat leen el rol personalizado', () => {
    expect(personaDeStaff({ id: 'u-1', role: 'MENTOR', status: 'ACTIVE', fullName: 'Ana', rolPersonalizado: { id: 'r-1', nombre: 'Mentor junior' } }).rolPersonalizado).toEqual({ id: 'r-1', nombre: 'Mentor junior' });
    const [ana, beto] = integrantesDelChat({
      participantes: [
        { userId: 'u-1', nombre: 'Ana', rol: 'MENTOR', esUnoMismo: false, rolPersonalizado: { id: 'r-1', nombre: 'Mentor junior' } },
        { userId: 'u-2', nombre: 'Beto', rol: 'APRENDIZ', esUnoMismo: false },
      ],
      tipo: 'celula',
    });
    expect(ana.rol).toBe('Mentor junior');
    expect(beto.rol).toBe('Aprendiz');
  });
});

describe('la API', () => {
  it('asignar y aprobar con `rolPersonalizadoId`; sin él, el cuerpo de siempre', async () => {
    servidor(p => (ruta(p) === '/api/v1/admin/roles-asignables' ? { status: 200, cuerpo: [JUNIOR] } : { status: 200, cuerpo: {} }));
    await cambiarRolDeUsuario('u-1', 'MENTOR', 'r-1');
    expect(pedidos[0]).toMatchObject({ method: 'PATCH', body: { newRole: 'MENTOR', rolPersonalizadoId: 'r-1' } });
    await cambiarRolDeUsuario('u-1', 'MENTOR');
    expect(pedidos[1].body).toEqual({ newRole: 'MENTOR' });
    await aprobarSolicitud('s-1', 'MENTOR', 'r-1');
    expect(pedidos[2].body).toEqual({ role: 'MENTOR', rolPersonalizadoId: 'r-1' });
    await aprobarSolicitud('s-1');
    expect(pedidos[3].body).toBeUndefined();
    expect(await listarRolesAsignables()).toEqual([JUNIOR]);
  });
});

describe('Solicitudes con roles personalizados', () => {
  const SOLICITUD = { id: 's-1', fullName: 'Lucía Ramos', email: 'lucia@renaser.pe', status: 'PENDING' };
  async function montar(rolesAsignables: { status: number; cuerpo?: unknown }) {
    servidor(p => {
      const r = ruta(p);
      if (r.startsWith('/api/v1/admin/roles-asignables')) return rolesAsignables;
      if (r.startsWith('/api/v1/account-requests?') || r.startsWith('/api/v1/account-requests/?')) return { status: 200, cuerpo: { content: [SOLICITUD], total: 1, page: 0, size: 20 } };
      if (r.includes('/approve')) return { status: 200, cuerpo: {} };
      if (r.startsWith('/api/v1/admin/trainees')) return { status: 200, cuerpo: { content: [], total: 0, page: 0, size: 1 } };
      return { status: 200, cuerpo: { content: [SOLICITUD], total: 1, page: 0, size: 20 } };
    });
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(SolicitudesAdminScreen, { onVolver: jest.fn(), onIrAGrupos: jest.fn() }));
    });
    await act(async () => {
      await new Promise(r => setImmediate(r));
    });
  }
  const chips = () => raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function').map(n => n.props.accessibilityLabel as string);
  /** Spec 025: los roles se eligen en la hoja «Aceptar» de cada solicitud, no en chips sueltos sobre la tarjeta. */
  const abrirLaHoja = async () => {
    const [aceptar] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Aceptar a Lucía Ramos' && typeof n.props.onPress === 'function');
    await act(async () => {
      aceptar.props.onPress();
    });
  };

  it('ofrece los personalizados en la hoja y acepta con su id', async () => {
    await montar({ status: 200, cuerpo: [JUNIOR] });
    await abrirLaHoja();
    expect(chips()).toContain('Mentor junior · hereda de Mentor');
    const [junior] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Mentor junior · hereda de Mentor' && typeof n.props.onPress === 'function');
    await act(async () => {
      junior.props.onPress();
    });
    const [aceptar] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Aceptar' && typeof n.props.onPress === 'function');
    await act(async () => {
      aceptar.props.onPress();
    });
    await act(async () => {
      await new Promise(r => setImmediate(r));
    });
    const aprobacion = pedidos.find(p => ruta(p).includes('/approve'))!;
    expect(aprobacion.body).toEqual({ role: 'MENTOR', rolPersonalizadoId: 'r-1' });
    expect(raiz!.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''))).toContain('Lucía Ramos entró como Mentor junior.');
  });

  it('sin el endpoint (404), los seis de siempre', async () => {
    await montar({ status: 404, cuerpo: { message: 'No' } });
    await abrirLaHoja();
    expect([...new Set(chips())]).toEqual(['Aprendiz', 'Guía de aprendiz', 'Mentor', 'Líder de mentores', 'Administrador', 'Alquimista']);
  });
});

describe('Hábitos del programa no cambia (decisión P3)', () => {
  it('sigue con `GET /admin/habits/roles` y no lee los roles asignables', () => {
    const habitos = readFileSync(join(__dirname, '..', 'screens', 'HabitoProgramaFormScreen.tsx'), 'utf8');
    expect(habitos).not.toMatch(/useOpcionesDeRol|roles-asignables/);
  });
});
