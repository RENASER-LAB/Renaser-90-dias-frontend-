/**
 * El despliegue progresivo en la consola Soporte TI (spec 002, fase 2, contrato `fase-2.md` §3.4): escalones 5 / 25 /
 * 50 / 100, bajar un escalón, probadores, el gráfico de 24 h y lo crítico con contraseña (también ante un 428). Contra
 * el contrato, con `fetch` simulado (el backend lo hace otro agente en paralelo).
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
import { buscarPersonas, cambiarDespliegue, desbloquear, leerDespliegue, quitarProbador, sumarProbador } from '../api/soporteTiApi';
import type { DespliegueApi, FuncionalidadConsola } from '../api/soporteTiSchemas';
import { GraficoDeHoras } from '../components/GraficoDeHoras';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import { cerrarConsola } from '../estado/sesionDeConsola';
import { DespliegueConsolaScreen } from '../screens/DespliegueConsolaScreen';
import { agruparPorArea } from '../utils/consola';
import {
  cifra,
  escalonAnterior,
  escalonSiguiente,
  esEscalonCritico,
  faltaParaElEscalon,
  horasDeMetricas,
  porcentajeDeErrores,
  porcentajeVigente,
  queHaceElCambio,
  resumenDelDespliegue,
  textoDelBotonDeEscalon,
  textoDeDespliegueEnLaLista,
  topeDelEje,
  totales,
} from '../utils/despliegue';

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

function funcionalidad(parcial: Partial<FuncionalidadConsola> = {}): FuncionalidadConsola {
  return {
    clave: 'eventos',
    madre: null,
    area: 'Comunidad',
    nombre: 'Eventos',
    rolesQueLaUsan: ['TRAINEE', 'MENTOR'],
    critica: false,
    prendidaGlobal: true,
    porRol: {},
    version: 4,
    ...parcial,
  };
}

const HORAS = Array.from({ length: 24 }, (_, i) => ({
  hora: new Date(Date.UTC(2026, 9, 14, i)).toISOString(),
  dentro: { pedidos: 10 + i, errores: i === 5 ? 2 : 0 },
  fuera: { pedidos: 30 + i, errores: 0 },
}));

function despliegue(parcial: Partial<DespliegueApi> = {}): DespliegueApi {
  return {
    clave: 'eventos',
    enDespliegue: true,
    porcentaje: 25,
    version: 3,
    iniciadoEn: '2026-10-14T10:00:00Z',
    actualizadoPor: { id: 'u-ti', nombre: 'Ricardo' },
    actualizadoEn: '2026-10-14T12:00:00Z',
    probadores: [{ id: 'p-1', nombre: 'Ana Pérez', email: 'ana@renaser.pe' }],
    metricas: HORAS,
    ...parcial,
  };
}

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

describe('lo que decide el despliegue (lógica pura)', () => {
  it('escalones: siguiente, anterior y qué hace cada cambio', () => {
    expect(escalonSiguiente(5)).toBe(25);
    expect(escalonSiguiente(50)).toBe(100);
    expect(escalonSiguiente(30)).toBe(50);
    expect(escalonSiguiente(null)).toBeNull();
    expect(escalonAnterior(50)).toBe(25);
    expect(escalonAnterior(5)).toBe(0);
    expect(escalonAnterior(0)).toBeNull();
    expect(queHaceElCambio(null, 5)).toBe('empezar');
    expect(queHaceElCambio(null, 100)).toBe('nada');
    expect(queHaceElCambio(25, 50)).toBe('subir');
    expect(queHaceElCambio(25, 5)).toBe('bajar');
    expect(queHaceElCambio(25, 100)).toBe('prender_para_todos');
    expect(queHaceElCambio(25, 25)).toBe('nada');
  });

  it('el texto del botón', () => {
    expect(textoDelBotonDeEscalon(null, 0)).toBe('Empezar solo con probadores');
    expect(textoDelBotonDeEscalon(null, 5)).toBe('Empezar en 5 %');
    expect(textoDelBotonDeEscalon(25, 50)).toBe('Subir a 50 %');
    expect(textoDelBotonDeEscalon(5, 0)).toBe('Bajar a solo probadores');
    expect(textoDelBotonDeEscalon(50, 100)).toBe('Prender para todos');
  });

  it('crítico: empezar o bajar algo crítico, y empezar en 0 % cualquiera', () => {
    expect(esEscalonCritico({ critica: false }, null, 5)).toBe(false);
    expect(esEscalonCritico({ critica: false }, null, 0)).toBe(true);
    expect(esEscalonCritico({ critica: false }, 25, 5)).toBe(false);
    expect(esEscalonCritico({ critica: true }, null, 25)).toBe(true);
    expect(esEscalonCritico({ critica: true }, 25, 5)).toBe(true);
    expect(esEscalonCritico({ critica: true }, 25, 50)).toBe(false);
    expect(esEscalonCritico({ critica: true }, 50, 100)).toBe(false);
  });

  it('el motivo es obligatorio y hay que elegir otro escalón', () => {
    expect(faltaParaElEscalon(25, null, 'x')).toMatch(/escalón/);
    expect(faltaParaElEscalon(25, 25, 'x')).toMatch(/escalón/);
    expect(faltaParaElEscalon(25, 50, '  ')).toMatch(/motivo/);
    expect(faltaParaElEscalon(25, 50, 'Sin errores')).toBeNull();
  });

  it('el estado en palabras, en la lista y en la pantalla', () => {
    expect(textoDeDespliegueEnLaLista(funcionalidad({ despliegue: { porcentaje: 25, probadores: 3 } }))).toBe('En despliegue · 25 %');
    expect(textoDeDespliegueEnLaLista(funcionalidad({ despliegue: { porcentaje: 0, probadores: 3 } }))).toBe('En despliegue · solo probadores');
    expect(textoDeDespliegueEnLaLista(funcionalidad({ despliegue: null }))).toBeNull();
    expect(textoDeDespliegueEnLaLista(funcionalidad())).toBeNull();
    expect(resumenDelDespliegue(25, 3)).toBe('25 % de las personas, más 3 probadores.');
    expect(resumenDelDespliegue(0, 1)).toBe('Solo el probador.');
    expect(resumenDelDespliegue(null, 0)).toMatch(/la tienen todos/);
    expect(porcentajeVigente(despliegue({ enDespliegue: false }))).toBeNull();
    expect(porcentajeVigente(despliegue({ porcentaje: 100 }))).toBeNull();
    expect(porcentajeVigente(despliegue())).toBe(25);
  });

  it('las métricas: en orden, sin nulos, con totales y porcentaje de errores', () => {
    const desordenadas = [
      { hora: '2026-10-14T02:00:00Z', dentro: { pedidos: 4, errores: 1 }, fuera: null },
      { hora: 'roto', dentro: { pedidos: 9, errores: 9 } },
      { hora: '2026-10-14T01:00:00Z', dentro: { pedidos: 6, errores: null }, fuera: { pedidos: 10, errores: 0 } },
    ];
    const horas = horasDeMetricas(desordenadas);
    expect(horas.map(h => h.hora)).toEqual(['2026-10-14T01:00:00Z', '2026-10-14T02:00:00Z']);
    expect(horas[1].fuera).toEqual({ pedidos: 0, errores: 0 });
    expect(totales(horas, 'dentro')).toEqual({ pedidos: 10, errores: 1, porcentajeDeErrores: 10 });
    expect(totales(horas, 'fuera').porcentajeDeErrores).toBe(0);
    expect(totales([], 'fuera').porcentajeDeErrores).toBeNull();
    expect(porcentajeDeErrores(null)).toBe('—');
    expect(porcentajeDeErrores(0.04)).toBe('< 0,1 %');
    expect(topeDelEje(0)).toBe(1);
    expect(topeDelEje(37)).toBe(50);
    expect(topeDelEje(120)).toBe(200);
    expect(cifra(1284)).toMatch(/^1.?284$/);
  });

  it('la lista filtra lo que está en despliegue', () => {
    const todas = [funcionalidad({ despliegue: { porcentaje: 5, probadores: 0 } }), funcionalidad({ clave: 'muro', nombre: 'Muro' })];
    expect(agruparPorArea(todas, '', 'despliegue').flatMap(g => g.funcionalidades.map(f => f.clave))).toEqual(['eventos']);
  });
});

describe('API del despliegue', () => {
  it('lee, cambia con versión y reautenticación, suma y quita probadores y busca personas', async () => {
    servidor(() => ok(despliegue()));
    await leerDespliegue('eventos');
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/funcionalidades/eventos/despliegue');
    expect(pedidos[0].headers['X-Consola-Token']).toBe('tok-1');

    await cambiarDespliegue('eventos', { porcentaje: 50, motivo: 'Sin errores', version: 3 }, 'reaut-1');
    expect(pedidos[1]).toMatchObject({ method: 'PUT', body: { porcentaje: 50, motivo: 'Sin errores', version: 3 } });
    expect(pedidos[1].headers['X-Reautenticacion']).toBe('reaut-1');

    servidor(() => ok());
    await sumarProbador('eventos', 'u 7');
    expect(pedidos[0]).toMatchObject({ method: 'PUT', body: {} });
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/funcionalidades/eventos/despliegue/probadores/u%207');
    await quitarProbador('eventos', 'u-7');
    expect(pedidos[1].method).toBe('DELETE');

    servidor(() => ok([{ id: 'p-2', nombre: 'José', email: 'jose@renaser.pe', rol: 'MENTOR' }]));
    expect((await buscarPersonas(' josé ')).map(p => p.id)).toEqual(['p-2']);
    expect(ruta(pedidos[0])).toBe('/api/v1/soporte-ti/personas?q=jos%C3%A9');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// La pantalla
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
const MOTIVO = 'Ej.: Sin errores en las últimas 24 horas.';

async function montar(f: FuncionalidadConsola, responder: (p: Pedido) => Respuesta) {
  servidor(responder);
  const props = { funcionalidad: f, onCambiado: jest.fn(), onBloqueada: jest.fn(), onVolver: jest.fn() };
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(DespliegueConsolaScreen, props));
  });
  return props;
}

describe('la pantalla del despliegue', () => {
  it('muestra el escalón de ahora, los probadores y las cifras de 24 h', async () => {
    await montar(funcionalidad(), () => ok(despliegue()));
    expect(textos()).toEqual(expect.arrayContaining(['25 %', '25 % de las personas, más 1 probador.', 'Ana Pérez', 'Probadores (1)', 'Pedidos por hora']));
    expect(textos()).toContain('25 % · ahora');
  });

  it('subir un escalón (no crítico) guarda directo, con la versión, y avisa a la lista', async () => {
    const props = await montar(funcionalidad(), p =>
      p.method === 'PUT' ? ok(despliegue({ porcentaje: 50, version: 4 })) : ok(despliegue()),
    );
    await presionar('50 %');
    await escribir(MOTIVO, 'Sin errores');
    await presionar('Subir a 50 %');
    const put = pedidos.find(p => p.method === 'PUT')!;
    expect(put.body).toEqual({ porcentaje: 50, motivo: 'Sin errores', version: 3 });
    expect(put.headers['X-Reautenticacion']).toBeUndefined();
    expect(props.onCambiado).toHaveBeenCalledWith({ porcentaje: 50, probadores: 1 });
    expect(textos()).toContain('Listo: 50 %. Rige en unos segundos.');
  });

  it('«Prender para todos» manda 100 y deja la funcionalidad sin despliegue', async () => {
    const props = await montar(funcionalidad(), p =>
      p.method === 'PUT' ? ok({ clave: 'eventos', enDespliegue: false }) : ok(despliegue()),
    );
    await presionar('Para todos');
    await escribir(MOTIVO, 'Listo para todos');
    await presionar('Prender para todos');
    expect(pedidos.find(p => p.method === 'PUT')!.body).toMatchObject({ porcentaje: 100 });
    expect(props.onCambiado).toHaveBeenCalledWith(null);
  });

  it('bajar un escalón de algo crítico pide la contraseña y guarda con X-Reautenticacion', async () => {
    await montar(funcionalidad({ critica: true }), p => {
      if (ruta(p).endsWith('/desbloqueo')) return ok({ token: 'reaut-9' });
      return p.method === 'PUT' ? ok(despliegue({ porcentaje: 5 })) : ok(despliegue());
    });
    await presionar('5 %');
    await escribir(MOTIVO, 'Errores dentro');
    await presionar('Bajar a 5 % con contraseña');
    expect(hoja().props.visible).toBe(true);
    expect(pedidos.some(p => p.method === 'PUT')).toBe(false);
    await act(async () => {
      hoja().props.onConfirmar('secreta');
    });
    expect(pedidos.find(p => ruta(p).endsWith('/desbloqueo'))!.body).toEqual({ contrasena: 'secreta', para: 'CAMBIO_CRITICO' });
    expect(pedidos.find(p => p.method === 'PUT')!.headers['X-Reautenticacion']).toBe('reaut-9');
    expect(hoja().props.visible).toBe(false);
  });

  it('un 428 del servidor pide la contraseña; un 409 relee y avisa; sin motivo no sale nada', async () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    let respuestaDelPut: Respuesta = error(428, 'REAUTENTICACION_REQUERIDA');
    await montar(funcionalidad(), p => (p.method === 'PUT' ? respuestaDelPut : ok(despliegue())));
    await presionar('50 %');
    await presionar('Subir a 50 %');
    expect(alerta.mock.calls.at(-1)?.[0]).toBe('Falta algo para guardar');
    expect(pedidos.some(p => p.method === 'PUT')).toBe(false);

    await escribir(MOTIVO, 'Sin errores');
    await presionar('Subir a 50 %');
    expect(hoja().props.visible).toBe(true);
    await act(async () => {
      hoja().props.onCerrar();
    });

    respuestaDelPut = error(409);
    const lecturas = pedidos.filter(p => p.method === 'GET').length;
    await presionar('Subir a 50 %');
    expect(pedidos.filter(p => p.method === 'GET').length).toBe(lecturas + 1);
    expect(alerta.mock.calls.at(-1)?.[0]).toBe('Alguien lo cambió antes');
  });

  it('un 423 vuelve a la puerta', async () => {
    const props = await montar(funcionalidad(), p => (p.method === 'PUT' ? error(423, 'CONSOLA_BLOQUEADA') : ok(despliegue())));
    await presionar('50 %');
    await escribir(MOTIVO, 'x');
    await presionar('Subir a 50 %');
    expect(props.onBloqueada).toHaveBeenCalled();
  });

  it('busca y suma un probador; quitar pide confirmación', async () => {
    jest.useFakeTimers();
    try {
      let probadores = [{ id: 'p-1', nombre: 'Ana Pérez', email: 'ana@renaser.pe' }];
      const props = await montar(funcionalidad(), p => {
        const r = ruta(p);
        if (r.startsWith('/api/v1/soporte-ti/personas')) return ok([{ id: 'p-1', nombre: 'Ana Pérez' }, { id: 'p-2', nombre: 'José Díaz', email: 'jose@renaser.pe', rol: 'MENTOR' }]);
        if (r.endsWith('/probadores/p-2') && p.method === 'PUT') {
          probadores = [...probadores, { id: 'p-2', nombre: 'José Díaz', email: 'jose@renaser.pe' }];
          return ok();
        }
        if (r.endsWith('/probadores/p-1') && p.method === 'DELETE') {
          probadores = probadores.filter(x => x.id !== 'p-1');
          return { status: 204 };
        }
        return ok(despliegue({ probadores }));
      });
      await escribir('Sumar: busca por nombre o correo', 'jos');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      // Ana ya es probadora: no se ofrece otra vez.
      expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Sumar a Ana Pérez como probador')).toHaveLength(0);
      expect(textos()).toContain('jose@renaser.pe · Mentor');
      await presionar('Sumar a José Díaz como probador');
      expect(props.onCambiado).toHaveBeenLastCalledWith({ porcentaje: 25, probadores: 2 });
      expect(textos()).toContain('José Díaz ya es probador.');

      jest.spyOn(AlertNativo, 'alert').mockImplementation((_t, _m, botones) => {
        botones?.find(b => b.text === 'Quitar')?.onPress?.();
      });
      await presionar('Quitar a Ana Pérez de los probadores');
      expect(pedidos.some(p => p.method === 'DELETE' && ruta(p).endsWith('/probadores/p-1'))).toBe(true);
      expect(props.onCambiado).toHaveBeenLastCalledWith({ porcentaje: 25, probadores: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('sin despliegue: se empieza (crítico en 0 %) y no se ofrecen probadores todavía', async () => {
    await montar(funcionalidad(), () => ok({ clave: 'eventos', enDespliegue: false, metricas: [] }));
    expect(textos()).toContain('Para todos · ahora');
    expect(textos()).toContain('Para sumar probadores, primero empieza el despliegue (por ejemplo, «Solo probadores»).');
    await presionar('Solo probadores');
    expect(textos()).toContain('Empezar solo con probadores la esconde para todos los demás: te pide la contraseña.');
    expect(raiz!.root.findAll(n => n.props.etiqueta === 'Empezar solo con probadores con contraseña').length).toBeGreaterThan(0);
  });
});

describe('lo que se usa sin cuenta (contrato §3.4, aditivo del 2026-10-14)', () => {
  it('con `desplegable: false` no se ofrece empezar ni sumar probadores; sin el campo, sí', async () => {
    await montar(funcionalidad({ clave: 'registro', nombre: 'Solicitar acceso' }), () => ok({ clave: 'registro', enDespliegue: false, desplegable: false, metricas: [] }));
    expect(textos()).toContain('Se usa sin cuenta: no se puede desplegar por partes.');
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Solo probadores')).toHaveLength(0);
    expect(textos().some(x => x.startsWith('Probadores ('))).toBe(false);
    act(() => raiz?.unmount());

    await montar(funcionalidad(), () => ok({ clave: 'eventos', enDespliegue: false, metricas: [] }));
    expect(textos()).not.toContain('Se usa sin cuenta: no se puede desplegar por partes.');
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Solo probadores').length).toBeGreaterThan(0);
  });

  it('un 409 DESPLIEGUE_SIN_CUENTA muestra el mensaje del servidor (no es una versión vieja)', async () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    await montar(funcionalidad(), p =>
      p.method === 'PUT'
        ? { status: 409, cuerpo: { codigo: 'DESPLIEGUE_SIN_CUENTA', funcionalidad: 'eventos', message: 'Esta funcionalidad se usa sin cuenta; un despliegue no tendría efecto.' } }
        : ok({ clave: 'eventos', enDespliegue: false, metricas: [] }),
    );
    await presionar('5 %');
    await escribir(MOTIVO, 'Probar');
    await presionar('Empezar en 5 %');
    expect(alerta.mock.calls.at(-1)?.slice(0, 2)).toEqual(['No se puede desplegar', 'Esta funcionalidad se usa sin cuenta; un despliegue no tendría efecto.']);
  });
});

describe('el gráfico de 24 h', () => {
  it('dibuja las dos series con leyenda, y tocar elige la hora más cercana', async () => {
    const horas = horasDeMetricas(HORAS);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(GraficoDeHoras, { titulo: 'Pedidos por hora', horas, medida: 'pedidos' }));
    });
    expect(textos()).toEqual(expect.arrayContaining(['Dentro del despliegue', 'Fuera', 'Toca el gráfico para ver una hora.']));
    const [lienzo] = raiz!.root.findAll(n => n.props.accessibilityHint === 'Toca para ver una hora' && typeof n.props.onLayout === 'function');
    expect(lienzo.props.accessibilityLabel).toMatch(/dentro del despliegue .* pedidos, fuera .* pedidos/);
    await act(async () => {
      lienzo.props.onLayout({ nativeEvent: { layout: { width: 40 + 8 + 230, height: 132 } } });
    });
    await act(async () => {
      lienzo.props.onPress({ nativeEvent: { locationX: 40 + 230 } });
    });
    expect(textos().some(x => /· dentro 33 · fuera 53$/.test(x))).toBe(true);
  });

  it('sin datos lo dice', async () => {
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(GraficoDeHoras, { titulo: 'Errores por hora (5xx)', horas: [], medida: 'errores' }));
    });
    expect(textos()).toContain('Sin datos de las últimas 24 horas.');
  });
});
