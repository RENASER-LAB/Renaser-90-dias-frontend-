/**
 * Los roles personalizados en la consola Soporte TI (spec 002, fase 2, US7; contrato `fase-2.md` §4): el árbol de
 * funcionalidades de la base (marcar una madre marca a sus hijas), las reglas del nombre y del tope de 20, crear,
 * editar, desactivar, reemplazar en bloque y borrar (409 con personas → ofrece reemplazar). Con `fetch` simulado.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, Alert as AlertNativo, Text, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined },
}));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { setTokenSesion } from '../../../services/http/apiClient';
import { borrarRol, crearRol, desbloquear, editarRol, listarRoles, reemplazarRol } from '../api/soporteTiApi';
import type { FuncionalidadConsola, RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import { cerrarConsola } from '../estado/sesionDeConsola';
import { RolConsolaScreen } from '../screens/RolConsolaScreen';
import { RolesConsolaScreen } from '../screens/RolesConsolaScreen';
import {
  alternarMarca,
  arbolPorArea,
  cambioDeRolDesde,
  cuantosActivos,
  descendientes,
  destinosDeReemplazo,
  faltaParaGuardarElRol,
  formularioDeRolDesde,
  funcionalidadesDeLaBase,
  resumenDelRol,
  soloDeLaBase,
} from '../utils/roles';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Pedido = { url: string; method: string; headers: Record<string, string>; body: unknown };
type Respuesta = { status: number; cuerpo?: unknown };
let pedidos: Pedido[] = [];
function servidor(responder: (p: Pedido) => Respuesta) {
  pedidos = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (url: string, opciones: { method: string; headers: Record<string, string>; body?: string }) => {
    const pedido: Pedido = { url, method: opciones.method, headers: opciones.headers, body: opciones.body ? JSON.parse(opciones.body) : undefined };
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
const ok = (cuerpo?: unknown): Respuesta => ({ status: 200, cuerpo });
const error = (status: number, codigo?: string): Respuesta => ({ status, cuerpo: { message: 'No', codigo } });

const f = (clave: string, parcial: Partial<FuncionalidadConsola> = {}): FuncionalidadConsola => ({
  clave,
  madre: clave.includes('.') ? clave.split('.').slice(0, -1).join('.') : null,
  area: clave.startsWith('eventos') ? 'Comunidad' : 'Chat',
  nombre: clave,
  rolesQueLaUsan: ['TRAINEE', 'MENTOR'],
  prendidaGlobal: true,
  version: 1,
  ...parcial,
});
const CATALOGO = [
  f('chat'),
  f('chat.grupos'),
  f('chat.audio'),
  f('eventos'),
  f('eventos.asistencia', { rolesQueLaUsan: ['MENTOR', 'ADMIN'] }),
  f('admin', { area: 'Administración', rolesQueLaUsan: ['ADMIN', 'ALCHEMIST'] }),
  f('perfil', { area: 'Perfil', rolesQueLaUsan: null }),
];

const rol = (parcial: Partial<RolPersonalizadoConsola> = {}): RolPersonalizadoConsola => ({
  id: 'r-1',
  clave: 'rp:r-1',
  nombre: 'Mentor junior',
  descripcion: 'Primer mes',
  rolBase: 'MENTOR',
  activo: true,
  funcionalidades: ['chat', 'chat.grupos', 'chat.audio'],
  personas: 3,
  version: 5,
  ...parcial,
});

let raiz: ReactTestRenderer | null = null;
beforeEach(async () => {
  setTokenSesion('sesion-1');
  cerrarConsola();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  servidor(() => ok({ token: 'tok-1' }));
  await desbloquear('secreta', 'CONSOLA');
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('lo que deciden los roles (lógica pura)', () => {
  it('solo las funcionalidades que usa la base (sin lista = de todos)', () => {
    expect(funcionalidadesDeLaBase(CATALOGO, 'TRAINEE').map(x => x.clave)).toEqual(['chat', 'chat.grupos', 'chat.audio', 'eventos', 'perfil']);
    expect(funcionalidadesDeLaBase(CATALOGO, 'ADMIN').map(x => x.clave)).toEqual(['eventos.asistencia', 'admin', 'perfil']);
  });

  it('el árbol por área: cada madre seguida de sus hijas, con su nivel', () => {
    const arbol = arbolPorArea(funcionalidadesDeLaBase(CATALOGO, 'MENTOR'));
    expect(arbol.map(g => g.area)).toEqual(['Chat', 'Comunidad', 'Perfil']);
    expect(arbol[1].nodos.map(n => [n.funcionalidad.clave, n.nivel])).toEqual([
      ['eventos', 0],
      ['eventos.asistencia', 1],
    ]);
  });

  it('marcar una madre marca a sus hijas; desmarcar una hija desmarca a la madre', () => {
    expect(descendientes('chat', CATALOGO).sort()).toEqual(['chat.audio', 'chat.grupos']);
    const marcadas = alternarMarca(new Set(), 'chat', CATALOGO);
    expect([...marcadas].sort()).toEqual(['chat', 'chat.audio', 'chat.grupos']);
    const sinAudio = alternarMarca(marcadas, 'chat.audio', CATALOGO);
    expect([...sinAudio].sort()).toEqual(['chat.grupos']);
    expect([...alternarMarca(marcadas, 'chat', CATALOGO)]).toEqual([]);
  });

  it('al cambiar de base al crear, se suelta lo que no es de la nueva', () => {
    expect([...soloDeLaBase(new Set(['chat', 'admin', 'perfil']), CATALOGO, 'TRAINEE')].sort()).toEqual(['chat', 'perfil']);
  });

  it('nombre obligatorio, único y distinto de los seis; base; al menos una; motivo; tope de 20', () => {
    const nuevo = { ...formularioDeRolDesde(null), nombre: 'Mentor junior', rolBase: 'MENTOR', funcionalidades: new Set(['chat']), motivo: 'x' };
    const otro = rol({ id: 'r-2', nombre: 'Mentor Junior ' });
    expect(faltaParaGuardarElRol({ ...nuevo, nombre: ' ' }, null, [])).toMatch(/nombre/);
    expect(faltaParaGuardarElRol({ ...nuevo, nombre: 'mentor' }, null, [])).toMatch(/rol base/);
    expect(faltaParaGuardarElRol({ ...nuevo, nombre: 'Soporte TI' }, null, [])).toMatch(/rol base/);
    expect(faltaParaGuardarElRol(nuevo, null, [otro])).toMatch(/Ya hay un rol/);
    expect(faltaParaGuardarElRol({ ...nuevo, rolBase: null }, null, [])).toMatch(/hereda/);
    expect(faltaParaGuardarElRol({ ...nuevo, funcionalidades: new Set() }, null, [])).toMatch(/al menos una/);
    expect(faltaParaGuardarElRol({ ...nuevo, motivo: '' }, null, [])).toMatch(/motivo/);
    const veinte = Array.from({ length: 20 }, (_, i) => rol({ id: `x-${i}`, nombre: `Rol ${i}` }));
    expect(faltaParaGuardarElRol(nuevo, null, veinte)).toMatch(/20 roles activos/);
    expect(faltaParaGuardarElRol(nuevo, null, [])).toBeNull();
    // Al editar, su propio nombre no choca consigo mismo; sin cambios no se guarda.
    const existente = rol();
    expect(faltaParaGuardarElRol(formularioDeRolDesde(existente), existente, [existente])).toMatch(/No cambiaste/);
    expect(faltaParaGuardarElRol({ ...formularioDeRolDesde(existente), activo: false, motivo: 'Fin' }, existente, [existente])).toBeNull();
  });

  it('el cuerpo del PUT lleva la versión y no la base; los destinos del reemplazo son de la misma base', () => {
    const existente = rol();
    expect(cambioDeRolDesde({ ...formularioDeRolDesde(existente), descripcion: ' ', motivo: ' Fin ' }, existente)).toEqual({
      nombre: 'Mentor junior',
      descripcion: null,
      funcionalidades: ['chat', 'chat.audio', 'chat.grupos'],
      activo: true,
      motivo: 'Fin',
      version: 5,
    });
    const todos = [existente, rol({ id: 'r-2', nombre: 'Mentor senior' }), rol({ id: 'r-3', nombre: 'Aprendiz piloto', rolBase: 'TRAINEE' }), rol({ id: 'r-4', nombre: 'Viejo', activo: false })];
    expect(destinosDeReemplazo(existente, todos)).toEqual([
      { id: 'r-2', nombre: 'Mentor senior' },
      { id: null, nombre: 'Ninguno (solo Mentor)' },
    ]);
    expect(resumenDelRol(existente)).toBe('Hereda de Mentor · 3 personas · 3 funcionalidades');
    expect(cuantosActivos(todos)).toBe('3 activos de 20');
  });
});

describe('API de roles', () => {
  it('lista, crea, edita, borra con motivo y reemplaza', async () => {
    servidor(p => (p.method === 'POST' && ruta(p).endsWith('/reemplazar') ? ok({ personasMovidas: 3 }) : p.method === 'DELETE' ? { status: 204 } : ok(p.method === 'GET' ? [rol()] : rol())));
    expect((await listarRoles()).map(r => r.id)).toEqual(['r-1']);
    await crearRol({ nombre: 'X', descripcion: null, rolBase: 'MENTOR', funcionalidades: ['chat'], motivo: 'm' });
    expect(pedidos[1]).toMatchObject({ method: 'POST', body: { nombre: 'X', rolBase: 'MENTOR', funcionalidades: ['chat'], motivo: 'm' } });
    await editarRol('r-1', { nombre: 'X', descripcion: null, funcionalidades: [], activo: false, motivo: 'm', version: 5 });
    expect(ruta(pedidos[2])).toBe('/api/v1/soporte-ti/roles/r-1');
    await borrarRol('r-1', ' sin uso ');
    expect(ruta(pedidos[3])).toBe('/api/v1/soporte-ti/roles/r-1?motivo=sin%20uso');
    expect(await reemplazarRol('r-1', null, 'm')).toBe(3);
    expect(pedidos[4].body).toEqual({ rolDestinoId: null, motivo: 'm' });
    expect(pedidos.every(p => p.headers['X-Consola-Token'] === 'tok-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

const presionar = async (etiqueta: string) => {
  const [nodo] = raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function');
  if (!nodo) throw new Error(`No hay nada que se llame «${etiqueta}»`);
  await act(async () => {
    nodo.props.onPress();
  });
};
const escribir = async (placeholder: string, texto: string) => {
  const [campo] = raiz!.root.findAll(n => n.type === TextInput && n.props.placeholder === placeholder);
  await act(async () => {
    campo.props.onChangeText(texto);
  });
};
const marcada = (titulo: string) => {
  const [caja] = raiz!.root.findAll(n => n.props.accessibilityRole === 'checkbox' && String(n.props.accessibilityLabel).startsWith(`${titulo}.`));
  return caja.props.accessibilityState.checked as boolean;
};
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));
const MOTIVO = 'Ej.: Mentores nuevos sin pasar lista todavía.';

async function montar(props: Partial<React.ComponentProps<typeof RolConsolaScreen>>, responder: (p: Pedido) => Respuesta) {
  servidor(responder);
  const todo = {
    rol: null,
    roles: [],
    catalogo: CATALOGO,
    onGuardado: jest.fn(),
    onBorrado: jest.fn(),
    onReleer: jest.fn(async () => null),
    onBloqueada: jest.fn(),
    onVolver: jest.fn(),
    ...props,
  };
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(RolConsolaScreen, todo));
  });
  return todo;
}

describe('crear y editar un rol', () => {
  it('crear: base, marcar una madre marca a sus hijas, motivo y POST', async () => {
    const props = await montar({}, () => ({ status: 201, cuerpo: rol({ id: 'r-9', nombre: 'Mentor junior' }) }));
    await escribir('Ej.: Mentor junior', 'Mentor junior');
    await presionar('Mentor');
    await presionar('chat. chat');
    expect(marcada('chat.grupos')).toBe(true);
    expect(marcada('chat.audio')).toBe(true);
    await presionar('chat.audio. chat.audio');
    expect(marcada('chat')).toBe(false);
    await escribir(MOTIVO, 'Prueba');
    await presionar('Crear rol');
    expect(pedidos[0]).toMatchObject({ method: 'POST', body: { nombre: 'Mentor junior', rolBase: 'MENTOR', funcionalidades: ['chat.grupos'], motivo: 'Prueba' } });
    expect(props.onGuardado).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-9' }));
    expect(textos()).toContain('Rol «Mentor junior» creado.');
  });

  it('sin base no hay árbol; sin motivo no sale nada', async () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    await montar({}, () => ok(rol()));
    expect(textos()).toContain('Elige primero de qué rol hereda.');
    await escribir('Ej.: Mentor junior', 'Algo');
    await presionar('Aprendiz');
    await presionar('Marcar todas');
    await presionar('Crear rol');
    expect(alerta.mock.calls.at(-1)?.[1]).toMatch(/motivo/);
    expect(pedidos).toHaveLength(0);
  });

  it('desactivar es un PUT con activo en false y la versión', async () => {
    const existente = rol();
    const props = await montar({ rol: existente, roles: [existente] }, () => ok({ ...existente, activo: false, version: 6 }));
    await presionar('Rol activo');
    await escribir(MOTIVO, 'Ya no se usa');
    await presionar('Guardar cambios');
    expect(pedidos[0]).toMatchObject({ method: 'PUT', body: { activo: false, version: 5, motivo: 'Ya no se usa' } });
    expect(props.onGuardado).toHaveBeenCalledWith(expect.objectContaining({ activo: false }));
  });

  it('borrar con personas: el 409 ofrece pasarlas a otro rol, y el reemplazo va con su motivo', async () => {
    const existente = rol();
    const otro = rol({ id: 'r-2', nombre: 'Mentor senior' });
    jest.spyOn(AlertNativo, 'alert').mockImplementation((_t, _m, botones) => {
      botones?.find(b => b.style !== 'cancel')?.onPress?.();
    });
    const props = await montar({ rol: existente, roles: [existente, otro] }, p => {
      if (p.method === 'DELETE') return error(409);
      if (ruta(p).endsWith('/reemplazar')) return ok({ personasMovidas: 3 });
      return ok(existente);
    });
    await escribir(MOTIVO, 'Se unifica');
    await presionar('Borrar rol');
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/roles/r-1?motivo=Se%20unifica');
    const hoja = raiz!.root.findAll(n => n.props.titulo === 'Pasar sus personas' && typeof n.props.alCerrar === 'function')[0];
    expect(hoja.props.visible).toBe(true);
    await presionar('Mentor senior');
    const [pasar] = raiz!.root.findAll(n => n.props.etiqueta === 'Pasar 3 personas' && typeof n.props.onPress === 'function');
    await act(async () => {
      pasar.props.onPress();
    });
    expect(pedidos.at(-1)).toMatchObject({ method: 'POST', body: { rolDestinoId: 'r-2', motivo: 'Se unifica' } });
    expect(props.onReleer).toHaveBeenCalled();
    expect(textos()).toContain('Listo: 3 personas pasaron de rol.');
  });

  it('borrar sin personas: 204 y vuelve a la lista', async () => {
    const existente = rol({ personas: 0 });
    jest.spyOn(AlertNativo, 'alert').mockImplementation((_t, _m, botones) => {
      botones?.find(b => b.text === 'Borrar')?.onPress?.();
    });
    const props = await montar({ rol: existente, roles: [existente] }, () => ({ status: 204 }));
    await escribir(MOTIVO, 'Sin uso');
    await presionar('Borrar rol');
    expect(props.onBorrado).toHaveBeenCalledWith('r-1');
  });

  it('si el servidor pide la contraseña (428), la pide y reintenta con X-Reautenticacion', async () => {
    let primera = true;
    const existente = rol();
    await montar({ rol: existente, roles: [existente] }, p => {
      if (ruta(p).endsWith('/desbloqueo')) return ok({ token: 'reaut-1' });
      if (primera) {
        primera = false;
        return error(428, 'REAUTENTICACION_REQUERIDA');
      }
      return ok({ ...existente, nombre: 'Otro', version: 6 });
    });
    await escribir('Ej.: Mentor junior', 'Otro');
    await escribir(MOTIVO, 'Renombre');
    await presionar('Guardar cambios');
    const hoja = raiz!.root.findAll(n => n.type === HojaDeContrasena)[0];
    expect(hoja.props.visible).toBe(true);
    await act(async () => {
      hoja.props.onConfirmar('secreta');
    });
    expect(pedidos.at(-1)!.headers['X-Reautenticacion']).toBe('reaut-1');
  });
});

describe('la lista de roles', () => {
  it('activos e inactivos, el conteo y el tope', async () => {
    const roles = [rol(), rol({ id: 'r-2', nombre: 'Viejo', activo: false, personas: 0 })];
    await act(async () => {
      raiz = TestRenderer.create(
        React.createElement(RolesConsolaScreen, { roles, cargando: false, fallo: null, onRecargar: jest.fn(), onAbrir: jest.fn(), onNuevo: jest.fn(), onVolver: jest.fn() }),
      );
    });
    expect(textos()).toEqual(expect.arrayContaining(['1 activo de 20', 'Activos', 'Inactivos', 'Mentor junior', 'Viejo', 'Inactivo']));
  });
});
