/**
 * La consola Soporte TI (spec 002, contrato §6, plan §D6): el desbloqueo con contraseña (token en memoria, 15 min sin
 * uso), el 423 que vuelve a la puerta, el 428 que pide la contraseña, el 409 que relee, el motivo obligatorio y la
 * auditoría. Contra el contrato, con `fetch` simulado (el backend lo hace otro agente en paralelo).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, Alert as AlertNativo, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
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

import { ApiError, setTokenSesion } from '../../../services/http/apiClient';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { cambiarFuncionalidad, desbloquear, leerAuditoria, listarFuncionalidades } from '../api/soporteTiApi';
import type { FuncionalidadConsola } from '../api/soporteTiSchemas';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import { cerrarConsola, consolaAbierta, MINUTOS_DE_LA_CONSOLA, usarRelojDePrueba } from '../estado/sesionDeConsola';
import { AVISO_DE_BLOQUEO, ConsolaSoporteTiScreen } from '../screens/ConsolaSoporteTiScreen';
import { FuncionalidadConsolaScreen } from '../screens/FuncionalidadConsolaScreen';
import {
  agruparPorArea,
  cambioDesde,
  cuantasApagadas,
  esCambioCritico,
  estadoEnLaConsola,
  faltaParaGuardar,
  formularioDesde,
  hayCambios,
  hayMasPaginas,
  queHacerConElError,
  resumenDelCambio,
  textoDelCircuito,
  textoDelEstado,
} from '../utils/consola';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------------------------------------------------
// Un servidor de mentira: responde por método y ruta, y anota cada pedido.
// ---------------------------------------------------------------------------------------------------------------------

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

function funcionalidad(parcial: Partial<FuncionalidadConsola> = {}): FuncionalidadConsola {
  return {
    clave: 'chat.audio',
    madre: 'chat',
    area: 'Chat',
    nombre: 'Notas de voz',
    descripcion: 'Grabar y mandar notas de voz.',
    rolesQueLaUsan: ['TRAINEE', 'MENTOR'],
    critica: false,
    porDefecto: 'PRENDIDA',
    prendidaGlobal: true,
    porRol: {},
    aviso: null,
    version: 41,
    actualizadoPor: { id: 'u-ti', nombre: 'Ricardo' },
    actualizadoEn: '2026-10-13T22:00:00Z',
    ...parcial,
  };
}

const chat = funcionalidad({ clave: 'chat', madre: null, nombre: 'Chat', critica: true, rolesQueLaUsan: null, version: 7 });

let raiz: ReactTestRenderer | null = null;
beforeEach(() => {
  setTokenSesion('sesion-1');
  cerrarConsola();
  usarRelojDePrueba(null);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  usarRelojDePrueba(null);
  jest.restoreAllMocks();
});

const ok = (cuerpo: unknown): Respuesta => ({ status: 200, cuerpo });
const error = (status: number, codigo?: string, message = 'No'): Respuesta => ({ status, cuerpo: { message, codigo } });

// ---------------------------------------------------------------------------------------------------------------------

describe('desbloqueo y sesión corta', () => {
  it('sin desbloquear, la consola no sale a la red: es un 423', async () => {
    servidor(() => ok([]));
    const e = await listarFuncionalidades().catch(x => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(queHacerConElError(e)).toBe('desbloquear');
    expect(pedidos).toHaveLength(0);
  });

  it('la contraseña abre la consola y el token viaja en X-Consola-Token', async () => {
    servidor(p => (ruta(p) === '/api/v1/soporte-ti/desbloqueo' ? ok({ token: 'tok-1', venceEn: null }) : ok([chat])));
    await desbloquear('secreta', 'CONSOLA');
    expect(pedidos[0]).toMatchObject({ method: 'POST', body: { contrasena: 'secreta', para: 'CONSOLA' } });
    expect(consolaAbierta()).toBe(true);
    const lista = await listarFuncionalidades();
    expect(lista[0].clave).toBe('chat');
    expect(pedidos[1].headers['X-Consola-Token']).toBe('tok-1');
    expect(pedidos[1].headers['X-Auth-Token']).toBe('sesion-1');
  });

  it('401 es contraseña mal y 429 demasiados intentos', async () => {
    servidor(() => error(401));
    expect(queHacerConElError(await desbloquear('mal', 'CONSOLA').catch(x => x))).toBe('contrasena_incorrecta');
    servidor(() => error(429));
    expect(queHacerConElError(await desbloquear('mal', 'CONSOLA').catch(x => x))).toBe('demasiados_intentos');
    expect(consolaAbierta()).toBe(false);
  });

  it('un 423 del servidor cierra la consola', async () => {
    servidor(p => (ruta(p).endsWith('/desbloqueo') ? ok({ token: 'tok-1' }) : error(423, 'CONSOLA_BLOQUEADA')));
    await desbloquear('secreta', 'CONSOLA');
    const e = await listarFuncionalidades().catch(x => x);
    expect(queHacerConElError(e)).toBe('desbloquear');
    expect(consolaAbierta()).toBe(false);
  });

  it('se vence a los 15 min sin uso; cada pedido que sale bien renueva', async () => {
    let ahora = 1_000_000;
    usarRelojDePrueba(() => ahora);
    servidor(p => (ruta(p).endsWith('/desbloqueo') ? ok({ token: 'tok-1' }) : ok([])));
    await desbloquear('secreta', 'CONSOLA');
    ahora += (MINUTOS_DE_LA_CONSOLA - 1) * 60_000;
    await listarFuncionalidades();
    ahora += (MINUTOS_DE_LA_CONSOLA - 1) * 60_000;
    expect(consolaAbierta()).toBe(true);
    ahora += 2 * 60_000;
    expect(consolaAbierta()).toBe(false);
  });
});

describe('cambiar una funcionalidad (API)', () => {
  beforeEach(async () => {
    servidor(() => ok({ token: 'tok-1' }));
    await desbloquear('secreta', 'CONSOLA');
  });

  it('manda el cambio con su versión y, si es crítico, X-Reautenticacion', async () => {
    servidor(() => ok({ ...chat, prendidaGlobal: false, version: 8 }));
    const nueva = await cambiarFuncionalidad('chat', { prendidaGlobal: false, porRol: {}, aviso: 'Vuelve a las 18:00.', motivo: 'Spam', version: 7 }, 'reaut-1');
    expect(nueva.version).toBe(8);
    expect(pedidos[0]).toMatchObject({
      method: 'PUT',
      body: { prendidaGlobal: false, porRol: {}, aviso: 'Vuelve a las 18:00.', motivo: 'Spam', version: 7 },
    });
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/funcionalidades/chat');
    expect(pedidos[0].headers['X-Reautenticacion']).toBe('reaut-1');
    expect(pedidos[0].headers['X-Consola-Token']).toBe('tok-1');
  });

  it('428 pide la contraseña y 409 relee', async () => {
    servidor(() => error(428, 'REAUTENTICACION_REQUERIDA'));
    expect(queHacerConElError(await cambiarFuncionalidad('chat', cambioDesde(formularioDesde(chat), chat)).catch(x => x))).toBe('reautenticar');
    servidor(() => error(409));
    expect(queHacerConElError(await cambiarFuncionalidad('chat', cambioDesde(formularioDesde(chat), chat)).catch(x => x))).toBe('releer');
  });

  it('la auditoría se pide de a 20, con la clave si hay filtro', async () => {
    servidor(() => ok({ contenido: [], pagina: 0, total: 0 }));
    await leerAuditoria({ clave: 'chat.audio', pagina: 2 });
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/auditoria?clave=chat.audio&page=2&size=20');
    await leerAuditoria({});
    expect(ruta(pedidos[1])).toBe('/api/v1/soporte-ti/auditoria?page=0&size=20');
  });
});

describe('lo que decide la consola', () => {
  it('el estado de cada fila: prendida, para todos, por la madre, por el circuito, para algunos roles', () => {
    const audio = funcionalidad();
    expect(textoDelEstado(estadoEnLaConsola(audio, [chat, audio]))).toBe('Prendida');
    expect(textoDelEstado(estadoEnLaConsola({ ...audio, prendidaGlobal: false }, [chat, audio]))).toBe('Apagada para todos');
    expect(textoDelEstado(estadoEnLaConsola(audio, [{ ...chat, prendidaGlobal: false }, audio]))).toBe('Apagada: «Chat» está apagada');
    expect(estadoEnLaConsola({ ...audio, circuito: { estado: 'ABIERTO' } }, [audio]).tipo).toBe('apagada_por_el_circuito');
    expect(textoDelEstado(estadoEnLaConsola({ ...audio, porRol: { TRAINEE: false, MENTOR: true } }, [audio]))).toBe('Apagada para Aprendiz');
  });

  it('agrupa por área, busca sin tildes y filtra apagadas y críticas', () => {
    const intox = funcionalidad({ clave: 'habitos.intox', area: 'Hábitos', nombre: 'Intoxicación', prendidaGlobal: false });
    const todas = [chat, funcionalidad(), intox];
    expect(agruparPorArea(todas, '').map(g => g.area)).toEqual(['Chat', 'Hábitos']);
    expect(agruparPorArea(todas, 'intoxicacion')[0].funcionalidades.map(f => f.clave)).toEqual(['habitos.intox']);
    expect(agruparPorArea(todas, '', 'apagadas').flatMap(g => g.funcionalidades.map(f => f.clave))).toEqual(['habitos.intox']);
    expect(agruparPorArea(todas, '', 'criticas').flatMap(g => g.funcionalidades.map(f => f.clave))).toEqual(['chat']);
  });

  it('el motivo es obligatorio; sin cambios no se guarda; el aviso vacío viaja como null', () => {
    const audio = funcionalidad();
    const formulario = formularioDesde(audio);
    expect(formulario.porRol).toEqual({ TRAINEE: true, MENTOR: true });
    expect(faltaParaGuardar(formulario, audio)).toMatch(/No cambiaste/);
    const cambiado = { ...formulario, porRol: { ...formulario.porRol, TRAINEE: false } };
    expect(hayCambios(cambiado, audio)).toBe(true);
    expect(faltaParaGuardar(cambiado, audio)).toMatch(/motivo/);
    expect(faltaParaGuardar({ ...cambiado, motivo: '  ' }, audio)).toMatch(/motivo/);
    expect(faltaParaGuardar({ ...cambiado, motivo: 'Falla del audio' }, audio)).toBeNull();
    expect(cambioDesde({ ...cambiado, motivo: ' Falla ', aviso: '  ' }, audio)).toEqual({
      prendidaGlobal: true,
      porRol: { TRAINEE: false, MENTOR: true },
      aviso: null,
      motivo: 'Falla',
      version: 41,
    });
  });

  it('crítico: apagar para todos o tocar algo marcado crítico', () => {
    const audio = funcionalidad();
    expect(esCambioCritico({ ...formularioDesde(audio), porRol: { TRAINEE: false, MENTOR: true } }, audio)).toBe(false);
    expect(esCambioCritico({ ...formularioDesde(audio), prendidaGlobal: false }, audio)).toBe(true);
    expect(esCambioCritico({ ...formularioDesde(chat), aviso: 'x' }, chat)).toBe(true);
  });

  it('auditoría y circuito en palabras', () => {
    expect(resumenDelCambio({ antes: { prendidaGlobal: true }, despues: { prendidaGlobal: false } })).toBe('Prendida para todos → Apagada para todos');
    expect(resumenDelCambio({ antes: null, despues: null })).toBeNull();
    // Hallazgo del QA del 13/10: apagar solo para un rol se leía «Prendida para todos (cambiaron los roles o el aviso)».
    const foto = (prendidaGlobal: boolean, apagadaPara: string[], aviso: string | null = null) => ({ prendidaGlobal, apagadaPara, aviso });
    expect(resumenDelCambio({ antes: foto(true, []), despues: foto(true, ['TRAINEE']) })).toBe('Prendida para todos → Apagada para Aprendiz');
    expect(resumenDelCambio({ antes: foto(true, ['TRAINEE']), despues: foto(true, []) })).toBe('Apagada para Aprendiz → Prendida para todos');
    expect(resumenDelCambio({ antes: foto(true, []), despues: foto(true, ['MENTOR', 'TRAINEE', 'ADMIN']) })).toBe(
      'Prendida para todos → Apagada para Aprendiz, Mentor y Administrador',
    );
    expect(resumenDelCambio({ antes: foto(true, ['TRAINEE']), despues: foto(true, ['TRAINEE'], 'Vuelve a las 18:00') })).toBe(
      'Apagada para Aprendiz (cambió el aviso)',
    );
    // Sin `apagadaPara`, los roles se leen de `porRol`.
    expect(resumenDelCambio({ antes: { prendidaGlobal: true, porRol: { TRAINEE: true } }, despues: { prendidaGlobal: true, porRol: { TRAINEE: false, MENTOR: true } } })).toBe(
      'Prendida para todos → Apagada para Aprendiz',
    );
    expect([0, 1, 3].map(cuantasApagadas)).toEqual(['Todo prendido', '1 apagada', '3 apagadas']);
    expect(hayMasPaginas(0, 20, 20, 45)).toBe(true);
    expect(hayMasPaginas(2, 5, 20, 45)).toBe(false);
    expect(hayMasPaginas(0, 20, 20, null)).toBe(true);
    expect(textoDelCircuito({ parte: 'ia.voz', estado: 'ABIERTO', abiertoDesde: null, proximaPrueba: null })).toMatchObject({ titulo: 'Apagada sola', apagada: true });
    expect(textoDelCircuito({ parte: 'ia.chat', estado: 'CERRADO', fallasEnVentana: 2 })).toEqual({ titulo: 'Funciona', detalle: '2 fallas recientes', apagada: false });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Pantallas
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
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));
const hoja = () => raiz!.root.findAll(n => n.type === HojaDeContrasena)[0];
const hojaAbierta = () => hoja().props.visible as boolean;
const MOTIVO = 'Ej.: El proveedor de audio está caído.';

describe('detalle de una funcionalidad', () => {
  async function montar(f: FuncionalidadConsola, extra: Partial<React.ComponentProps<typeof FuncionalidadConsolaScreen>> = {}) {
    const props = {
      funcionalidad: f,
      todas: [chat, f],
      onGuardada: jest.fn(),
      onReleer: jest.fn(async () => null),
      onBloqueada: jest.fn(),
      onAuditoria: jest.fn(),
      onVolver: jest.fn(),
      ...extra,
    };
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(FuncionalidadConsolaScreen, props));
    });
    return props;
  }

  beforeEach(async () => {
    servidor(() => ok({ token: 'tok-1' }));
    await desbloquear('secreta', 'CONSOLA');
  });

  // Hallazgo del QA del 13/10: con la lista al final, el botón flotante de SER tapaba el borde de «Guardar con contraseña».
  it('el final de la lista sube por encima del botón flotante de SER', async () => {
    servidor(() => ok(funcionalidad()));
    await montar(funcionalidad());
    const [lista] = raiz!.root.findAll(n => n.type === ScrollView);
    expect(StyleSheet.flatten(lista.props.contentContainerStyle).paddingBottom).toBeGreaterThanOrEqual(36 + ESPACIO_PARA_LANZADOR);
  });

  it('sin motivo no guarda: avisa en un diálogo y marca el campo', async () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(() => ok(funcionalidad()));
    await montar(funcionalidad());
    await presionar('Prendida para Aprendiz');
    await presionar('Guardar');
    expect(alerta.mock.calls[0]?.[0]).toBe('Falta algo para guardar');
    expect(pedidos).toHaveLength(0);
    expect(textos()).toContain('Escribe el motivo del cambio.');
  });

  it('un cambio que no es crítico se guarda directo, con su versión, y se confirma en línea', async () => {
    const nueva = funcionalidad({ porRol: { TRAINEE: false }, version: 42 });
    servidor(() => ok(nueva));
    const props = await montar(funcionalidad());
    await presionar('Prendida para Aprendiz');
    await escribir(MOTIVO, 'Falla del audio');
    await presionar('Guardar');
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ method: 'PUT', body: { porRol: { TRAINEE: false, MENTOR: true }, motivo: 'Falla del audio', version: 41 } });
    expect(pedidos[0].headers['X-Reautenticacion']).toBeUndefined();
    expect(props.onGuardada).toHaveBeenCalledWith(expect.objectContaining({ version: 42 }));
    expect(textos()).toContain('Guardado. Rige en unos segundos para todos.');
  });

  it('apagar para todos pide la contraseña antes, y guarda con X-Reautenticacion', async () => {
    servidor(p => (ruta(p).endsWith('/desbloqueo') ? ok({ token: 'reaut-1' }) : ok(funcionalidad({ prendidaGlobal: false, version: 42 }))));
    await montar(funcionalidad());
    await presionar('Prendida para todos');
    await escribir(MOTIVO, 'Se cayó el proveedor');
    await presionar('Guardar con contraseña');
    expect(hojaAbierta()).toBe(true);
    expect(pedidos).toHaveLength(0);

    await act(async () => {
      hoja().props.onConfirmar('secreta');
    });
    expect(pedidos[0]).toMatchObject({ method: 'POST', body: { contrasena: 'secreta', para: 'CAMBIO_CRITICO' } });
    expect(pedidos[1]).toMatchObject({ method: 'PUT', body: { prendidaGlobal: false } });
    expect(pedidos[1].headers['X-Reautenticacion']).toBe('reaut-1');
    expect(hojaAbierta()).toBe(false);
  });

  it('si el servidor responde 428, pide la contraseña', async () => {
    servidor(() => error(428, 'REAUTENTICACION_REQUERIDA'));
    await montar(funcionalidad());
    await presionar('Prendida para Mentor');
    await escribir(MOTIVO, 'Prueba');
    await presionar('Guardar');
    expect(hojaAbierta()).toBe(true);
  });

  it('un 409 relee y avisa; un 423 vuelve a la puerta', async () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(() => error(409));
    const props = await montar(funcionalidad());
    await presionar('Prendida para Mentor');
    await escribir(MOTIVO, 'Prueba');
    await presionar('Guardar');
    expect(props.onReleer).toHaveBeenCalledTimes(1);
    expect(alerta.mock.calls.at(-1)?.[0]).toBe('Alguien la cambió antes');

    servidor(() => error(423, 'CONSOLA_BLOQUEADA'));
    await presionar('Guardar');
    expect(props.onBloqueada).toHaveBeenCalledTimes(1);
  });

  it('la contraseña mal se dice en la hoja, sin cerrarla', async () => {
    servidor(p => (ruta(p).endsWith('/desbloqueo') ? error(401) : ok(chat)));
    await montar(chat);
    await escribir('Ej.: El chat vuelve a las 18:00.', 'Vuelve pronto');
    await escribir(MOTIVO, 'Mantenimiento');
    await presionar('Guardar con contraseña');
    await act(async () => {
      hoja().props.onConfirmar('mal');
    });
    expect(hojaAbierta()).toBe(true);
    expect(hoja().props.error).toBe('La contraseña no es correcta.');
  });
});

describe('la consola entera', () => {
  it('sin desbloquear muestra la puerta; con la contraseña, la lista; un 423 vuelve a la puerta con el aviso', async () => {
    jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    let bloqueada = false;
    servidor(p => {
      const r = ruta(p);
      if (r.endsWith('/desbloqueo')) return ok({ token: 'tok-1' });
      if (bloqueada) return error(423, 'CONSOLA_BLOQUEADA');
      if (r.endsWith('/ia/circuito')) return ok([{ parte: 'ia.chat', estado: 'CERRADO', fallasEnVentana: 0 }]);
      return ok([chat, funcionalidad()]);
    });
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(ConsolaSoporteTiScreen, { onSalir: jest.fn() }));
    });
    expect(textos()).toContain('Consola bloqueada');

    const [campo] = raiz!.root.findAll(n => n.type === TextInput && n.props.secureTextEntry === true);
    await act(async () => {
      campo.props.onChangeText('secreta');
    });
    await presionar('Desbloquear');
    expect(textos()).toEqual(expect.arrayContaining(['Notas de voz', 'Chat de SER: Funciona']));

    bloqueada = true;
    await presionar('Notas de voz. Prendida');
    await presionar('Prendida para Aprendiz');
    await escribir(MOTIVO, 'x');
    await presionar('Guardar');
    expect(textos()).toContain(AVISO_DE_BLOQUEO);
    expect(consolaAbierta()).toBe(false);
  });
});
