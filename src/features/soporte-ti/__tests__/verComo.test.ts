/**
 * «Ver como» (spec 002, fase 2, US5; contrato `fase-2.md` §5; decisiones P2 y P4 del dueño): la sesión de Soporte TI
 * se guarda aparte, la app entra con el `X-Auth-Token` de la cuenta de prueba, la franja dice «Viendo como Mentor ·
 * Salir», un 403 `MODO_SOLO_LECTURA` se dice en línea sin diálogo y **salir siempre funciona**, aun sin red. Con el
 * `AuthProvider` de verdad y la red simulada (el backend de «ver como» llega en otra tanda).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, Alert as AlertNativo, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockGuardado = new Map<string, string>();
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async (t: string) => void mockGuardado.set('token', t)),
    leerToken: jest.fn(async () => mockGuardado.get('token') ?? null),
    borrarToken: jest.fn(async () => void mockGuardado.delete('token')),
    guardarDato: jest.fn(async (c: string, v: string) => void mockGuardado.set(c, v)),
    leerDato: jest.fn(async (c: string) => mockGuardado.get(c) ?? null),
    borrarDato: jest.fn(async (c: string) => void mockGuardado.delete(c)),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const insets = { top: 24, bottom: 0, left: 0, right: 0 };
  return { SafeAreaView: View, useSafeAreaInsets: () => insets, SafeAreaInsetsContext: React.createContext(insets) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../onboarding/api/onboardingApi', () => ({ obtenerEstado: jest.fn(async () => ({ completed: true })) }));
jest.mock('../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: jest.fn(async () => ({})) }));
jest.mock('../../chat/tiempoReal/conexionStomp', () => ({ conexionChat: { cerrarTodo: jest.fn() } }));
jest.mock('../../alarmas/alarmasDeLaCuenta', () => ({
  prepararAlarmasPara: jest.fn(async () => undefined),
  soltarAlarmasDeLaCuenta: jest.fn(async () => undefined),
}));
jest.mock('../../mentor/notificaciones/pushNativo', () => ({
  registrarTokenPushNativo: jest.fn(async () => undefined),
  escucharRotacionDeToken: jest.fn(() => () => undefined),
  olvidarTokenPushRegistrado: jest.fn(async () => undefined),
}));
jest.mock('../../mentor/notificaciones/rutaDeAviso', () => ({
  escucharAperturaDeAviso: jest.fn(() => () => undefined),
  olvidarRutaPendiente: jest.fn(),
}));
jest.mock('../../auth/api/googleAuth', () => ({ loginConGoogle: jest.fn() }));
jest.mock('../../../navigation/navegacionRef', () => ({ irAPestana: jest.fn(() => true), pestanaDisponible: jest.fn(() => true) }));

import { Alert } from '../../../components/Alerta';
import {
  apiFetch,
  enModoSoloLectura,
  getTokenSesion,
  notificarModoSoloLectura,
  ponerModoSoloLectura,
  setTokenSesion,
  suscribirModoSoloLectura,
} from '../../../services/http/apiClient';
import { marcarConversacionLeida } from '../../chat/api/chatApi';
import { olvidarErroresSinDialogo } from '../../../services/http/erroresSinDialogo';
import { AuthProvider, useAuth } from '../../auth/context/AuthContext';
import { registrarTokenPushNativo } from '../../mentor/notificaciones/pushNativo';
import type { RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { abrirConsola, cerrarConsola } from '../estado/sesionDeConsola';
import { opcionesDeVerComo, VerComoConsolaScreen } from '../screens/VerComoConsolaScreen';
import { FranjaVerComo, TEXTO_SOLO_LECTURA } from '../verComo/FranjaVerComo';
import { tomarPestanaAlMontar } from '../../../navigation/pestanaAlMontar';
import { reiniciarVerComoEnMemoria } from '../verComo/sesionVerComo';
import { abrirSesionDePrueba, cerrarSesionDePrueba } from '../verComo/verComoApi';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------------------------------------------------
// Servidor de mentira: `/auth/me` responde según la sesión que llega.
// ---------------------------------------------------------------------------------------------------------------------

type Pedido = { url: string; method: string; headers: Record<string, string>; body: unknown };
let pedidos: Pedido[] = [];
let sinRed = false;
let verComoResponde: { status: number; token?: string | null } = { status: 200, token: 'tok-prueba' };
let meDeLaPrueba: { status: number } = { status: 200 };
/** Lo que responde cualquier otra escritura con la sesión de prueba (D-273: 403 MODO_SOLO_LECTURA). */
const SOLO_LECTURA = { message: 'Estás viendo la app como otro rol: no se puede cambiar nada.', codigo: 'MODO_SOLO_LECTURA' };

const SOPORTE = { id: 'u-ti', email: 'ti@renaser.pe', role: 'IT_SUPPORT', status: 'ACTIVE', fullName: 'Ricardo TI', avatarUrl: null };
const PRUEBA = { id: 'u-prueba-mentor', email: 'ver-como+mentor@renaser.invalid', role: 'MENTOR', status: 'ACTIVE', fullName: 'Prueba · Mentor', avatarUrl: null };

const ruta = (p: Pedido) => p.url.replace(/^https?:\/\/[^/]+/, '').replace(/^.*?(\/api\/v1)/, '$1');

function instalarServidor() {
  pedidos = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (url: string, opciones: { method: string; headers: Record<string, string>; body?: string }) => {
    const pedido: Pedido = { url, method: opciones.method, headers: opciones.headers, body: opciones.body ? JSON.parse(opciones.body) : undefined };
    pedidos.push(pedido);
    if (sinRed) throw new TypeError('Network request failed');
    const r = ruta(pedido);
    const sesion = opciones.headers['X-Auth-Token'];
    let status = 200;
    let cuerpo: unknown = {};
    const cabeceras: Record<string, string> = {};
    if (r === '/api/v1/auth/me') {
      if (sesion === 'tok-prueba') {
        status = meDeLaPrueba.status;
        cuerpo = status === 200 ? PRUEBA : { message: 'No' };
      } else if (sesion === 'tok-soporte') cuerpo = SOPORTE;
      else status = 401;
    } else if (r === '/api/v1/soporte-ti/ver-como' && pedido.method === 'POST') {
      status = verComoResponde.status;
      cuerpo = status === 200 ? { cuenta: { id: PRUEBA.id, nombre: PRUEBA.fullName, rol: 'MENTOR', rolPersonalizado: null }, venceEn: null } : { message: 'No' };
      if (status === 200 && verComoResponde.token) cabeceras['X-Auth-Token'] = verComoResponde.token;
    } else if (r === '/api/v1/soporte-ti/ver-como' && pedido.method === 'DELETE') {
      status = 204;
      cuerpo = undefined;
      // D-273: la respuesta trae `X-Auth-Token` vacío; no es una sesión nueva.
      cabeceras['X-Auth-Token'] = '';
    } else if (r === '/api/v1/vencida') {
      status = 401;
      cuerpo = { codigo: 'VER_COMO_VENCIDO', message: 'Se terminó el tiempo de «ver como».' };
    } else if (pedido.method !== 'GET' && sesion === 'tok-prueba') {
      status = 403;
      cuerpo = SOLO_LECTURA;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (n: string) => cabeceras[n] ?? null },
      text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
    };
  });
}

type Sesion = ReturnType<typeof useAuth>;
let raiz: ReactTestRenderer | null = null;

async function montarApp(): Promise<() => Sesion> {
  let actual!: Sesion;
  function Sonda() {
    actual = useAuth();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(AuthProvider, null, React.createElement(Sonda), React.createElement(FranjaVerComo)));
  });
  await act(async () => {
    await new Promise(r => setImmediate(r));
  });
  return () => actual;
}

const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));

beforeEach(() => {
  mockGuardado.clear();
  mockGuardado.set('token', 'tok-soporte');
  sinRed = false;
  verComoResponde = { status: 200, token: 'tok-prueba' };
  meDeLaPrueba = { status: 200 };
  reiniciarVerComoEnMemoria();
  olvidarErroresSinDialogo();
  cerrarConsola();
  abrirConsola('tok-consola');
  setTokenSesion(null);
  ponerModoSoloLectura(false);
  mockGuardado.set('token', 'tok-soporte');
  instalarServidor();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('la API de «ver como»', () => {
  it('abre la sesión de prueba sin tocar la de la app y la cierra con la de prueba', async () => {
    setTokenSesion('tok-soporte');
    const prueba = await abrirSesionDePrueba({ rol: 'MENTOR' });
    expect(prueba.token).toBe('tok-prueba');
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(pedidos[0]).toMatchObject({ method: 'POST', body: { rol: 'MENTOR' } });
    expect(pedidos[0].headers['X-Consola-Token']).toBe('tok-consola');

    await cerrarSesionDePrueba('tok-prueba');
    expect(pedidos[1].method).toBe('DELETE');
    expect(pedidos[1].headers['X-Auth-Token']).toBe('tok-prueba');
    expect(getTokenSesion()).toBe('tok-soporte');

    sinRed = true;
    await expect(cerrarSesionDePrueba('tok-prueba')).resolves.toBeUndefined();
  });

  it('un rol personalizado va por su id; sin la cabecera de sesión es un error', async () => {
    setTokenSesion('tok-soporte');
    await abrirSesionDePrueba({ rolPersonalizadoId: 'r-1' });
    expect(pedidos[0].body).toEqual({ rolPersonalizadoId: 'r-1' });
    verComoResponde = { status: 200, token: null };
    await expect(abrirSesionDePrueba({ rol: 'MENTOR' })).rejects.toThrow(/sesión/);
  });
});

describe('entrar y salir (AuthProvider de verdad)', () => {
  it('entra con la sesión de prueba, guarda aparte la de Soporte TI y muestra la franja', async () => {
    const sesion = await montarApp();
    expect(sesion().user?.id).toBe('u-ti');
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    expect(getTokenSesion()).toBe('tok-prueba');
    expect(sesion().user?.id).toBe('u-prueba-mentor');
    expect(sesion().verComo).toEqual({ etiqueta: 'Mentor', venceEn: null });
    expect(JSON.parse(mockGuardado.get('renaser.sesion.verComo')!)).toMatchObject({ tokenSoporte: 'tok-soporte', tokenDePrueba: 'tok-prueba' });
    expect(textos()).toEqual(expect.arrayContaining(['Viendo como Mentor', 'Salir']));
    // En solo lectura no se registra el push para la cuenta de prueba.
    const registros = (registrarTokenPushNativo as jest.Mock).mock.calls.length;
    expect(registros).toBe(1);
  });

  it('salir funciona sin red: restaura la sesión y el perfil de Soporte TI, y vuelve a la consola', async () => {
    const sesion = await montarApp();
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    sinRed = true;
    const [salir] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Salir de ver como Mentor' && typeof n.props.onPress === 'function');
    await act(async () => {
      salir.props.onPress();
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(sesion().user?.id).toBe('u-ti');
    expect(sesion().verComo).toBeNull();
    expect(mockGuardado.has('renaser.sesion.verComo')).toBe(false);
    expect(pedidos.some(p => p.method === 'DELETE' && p.headers['X-Auth-Token'] === 'tok-prueba')).toBe(true);
    expect(textos()).not.toContain('Viendo como Mentor');
    // Las pestañas de Soporte TI se arman de nuevo y arrancan en Yo con la consola: el pedido queda para ellas.
    expect(tomarPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
  });

  it('si no se puede leer la cuenta de prueba, todo queda como estaba', async () => {
    const sesion = await montarApp();
    meDeLaPrueba = { status: 500 };
    await act(async () => {
      await expect(sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor')).rejects.toBeTruthy();
    });
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(sesion().user?.id).toBe('u-ti');
    expect(sesion().verComo).toBeNull();
  });

  it('el servidor sin «ver como» (404) no cambia nada', async () => {
    const sesion = await montarApp();
    verComoResponde = { status: 404 };
    await act(async () => {
      await expect(sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor')).rejects.toBeTruthy();
    });
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(sesion().verComo).toBeNull();
  });

  it('si vence la sesión de prueba (401), vuelve a Soporte TI y no al login', async () => {
    const sesion = await montarApp();
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    const { apiFetch } = jest.requireActual<typeof import('../../../services/http/apiClient')>('../../../services/http/apiClient');
    // La sesión de prueba ya no existe en el servidor: `/auth/me` con ella responde 401.
    setTokenSesion('tok-vencida');
    await act(async () => {
      await apiFetch('/api/v1/auth/me').catch(() => undefined);
      await new Promise(r => setTimeout(r, 20));
    });
    expect(sesion().user?.id).toBe('u-ti');
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(sesion().verComo).toBeNull();
  });

  it('al abrir la app con «ver como» guardado, vuelve a la sesión de Soporte TI y cierra la de prueba', async () => {
    mockGuardado.set('token', 'tok-prueba');
    mockGuardado.set(
      'renaser.sesion.verComo',
      JSON.stringify({
        tokenSoporte: 'tok-soporte',
        tokenDePrueba: 'tok-prueba',
        etiqueta: 'Mentor',
        venceEn: null,
        usuarioSoporte: { id: 'u-ti', name: 'Ricardo TI', email: 'ti@renaser.pe', role: 'IT_SUPPORT', status: 'ACTIVE', avatarUrl: null },
      }),
    );
    const sesion = await montarApp();
    expect(sesion().user?.id).toBe('u-ti');
    expect(sesion().verComo).toBeNull();
    expect(getTokenSesion()).toBe('tok-soporte');
    expect(mockGuardado.has('renaser.sesion.verComo')).toBe(false);
    expect(pedidos.some(p => p.method === 'DELETE' && p.headers['X-Auth-Token'] === 'tok-prueba')).toBe(true);
  });

  it('un 403 MODO_SOLO_LECTURA se dice en la franja, sin diálogo', async () => {
    const sesion = await montarApp();
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    await act(async () => {
      notificarModoSoloLectura({ codigo: 'MODO_SOLO_LECTURA', message: 'Estás viendo la app como otro rol: no se puede cambiar nada.' });
    });
    Alert.alert('No se pudo guardar', 'Estás viendo la app como otro rol: no se puede cambiar nada.');
    expect(nativo).not.toHaveBeenCalled();
    expect(textos()).toContain(TEXTO_SOLO_LECTURA);
    // El bloque de la franja es `accessible`: Android (y Maestro) solo leen su etiqueta, que tiene que decir el aviso.
    const etiquetas = raiz!.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel as string);
    expect(etiquetas).toContain(`Viendo como Mentor. ${TEXTO_SOLO_LECTURA}`);
  });
});

describe('el contrato final de «ver como» (D-273)', () => {
  it('en solo lectura las escrituras de fondo no salen; las de la persona sí, y su 403 llega a la franja', async () => {
    const sesion = await montarApp();
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    expect(enModoSoloLectura()).toBe(true);
    const antes = pedidos.length;
    await marcarConversacionLeida('c-1');
    expect(pedidos.length).toBe(antes);
    const mensajes: (string | null)[] = [];
    const baja = suscribirModoSoloLectura(m => mensajes.push(m));
    await apiFetch('/api/v1/wall', { method: 'POST', body: {} }).catch(() => undefined);
    baja();
    expect(mensajes).toEqual([SOLO_LECTURA.message]);
    // Salir apaga el modo y no toma el `X-Auth-Token` vacío de la respuesta del DELETE como sesión.
    await act(async () => {
      await sesion().salirDeVerComo();
    });
    expect(enModoSoloLectura()).toBe(false);
    expect(getTokenSesion()).toBe('tok-soporte');
  });

  it('un 403 MODO_SOLO_LECTURA de una escritura de fondo es silencioso', async () => {
    setTokenSesion('tok-prueba');
    const mensajes: (string | null)[] = [];
    const baja = suscribirModoSoloLectura(m => mensajes.push(m));
    await apiFetch('/api/v1/chat/conversations/c-1/read', { method: 'POST', deFondo: true }).catch(() => undefined);
    baja();
    expect(mensajes).toEqual([]);
  });

  it('un 401 VER_COMO_VENCIDO vuelve a Soporte TI, sin diálogo de sesión vencida', async () => {
    const sesion = await montarApp();
    await act(async () => {
      await sesion().entrarAVerComo({ rol: 'MENTOR' }, 'Mentor');
    });
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    let error: unknown;
    await act(async () => {
      error = await apiFetch('/api/v1/vencida').catch(e => e);
      await new Promise(r => setTimeout(r, 20));
    });
    Alert.alert('No se pudo cargar', (error as Error).message);
    expect(nativo).not.toHaveBeenCalled();
    expect(sesion().user?.id).toBe('u-ti');
    expect(sesion().verComo).toBeNull();
    expect(getTokenSesion()).toBe('tok-soporte');
  });

  it('el ERROR de un SEND en solo lectura no es una caída de la conexión', () => {
    // La conexión está simulada arriba (`conexionChat`); la función se toma del módulo real.
    const { esRechazoDeSoloLectura } = jest.requireActual<typeof import('../../chat/tiempoReal/conexionStomp')>('../../chat/tiempoReal/conexionStomp');
    expect(esRechazoDeSoloLectura({ comando: 'ERROR', cabeceras: { message: 'MODO_SOLO_LECTURA: no se puede enviar' }, cuerpo: '' })).toBe(true);
    expect(esRechazoDeSoloLectura({ comando: 'ERROR', cabeceras: { message: 'Sin permiso' }, cuerpo: '' })).toBe(false);
    expect(esRechazoDeSoloLectura({ comando: 'MESSAGE', cabeceras: { message: 'MODO_SOLO_LECTURA:' }, cuerpo: '' })).toBe(false);
  });
});

describe('la pantalla «Ver como» de la consola', () => {
  const rp = (parcial: Partial<RolPersonalizadoConsola>): RolPersonalizadoConsola => ({ id: 'r-1', nombre: 'Mentor junior', rolBase: 'MENTOR', activo: true, ...parcial });

  it('los seis roles base (sin Soporte TI) y los personalizados activos', () => {
    const { base, personalizados } = opcionesDeVerComo([rp({}), rp({ id: 'r-2', nombre: 'Viejo', activo: false })]);
    expect(base.map(o => o.titulo)).toEqual(['Aprendiz', 'Guía de aprendiz', 'Mentor', 'Líder de mentores', 'Administrador', 'Alquimista']);
    expect(base.every(o => 'rol' in o.eleccion && o.eleccion.rol !== 'IT_SUPPORT')).toBe(true);
    expect(personalizados).toEqual([{ clave: 'rp:r-1', titulo: 'Mentor junior', detalle: 'Hereda de Mentor', eleccion: { rolPersonalizadoId: 'r-1' } }]);
  });

  it('elegir un rol entra; un 404 avisa que el servidor todavía no lo tiene', async () => {
    const sesion = await montarApp();
    act(() => raiz?.unmount());
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    let actual!: Sesion;
    function Pantalla() {
      actual = useAuth();
      return actual.verComo ? null : React.createElement(VerComoConsolaScreen, { roles: [rp({})], onBloqueada: jest.fn(), onVolver: jest.fn() });
    }
    void sesion;
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(AuthProvider, null, React.createElement(Pantalla)));
    });
    await act(async () => {
      await new Promise(r => setImmediate(r));
    });
    verComoResponde = { status: 404 };
    const [mentor] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Ver como Mentor' && typeof n.props.onPress === 'function');
    await act(async () => {
      mentor.props.onPress();
    });
    expect(alerta.mock.calls.at(-1)?.[0]).toBe('Todavía no está disponible');
    // Con un rol personalizado, el 404 es que ese rol ya no existe.
    const [juniorBorrado] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Ver como Mentor junior' && typeof n.props.onPress === 'function');
    await act(async () => {
      juniorBorrado.props.onPress();
    });
    expect(alerta.mock.calls.at(-1)?.[0]).toBe('Ese rol ya no existe');

    verComoResponde = { status: 200, token: 'tok-prueba' };
    const [junior] = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Ver como Mentor junior' && typeof n.props.onPress === 'function');
    await act(async () => {
      junior.props.onPress();
    });
    expect(pedidos.filter(p => p.method === 'POST').at(-1)!.body).toEqual({ rolPersonalizadoId: 'r-1' });
    expect(actual.verComo?.etiqueta).toBe('Mentor junior');
  });
});
