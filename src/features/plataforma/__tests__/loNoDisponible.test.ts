/**
 * Fase 2 de la spec 002 (contrato `fase-2.md` §1 y §6, decisión P1 del dueño): lo que a una sesión todavía no le toca
 * (un despliegue en el que no entró, algo que su rol personalizado no tiene) **se esconde**: `noDisponibles` de `/mias`,
 * el 404 `FUNCIONALIDAD_NO_DISPONIBLE` que relee sin diálogo, las entradas que no se dibujan y el texto neutro de una
 * pestaña vacía. Con el servidor simulado (el backend lo hacen otros agentes en paralelo).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { AccessibilityInfo, Alert as AlertNativo, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, c: tokens.light, t: tokens.type, space: tokens.space }) };
});
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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));
jest.mock('../../renasia/screens/RenasiaPanel', () => ({ RenasiaPanel: () => null }));
jest.mock('../../fenix/components/FenixDeSerQuieto', () => ({ FenixDeSerQuieto: () => null }));

import { Alert } from '../../../components/Alerta';
import {
  apiFetch,
  ApiError,
  setTokenSesion,
  suscribirFuncionalidadNoDisponible,
  suscribirModoSoloLectura,
} from '../../../services/http/apiClient';
import { olvidarErroresSinDialogo, usarRelojDeErroresSinDialogo, VENTANA_DEL_DIALOGO_MS } from '../../../services/http/erroresSinDialogo';
import { avisar } from '../../admin/utils/dialogo';
import { ChatDelCurso } from '../../renasia/components/ChatDelCurso';
import { TarjetaPropuesta } from '../../renasia/components/TarjetaPropuesta';
import { leerMisFuncionalidades, type LecturaDeFuncionalidades } from '../api/funcionalidadesApi';
import { SeccionNoDisponible, TEXTO_SECCION_NO_DISPONIBLE } from '../components/SeccionNoDisponible';
import { SiEstaDisponible } from '../components/SiEstaDisponible';
import { crearAlmacenDeFuncionalidades } from '../estado/almacenDeFuncionalidades';
import { evaluarDisponibilidad, evaluarFuncionalidad, mapaDeNoDisponibles } from '../estado/evaluacion';
import { ProveedorDeFuncionalidades } from '../estado/FuncionalidadesProvider';
import { guardarLectura, recuperarLectura } from '../estado/memoriaLocal';
import { useFuncionalidad } from '../estado/useFuncionalidad';
import { conversacionesDisponibles, seccionesDisponibles, seccionQueSeMuestra } from '../utils/loQueSeEsconde';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
beforeEach(() => {
  olvidarErroresSinDialogo();
  usarRelojDeErroresSinDialogo(null);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  usarRelojDeErroresSinDialogo(null);
  jest.restoreAllMocks();
});

function servidor(status: number, cuerpo: unknown) {
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  }));
}

const lectura = (noDisponibles: string[], apagadas: { clave: string; aviso: string | null }[] = []): LecturaDeFuncionalidades => ({
  tipo: 'nueva',
  version: 1,
  etag: null,
  apagadas,
  noDisponibles,
});

async function montarCon(noDisponibles: string[], elemento: React.ReactElement, apagadas: { clave: string; aviso: string | null }[] = []) {
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  const almacen = crearAlmacenDeFuncionalidades({
    leer: async () => lectura(noDisponibles, apagadas),
    recuperar: async () => null,
    guardar: async () => undefined,
  });
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(ProveedorDeFuncionalidades, { cuenta: 'u-1', almacen }, elemento));
  });
  return almacen;
}
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));
const hayAviso = () => raiz!.root.findAll(n => n.props.testID === 'aviso-de-mantenimiento').length > 0;

describe('noDisponibles en GET /funcionalidades/mias', () => {
  beforeEach(() => setTokenSesion('sesion-1'));

  it('lee la lista y descarta lo que no es texto; sin el campo (backend de la fase 1), ninguna', async () => {
    servidor(200, { version: 3, apagadas: [], noDisponibles: ['eventos', 'eventos.asistencia', '', 7, null, 'eventos'] });
    expect(await leerMisFuncionalidades(null)).toMatchObject({ tipo: 'nueva', noDisponibles: ['eventos', 'eventos.asistencia'] });
    servidor(200, { version: 3, apagadas: [] });
    expect(await leerMisFuncionalidades(null)).toMatchObject({ noDisponibles: [] });
    servidor(200, { version: 3, apagadas: [], noDisponibles: null });
    expect(await leerMisFuncionalidades(null)).toMatchObject({ noDisponibles: [] });
  });

  it('una hija de una madre no disponible tampoco está; sin datos o sin clave, todo disponible', () => {
    const no = mapaDeNoDisponibles(['eventos']);
    expect(evaluarDisponibilidad(no, 'eventos')).toBe(false);
    expect(evaluarDisponibilidad(no, 'eventos.asistencia')).toBe(false);
    expect(evaluarDisponibilidad(no, 'muro')).toBe(true);
    expect(evaluarDisponibilidad(no, null)).toBe(true);
    expect(evaluarDisponibilidad(mapaDeNoDisponibles([]), 'eventos')).toBe(true);
    // Lo apagado y lo no disponible son cosas distintas: no disponible no es «en mantenimiento».
    expect(evaluarFuncionalidad({}, 'eventos').prendida).toBe(true);
  });

  it('el almacén la guarda por cuenta y la recupera sin red', async () => {
    const guardadas: Record<string, unknown> = {};
    const almacen = crearAlmacenDeFuncionalidades({
      leer: async () => lectura(['ranking']),
      recuperar: async () => null,
      guardar: async (cuenta, l) => {
        guardadas[cuenta] = l;
      },
    });
    await almacen.cambiarCuenta('u-1');
    expect(evaluarDisponibilidad(almacen.estado().noDisponibles, 'ranking')).toBe(false);
    expect(guardadas['u-1']).toMatchObject({ noDisponibles: ['ranking'] });

    await guardarLectura('u-2', { version: 1, etag: null, apagadas: [], noDisponibles: ['muro.publicar'] });
    expect(await recuperarLectura('u-2')).toMatchObject({ noDisponibles: ['muro.publicar'] });
    const sinRed = crearAlmacenDeFuncionalidades({
      leer: async () => {
        throw new ApiError(0, 'sin red');
      },
      recuperar: recuperarLectura,
      guardar: async () => undefined,
    });
    await sinRed.cambiarCuenta('u-2');
    expect(sinRed.estado().origen).toBe('guardado');
    expect(evaluarDisponibilidad(sinRed.estado().noDisponibles, 'muro.publicar')).toBe(false);
  });

  it('un 404 FUNCIONALIDAD_NO_DISPONIBLE la marca al instante y relee sin condición', async () => {
    let lecturas = 0;
    const leer = jest.fn(async (_etag: string | null) => {
      lecturas += 1;
      return lectura(lecturas === 1 ? [] : ['eventos']);
    });
    const almacen = crearAlmacenDeFuncionalidades({ leer, recuperar: async () => null, guardar: async () => undefined });
    await almacen.cambiarCuenta('u-1');
    almacen.recibirNoDisponible('eventos');
    expect(evaluarDisponibilidad(almacen.estado().noDisponibles, 'eventos')).toBe(false);
    await new Promise(r => setImmediate(r));
    expect(leer).toHaveBeenLastCalledWith(null);
    expect(evaluarDisponibilidad(almacen.estado().noDisponibles, 'eventos')).toBe(false);
  });

  it('si la relectura dice que vuelve a estar, vuelve a estar (manda el servidor)', async () => {
    const almacen = crearAlmacenDeFuncionalidades({ leer: async () => lectura([]), recuperar: async () => null, guardar: async () => undefined });
    await almacen.cambiarCuenta('u-1');
    almacen.recibirNoDisponible('eventos');
    await new Promise(r => setImmediate(r));
    expect(evaluarDisponibilidad(almacen.estado().noDisponibles, 'eventos')).toBe(true);
  });
});

describe('el 404 y el 403 de la fase 2 no van en diálogo', () => {
  beforeEach(() => setTokenSesion('sesion-1'));

  it('apiFetch avisa del 404 FUNCIONALIDAD_NO_DISPONIBLE y el aviso de la pantalla no se abre', async () => {
    const claves: (string | null)[] = [];
    const baja = suscribirFuncionalidadNoDisponible(clave => claves.push(clave));
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(404, { message: 'Esta función todavía no está disponible para tu cuenta.', codigo: 'FUNCIONALIDAD_NO_DISPONIBLE', funcionalidad: 'eventos' });
    const e = await apiFetch('/api/v1/calendar/events').catch(x => x);
    baja();
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).esFuncionalidadNoDisponible).toBe(true);
    expect(claves).toEqual(['eventos']);
    // Lo que haría una pantalla cualquiera con el error:
    Alert.alert('No se pudo cargar', (e as ApiError).message);
    avisar('No se pudo cargar', 'Inténtalo de nuevo.');
    expect(nativo).not.toHaveBeenCalled();
  });

  it('una confirmación nunca se traga (quien la abrió espera la respuesta), y pasada la ventana todo vuelve a mostrarse', async () => {
    let ahora = 1_000;
    usarRelojDeErroresSinDialogo(() => ahora);
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(404, { message: 'No disponible.', codigo: 'FUNCIONALIDAD_NO_DISPONIBLE', funcionalidad: 'ranking' });
    await apiFetch('/api/v1/ranking').catch(() => undefined);
    Alert.alert('¿Seguro?', 'Se borra.', [{ text: 'Cancelar', style: 'cancel', onPress: () => undefined }, { text: 'Sí', onPress: () => undefined }]);
    expect(nativo).toHaveBeenCalledTimes(1);
    ahora += VENTANA_DEL_DIALOGO_MS + 1;
    Alert.alert('Otro error', 'Algo distinto.');
    expect(nativo).toHaveBeenCalledTimes(2);
  });

  it('un 404 cualquiera (sin el código) sigue siendo un error normal, con su diálogo', async () => {
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(404, { message: 'No existe.' });
    const e = await apiFetch('/api/v1/algo').catch(x => x);
    Alert.alert('No se pudo', (e as ApiError).message);
    expect(nativo).toHaveBeenCalledTimes(1);
  });

  it('un 403 MODO_SOLO_LECTURA se avisa a la franja de «ver como» y no abre diálogo', async () => {
    const mensajes: (string | null)[] = [];
    const baja = suscribirModoSoloLectura(m => mensajes.push(m));
    const nativo = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    servidor(403, { message: 'Estás viendo la app como otro rol: no se puede cambiar nada.', codigo: 'MODO_SOLO_LECTURA' });
    const e = await apiFetch('/api/v1/wall', { method: 'POST', body: {} }).catch(x => x);
    baja();
    expect((e as ApiError).esModoSoloLectura).toBe(true);
    expect(mensajes).toEqual(['Estás viendo la app como otro rol: no se puede cambiar nada.']);
    Alert.alert('No se pudo publicar', (e as ApiError).message);
    expect(nativo).not.toHaveBeenCalled();
  });
});

describe('qué se esconde (lógica pura)', () => {
  const SECCIONES = [{ id: 'muro' }, { id: 'eventos' }, { id: 'classroom' }, { id: 'tribu' }, { id: 'ranking' }, { id: 'testimonios' }];
  const sin = (...claves: string[]) => (clave: string | null | undefined) => !clave || !claves.some(c => clave === c || clave.startsWith(`${c}.`));

  it('la fila de medallones deja fuera lo no disponible, en su orden', () => {
    expect(seccionesDisponibles(SECCIONES, sin('eventos', 'ranking')).map(s => s.id)).toEqual(['muro', 'classroom', 'tribu', 'testimonios']);
  });

  it('Testimonios (sin interruptor) no sostiene la pestaña sola: sin nada más, la lista sale vacía', () => {
    expect(seccionesDisponibles(SECCIONES, sin('muro', 'eventos', 'cursos', 'chat', 'ranking'))).toEqual([]);
  });

  it('si la sección abierta se esconde, se muestra la primera que queda', () => {
    const visibles = seccionesDisponibles(SECCIONES, sin('muro'));
    expect(seccionQueSeMuestra('muro', visibles)).toBe('eventos');
    expect(seccionQueSeMuestra('ranking', visibles)).toBe('ranking');
    expect(seccionQueSeMuestra('muro', [])).toBe('muro');
  });

  it('la lista de chats deja fuera los tipos no disponibles', () => {
    const conversaciones = [{ id: 1, type: 'celula' }, { id: 2, type: 'global' }, { id: 3, type: 'direct' }, { id: 4, type: 'soporte' }];
    expect(conversacionesDisponibles(conversaciones, sin('chat.directos', 'chat.grupos')).map(c => c.id)).toEqual([2, 4]);
    expect(conversacionesDisponibles(conversaciones, sin('chat'))).toEqual([]);
  });
});

describe('las entradas no se dibujan (componentes con el proveedor)', () => {
  const propuesta = { id: 'p-1', resumen: 'Marcar «Agua» como hecho', venceEn: '2999-01-01T00:00:00Z', estado: 'pendiente' as const };

  it('el botón de SER del curso no se dibuja, ni el aviso de mantenimiento', async () => {
    await montarCon(['ia'], React.createElement(ChatDelCurso, { cursoTitulo: 'Respiración' }));
    expect(textos()).toEqual([]);
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Preguntarle a SER sobre este curso')).toHaveLength(0);
    expect(hayAviso()).toBe(false);
  });

  it('no disponible gana a apagado: nada de aviso', async () => {
    await montarCon(['ia.chat'], React.createElement(ChatDelCurso, { cursoTitulo: 'Respiración' }), [{ clave: 'ia.chat', aviso: 'Vuelve pronto.' }]);
    expect(hayAviso()).toBe(false);
  });

  it('la propuesta de SER sin «Confirmar» ni el aviso, con su texto', async () => {
    await montarCon(['ia.propuestas'], React.createElement(TarjetaPropuesta, { propuesta, onConfirmar: jest.fn(), onCancelar: jest.fn() }));
    expect(textos()).toContain('Marcar «Agua» como hecho');
    expect(textos()).not.toContain('Confirmar');
    expect(hayAviso()).toBe(false);
  });

  it('SiEstaDisponible dibuja o no lo de adentro; useFuncionalidad dice `disponible`', async () => {
    const Sonda = () => {
      const f = useFuncionalidad('caja');
      return React.createElement(Text, null, `caja:${f.disponible}:${f.prendida}`);
    };
    await montarCon(['caja'], React.createElement(React.Fragment, null,
      React.createElement(SiEstaDisponible, { clave: 'caja', children: React.createElement(Text, null, 'Tu Caja Renaser') }),
      React.createElement(SiEstaDisponible, { clave: 'muro', children: React.createElement(Text, null, 'Muro') }),
      React.createElement(Sonda),
    ));
    expect(textos()).toEqual(['Muro', 'caja:false:true']);
  });

  it('el texto neutro de una pestaña vacía, sin el ícono de mantenimiento', async () => {
    await montarCon([], React.createElement(SeccionNoDisponible));
    expect(textos()).toEqual([TEXTO_SECCION_NO_DISPONIBLE]);
    expect(TEXTO_SECCION_NO_DISPONIBLE).toBe('Esta sección todavía no está disponible para tu cuenta.');
    expect(hayAviso()).toBe(false);
  });
});

describe('las pantallas esconden lo no disponible (código)', () => {
  const RAIZ = path.resolve(__dirname, '../../../..');
  const leer = (archivo: string) => fs.readFileSync(path.join(RAIZ, archivo), 'utf8');

  it('Comunidad: medallones, sección abierta, «Publicar», chats, sala y adjuntos', () => {
    const comunidad = leer('src/screens/ComunidadScreen.tsx');
    expect(comunidad).toMatch(/seccionesDisponibles\(SECCIONES, esDisponible\)/);
    expect(comunidad).toMatch(/const seccionActiva = seccionQueSeMuestra\(seccionElegida, seccionesVisibles\);/);
    expect(comunidad).toMatch(/\{seccionesVisibles\.map\(s => \{/);
    expect(comunidad).toMatch(/if \(comunidadSinSecciones\) \{[\s\S]*?<SeccionNoDisponible/);
    expect(comunidad).toMatch(/\{publicarEnElMuro\.disponible && publicarEnElMuro\.prendida \? \(/);
    expect(comunidad).toMatch(/conversacionesDisponibles\(conversations, esDisponible\)/);
    expect(comunidad).toMatch(/if \(activeChat && !chatDeLaSala\.disponible\) \{/);
    expect(comunidad).toMatch(/\{fotosDelChat\.disponible \? \(/);
    expect(comunidad).toMatch(/\) : !audioDelChat\.disponible \? \(/);
  });

  it('Training, Hoy, Yo, SER y Administración', () => {
    expect(leer('src/screens/TrainingScreen.tsx')).toMatch(/if \(!habitosPrendidos\.disponible\) \{\s*return \([\s\S]*?<SeccionNoDisponible/);
    const hoy = leer('src/screens/HoyScreen.tsx');
    expect(hoy).toMatch(/resumen\?\.proximoEvento && esDisponible\(CLAVES\.eventos\)/);
    // La tarjeta del semáforo pasó de Hoy a Yo (2026-10-31): la entrada apagada o no disponible se esconde allá.
    expect(hoy).not.toMatch(/esDisponible\(CLAVES\.semaforo\)\) \? \(\s*<TarjetaSemaforoHoy/);
    const yo = leer('src/screens/YoScreen.tsx');
    expect(yo).toMatch(/resumen\?\.semaforo && esDisponible\(CLAVES\.semaforo\)/);
    // «Mi grupo» y «Mis mentores» (2026-10-31: antes eran tarjetas de Hoy) son filas de Yo y siguen las mismas entradas de Soporte TI.
    const paneles = leer('src/features/paneles-de-rol/hooks/usePanelesDeRol.ts');
    for (const clave of ['mentorMiGrupo', 'lider', 'tickets', 'semaforo']) {
      expect(paneles).toMatch(new RegExp(`esDisponible\\(CLAVES\\.${clave}\\)`));
    }
    expect(yo).toMatch(/paneles\.filas\.miGrupo/);
    expect(yo).toMatch(/paneles\.filas\.misMentores/);
    for (const clave of ['caja', 'admin', 'emergencia', 'evidencias', 'notificaciones', 'perfil', 'cuentaEliminar']) {
      expect(yo).toMatch(new RegExp(`esDisponible\\(CLAVES\\.${clave}\\)`));
    }
    // «Eliminar mi cuenta» nunca se esconde (Google Play): sin la pantalla de la app, abre la página pública.
    expect(yo).not.toMatch(/\{esDisponible\(CLAVES\.cuentaEliminar\) \? \(\s*<FilaDeAjuste/);
    expect(yo).toMatch(/esDisponible\(CLAVES\.cuentaEliminar\) \? setEliminandoCuenta\(true\) : void abrirEliminarCuentaEnLaWeb\(\)/);
    expect(leer('src/features/renasia/components/RenasiaLauncher.tsx')).toMatch(/!hayChatEnPantalla && !mapaAbierto && chatDeSer\.disponible &&/);
    expect(leer('src/features/renasia/screens/RenasiaPanel.tsx')).toMatch(/if \(visible && !serDisponible\) onClose\(\);/);
    expect(leer('src/features/admin/screens/MasOpcionesScreen.tsx')).toMatch(/enLaApp\.filter\(item => esDisponible\(item\.clave\)\)/);
  });
});
