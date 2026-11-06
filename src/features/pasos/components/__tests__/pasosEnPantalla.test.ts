/**
 * Lo que la persona ve de los pasos (spec 037, D-310; maqueta aprobada del 2026-11-02): la línea bajo «Kilómetros diarios», la hoja para
 * conectar (con su cara de «Sube tu captura» para Android menor a 14 y la web), y la hoja de los km con la meta, las fuentes y «Registrar».
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockAbrirPolitica = jest.fn<() => Promise<void>>();
jest.mock('../../../legal/enlacesLegales', () => ({ abrirPoliticaDePrivacidad: () => mockAbrirPolitica() }));

import { HojaConectarPasos } from '../HojaConectarPasos';
import { HojaDeKilometros } from '../HojaDeKilometros';
import { LineaDeKilometros } from '../LineaDeKilometros';
import type { FuenteDeLosPasos } from '../../types/pasos.types';
import type { AvanceDeKilometros, VistaDeKilometros } from '../../utils/vistaDeKilometros';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NBSP = ' ';
const TELEFONO: FuenteDeLosPasos = { paquete: 'com.android.healthconnect.phone.x', etiqueta: 'Tu teléfono', dispositivo: 'TELEFONO' };
const RELOJ: FuenteDeLosPasos = { paquete: 'com.sec.android.app.shealth', etiqueta: 'Galaxy Watch', dispositivo: 'RELOJ' };

const avance = (extra: Partial<AvanceDeKilometros> = {}): VistaDeKilometros => ({
  modo: 'avance',
  km: 3.2,
  pasos: 4200,
  meta: 5,
  metaLista: false,
  aproximado: false,
  fuente: TELEFONO,
  fuentes: [TELEFONO],
  noSumadas: [],
  leidoEn: new Date(2026, 10, 4, 17, 8),
  conectadoHoyA: null,
  ...extra,
});

let raiz: ReactTestRenderer | null = null;
const montar = (elemento: React.ReactElement) => {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
};
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const textosDe = (n: ReactTestInstance) => textosDeNodos(n.findAll(() => true));
/** Un botón por su etiqueta de lector de pantalla o por el texto que dibuja. */
const boton = (etiqueta: string): ReactTestInstance | undefined =>
  raiz!.root.findAll(n => typeof n.props.onPress === 'function' && (n.props.accessibilityLabel === etiqueta || textosDe(n) === etiqueta))[0];
const estiloPlano = (estilo: unknown) => Object.assign({}, ...[estilo].flat(3).filter(Boolean));
/** El ancho del relleno de la barra: el primer nodo de adentro con un `width` en su estilo. */
const anchoDelRelleno = (barra: ReactTestInstance) => estiloPlano(barra.findAll(n => estiloPlano(n.props.style).width !== undefined)[0].props.style).width;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockAbrirPolitica.mockReset();
});

describe('la línea bajo «Kilómetros diarios»', () => {
  const acciones = () => ({ onConectar: jest.fn(), onActualizar: jest.fn() });

  it('la fila de siempre (captura) no dibuja nada', () => {
    montar(React.createElement(LineaDeKilometros, { vista: { modo: 'captura' }, ...acciones() }));
    expect(raiz!.toJSON()).toBeNull();
  });

  // spec 037 FR-015
  it('sin conectar: «Cuenta tus pasos solo ›», de 48 de alto, y abre la hoja para conectar', () => {
    const a = acciones();
    montar(React.createElement(LineaDeKilometros, { vista: { modo: 'ofrecer', soporte: 'disponible' }, ...a }));
    const enlace = boton('Cuenta tus pasos solo')!;
    expect(enlace).toBeDefined();
    expect(estiloPlano(enlace.props.style).minHeight).toBeGreaterThanOrEqual(48);
    act(() => enlace.props.onPress());
    expect(a.onConectar).toHaveBeenCalledTimes(1);
  });

  it('en curso: la barra, «3,2 de 5 km» y la fuente', () => {
    montar(React.createElement(LineaDeKilometros, { vista: avance(), ...acciones() }));
    expect(textos()).toContain(`3,2 de 5${NBSP}km`);
    expect(textos()).toContain('Tu teléfono');
    const barra = raiz!.root.findAll(n => n.props.accessibilityRole === 'progressbar')[0];
    expect(barra.props.accessibilityValue).toMatchObject({ min: 0, max: 500, now: 320 });
    expect(anchoDelRelleno(barra)).toBe('64%');
  });

  it('con la meta lista: «5,4 km · ¡Meta lista!» con la barra llena', () => {
    montar(React.createElement(LineaDeKilometros, { vista: avance({ km: 5.4, metaLista: true }), ...acciones() }));
    expect(textos()).toContain(`5,4${NBSP}km · ¡Meta lista!`);
    const barra = raiz!.root.findAll(n => n.props.accessibilityRole === 'progressbar')[0];
    expect(anchoDelRelleno(barra)).toBe('100%');
  });

  it('sin pasos hoy: lo dice y ofrece «Actualizar»', () => {
    const a = acciones();
    montar(React.createElement(LineaDeKilometros, { vista: { modo: 'sin-datos', hayManuales: false }, ...a }));
    expect(textos()).toContain('Todavía no vemos pasos hoy');
    act(() => boton('Actualizar')!.props.onPress());
    expect(a.onActualizar).toHaveBeenCalledTimes(1);
  });

  it('sin permiso: «Perdimos tus pasos»', () => {
    montar(React.createElement(LineaDeKilometros, { vista: { modo: 'sin-permiso' }, ...acciones() }));
    expect(textos()).toContain('Perdimos tus pasos');
  });

  it('ya cumplido: solo cuántos km', () => {
    montar(React.createElement(LineaDeKilometros, { vista: { modo: 'cumplido', km: 5.4, origen: 'HEALTH_CONNECT', fuente: 'Galaxy Watch' }, ...acciones() }));
    expect(textos()).toBe(`5,4${NBSP}km`);
  });
});

describe('la hoja para conectar', () => {
  const props = (extra: Record<string, unknown> = {}) => ({
    visible: true,
    soporte: 'disponible' as const,
    conectar: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    fuente: null,
    desdeLasHoy: null,
    onCerrar: jest.fn(),
    onSubirCaptura: jest.fn(),
    onAbrirHealthConnect: jest.fn(),
    ...extra,
  });

  it('dice qué se lee y quién lo ve, con «Conectar» y «Ahora no», y no ofrece instalar nada', () => {
    montar(React.createElement(HojaConectarPasos, props()));
    expect(textos()).toContain('Cuenta tus km solo');
    expect(textos()).toContain('Con Health Connect, de Google.');
    expect(textos()).toContain('Tu teléfono o tu reloj cuentan los pasos.');
    expect(textos()).toContain('Renaser solo lee pasos y distancia.');
    expect(textos()).toContain('Tu mentor y la tabla de kilómetros ven tu total de km.');
    expect(boton('Conectar')).toBeDefined();
    expect(boton('Ahora no')).toBeDefined();
    expect(textos()).not.toMatch(/Instalar|Instala |Play Store/i);
  });

  it('«Conectar» pide el permiso y, si lo dejan, la hoja dice «Ya contamos tus pasos» con la fuente', async () => {
    const p = props({ fuente: 'Tu teléfono', desdeLasHoy: '14:05' });
    montar(React.createElement(HojaConectarPasos, p));

    await act(async () => {
      boton('Conectar')!.props.onPress();
    });

    expect(p.conectar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Ya contamos tus pasos');
    expect(textos()).toContain('Tu teléfono');
    expect(textos()).toContain('Hoy contamos desde las 14:05.');
    expect(boton('Listo')).toBeDefined();
    act(() => boton('Listo')!.props.onPress());
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
  });

  it('si no dejan el permiso, lo dice y ofrece abrir Health Connect; no dice que quedó conectado', async () => {
    const p = props({ conectar: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) });
    montar(React.createElement(HojaConectarPasos, p));

    await act(async () => {
      boton('Conectar')!.props.onPress();
    });

    expect(textos()).toContain('No pudimos conectar tus pasos. Intenta de nuevo.');
    expect(textos()).not.toContain('Ya contamos tus pasos');
    act(() => boton('Abrir Health Connect')!.props.onPress());
    expect(p.onAbrirHealthConnect).toHaveBeenCalledTimes(1);
  });

  // spec 037 FR-003 (issue #137): el diálogo contestó «no» mientras la persona elegía; la app termina de conectar al volver.
  it('si la conexión queda anotada aunque el diálogo dijo que no, la hoja pasa a «Ya contamos tus pasos» sin otro toque', async () => {
    const p = props({ conectar: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) });
    montar(React.createElement(HojaConectarPasos, p));
    await act(async () => {
      boton('Conectar')!.props.onPress();
    });
    expect(textos()).toContain('No pudimos conectar tus pasos. Intenta de nuevo.');

    act(() => raiz!.update(React.createElement(HojaConectarPasos, { ...p, conectada: true })));

    expect(textos()).toContain('Ya contamos tus pasos');
    expect(textos()).not.toContain('No pudimos conectar tus pasos. Intenta de nuevo.');
    expect(boton('Conectar')).toBeUndefined();
    expect(p.conectar).toHaveBeenCalledTimes(1);
  });

  it('«Ahora no» cierra sin pedir nada', () => {
    const p = props();
    montar(React.createElement(HojaConectarPasos, p));
    act(() => boton('Ahora no')!.props.onPress());
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
    expect(p.conectar).not.toHaveBeenCalled();
  });

  it('la política de privacidad se abre desde la hoja', () => {
    montar(React.createElement(HojaConectarPasos, props()));
    act(() => boton('Política de privacidad')!.props.onPress());
    expect(mockAbrirPolitica).toHaveBeenCalledTimes(1);
  });

  it('Android menor a 14, sin Health Connect o iPhone web: «Sube tu captura», sin «Conectar» y sin instalar nada (pantalla 3.4)', () => {
    const p = props({ soporte: 'no-disponible' });
    montar(React.createElement(HojaConectarPasos, p));
    expect(textos()).toContain('Sube tu captura');
    expect(textos()).toContain('Los pasos automáticos son solo para Android 14 o más.');
    expect(boton('Conectar')).toBeUndefined();
    expect(textos()).not.toMatch(/Instalar|Instala |Play Store/i);
    act(() => boton('Subir captura')!.props.onPress());
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
    expect(p.conectar).not.toHaveBeenCalled();
  });
});

describe('la hoja de los km', () => {
  const props = (vista: VistaDeKilometros, extra: Record<string, unknown> = {}) => ({
    visible: true,
    titulo: 'Kilómetros diarios',
    subtitulo: 'Cuerpo · 17:00 · 8 pts',
    vista,
    registrando: false,
    onRegistrar: jest.fn(),
    onActualizar: jest.fn(),
    onDesconectar: jest.fn(),
    onAbrirHealthConnect: jest.fn(),
    onSubirCaptura: jest.fn(),
    onCerrar: jest.fn(),
    ...extra,
  });

  it('con la meta lista: el número grande, los pasos, la meta, la fuente y «Registrar 5,4 km»', () => {
    const p = props(avance({ km: 5.4, pasos: 7120, metaLista: true, aproximado: true }));
    montar(React.createElement(HojaDeKilometros, p));
    expect(textos()).toContain('5,4');
    expect(textos()).toContain(`7${NBSP}120${NBSP}pasos · aprox.`);
    expect(textos()).toContain(`Meta: 5${NBSP}km`);
    expect(textos()).toContain('Fuente');
    expect(textos()).toContain('Última lectura');
    expect(textos()).toContain('17:08');
    act(() => boton(`Registrar 5,4${NBSP}km`)!.props.onPress());
    expect(p.onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('en curso no hay botón de registro; sí «Actualizar» y «Desconectar»', () => {
    const p = props(avance());
    montar(React.createElement(HojaDeKilometros, p));
    expect(textos()).not.toContain('Registrar');
    act(() => boton('Actualizar')!.props.onPress());
    expect(p.onActualizar).toHaveBeenCalledTimes(1);
    act(() => boton('Desconectar')!.props.onPress());
    expect(p.onDesconectar).toHaveBeenCalledTimes(1);
  });

  it('con dos fuentes: cuál se usa, cuál no se suma y por qué (pantalla 3.3)', () => {
    const p = props(avance({ km: 5.9, metaLista: true, fuente: RELOJ, fuentes: [RELOJ], noSumadas: [TELEFONO] }));
    montar(React.createElement(HojaDeKilometros, p));
    expect(textos()).toContain('Fuentes de hoy');
    expect(textos()).toContain('Galaxy Watch');
    expect(textos()).toContain('La usamos');
    expect(textos()).toContain('Tu teléfono');
    expect(textos()).toContain('No se suma');
    expect(textos()).toContain('Contamos una sola vez: la fuente que pusiste primero en Health Connect.');
    act(() => boton('Cambiar prioridad')!.props.onPress());
    expect(p.onAbrirHealthConnect).toHaveBeenCalledTimes(1);
  });

  it('sin permiso: «Abrir Health Connect» y la captura (pantalla 3.1)', () => {
    const p = props({ modo: 'sin-permiso' });
    montar(React.createElement(HojaDeKilometros, p));
    expect(textos()).toContain('Perdimos tus pasos');
    expect(textos()).toContain('Quitaste el permiso en Health Connect.');
    act(() => boton('Abrir Health Connect')!.props.onPress());
    expect(p.onAbrirHealthConnect).toHaveBeenCalledTimes(1);
    act(() => boton('Subir captura')!.props.onPress());
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
  });

  it('sin pasos hoy: qué revisar, «Actualizar» y la captura (pantalla 3.2)', () => {
    const p = props({ modo: 'sin-datos', hayManuales: false });
    montar(React.createElement(HojaDeKilometros, p));
    expect(textos()).toContain('Todavía no vemos pasos hoy');
    expect(textos()).toContain('Lleva tu teléfono contigo o revisa que tu reloj sincronice.');
    act(() => boton('Actualizar')!.props.onPress());
    expect(p.onActualizar).toHaveBeenCalledTimes(1);
    expect(boton('Subir captura')).toBeDefined();
  });

  it('con pasos escritos a mano descartados, lo dice', () => {
    montar(React.createElement(HojaDeKilometros, props({ modo: 'sin-datos', hayManuales: true })));
    expect(textos()).toContain('Los pasos escritos a mano no cuentan.');
  });

  it('la captura, lo que se ofrece y lo ya cumplido no abren esta hoja', () => {
    for (const vista of [{ modo: 'captura' }, { modo: 'ofrecer', soporte: 'disponible' }, { modo: 'cumplido', km: 5, origen: null, fuente: null }] as VistaDeKilometros[]) {
      montar(React.createElement(HojaDeKilometros, props(vista)));
      expect(raiz!.toJSON()).toBeNull();
      act(() => raiz?.unmount());
    }
  });
});
