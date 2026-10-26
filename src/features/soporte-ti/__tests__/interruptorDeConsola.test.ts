/**
 * El interruptor de la consola de Soporte TI (decisión del dueño, 2026-10-21): el riel de `Interruptor` con ✕ / ✓ dentro del
 * pulgar. Vale solo para la consola: el resto de la app sigue con `Interruptor`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockMovimiento = { reducir: false };
const mockConTiempo = jest.fn((destino: number, _config?: unknown) => destino);

jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  const { useRef } = require('react');
  return {
    ...doble,
    useReducedMotion: () => mockMovimiento.reducir,
    withTiming: (destino: number, config?: unknown) => mockConTiempo(destino, config),
    useSharedValue: (inicial: unknown) => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { light } from '../../../theme/tokens';
import { tacto } from '../../../utils/tacto';
import {
  ALTO_RIEL_DE_CONSOLA,
  ANCHO_RIEL_DE_CONSOLA,
  COLOR_DE_LA_CRUZ,
  COLOR_DE_LA_PALOMITA,
  InterruptorDeConsola,
  opacidadDeLasMarcas,
  PULGAR_DE_CONSOLA,
  RECORRIDO_DEL_PULGAR_DE_CONSOLA,
} from '../components/InterruptorDeConsola';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Props = React.ComponentProps<typeof InterruptorDeConsola>;

function dibujar(props: Partial<Props> = {}) {
  const onCambiar = jest.fn<(v: boolean) => void>();
  const propios: Props = { valor: false, etiqueta: 'Prendida para todos', onCambiar, ...props };
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(InterruptorDeConsola, propios));
  });
  return { raiz, onCambiar, propios };
}

const boton = (raiz: ReactTestRenderer): ReactTestInstance =>
  raiz.root.findAll(n => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function')[0];

/** El nodo real (el de la vista, no el del envoltorio animado) de cada marca. */
const marca = (raiz: ReactTestRenderer, id: 'marca-apagado' | 'marca-prendido'): ReactTestInstance =>
  raiz.root.findAll(n => n.props.testID === id && typeof n.type === 'string')[0];

const opacidad = (nodo: ReactTestInstance) => (StyleSheet.flatten(nodo.props.style) as { opacity: number }).opacity;

const iconoDe = (nodo: ReactTestInstance) =>
  nodo.findAll(n => (n.type as unknown) === Icon)[0].props as React.ComponentProps<typeof Icon>;

beforeEach(() => {
  mockMovimiento.reducir = false;
  mockConTiempo.mockClear();
});

describe('la marca dentro del pulgar', () => {
  it('prendido se ve la ✓ y no la ✕', () => {
    const { raiz } = dibujar({ valor: true });
    expect(opacidad(marca(raiz, 'marca-prendido'))).toBe(1);
    expect(opacidad(marca(raiz, 'marca-apagado'))).toBe(0);
    expect(iconoDe(marca(raiz, 'marca-prendido')).name).toBe('check');
  });

  it('apagado se ve la ✕ y no la ✓', () => {
    const { raiz } = dibujar({ valor: false });
    expect(opacidad(marca(raiz, 'marca-apagado'))).toBe(1);
    expect(opacidad(marca(raiz, 'marca-prendido'))).toBe(0);
    expect(iconoDe(marca(raiz, 'marca-apagado')).name).toBe('close');
  });

  it('son los íconos de la app a 16, en colores que se leen sobre el pulgar blanco', () => {
    const { raiz } = dibujar();
    for (const [id, color] of [
      ['marca-apagado', COLOR_DE_LA_CRUZ],
      ['marca-prendido', COLOR_DE_LA_PALOMITA],
    ] as const) {
      const icono = iconoDe(marca(raiz, id));
      expect(icono.size).toBe(TAMANO_ICONO.chico);
      expect(icono.color).toBe(color);
      // Sin `strokeWidth` propio: el grosor es el de toda la app (`GROSOR_TRAZO_PX`).
      expect(icono.strokeWidth).toBeUndefined();
    }
    // Salen de la paleta del tema, no son colores sueltos.
    expect(COLOR_DE_LA_CRUZ).toBe(light.tabInactive);
    expect(COLOR_DE_LA_PALOMITA).toBe(light.goldInk);
  });

  it('las marcas son decorativas: el lector de pantalla solo oye el interruptor', () => {
    const { raiz } = dibujar({ valor: true });
    for (const id of ['marca-apagado', 'marca-prendido'] as const) {
      const nodo = marca(raiz, id);
      expect(nodo.props.accessibilityElementsHidden).toBe(true);
      expect(nodo.props.importantForAccessibility).toBe('no-hide-descendants');
    }
  });

  it('nunca se ven las dos a medias: una se apaga antes de que la otra se encienda', () => {
    expect(opacidadDeLasMarcas(0)).toEqual({ cruz: 1, palomita: 0 });
    expect(opacidadDeLasMarcas(1)).toEqual({ cruz: 0, palomita: 1 });
    expect(opacidadDeLasMarcas(0.5)).toEqual({ cruz: 0, palomita: 0 });
    for (let paso = 0; paso <= 100; paso++) {
      const { cruz, palomita } = opacidadDeLasMarcas(paso / 100);
      expect(Math.min(cruz, palomita)).toBe(0);
    }
    // Fuera de rango no se pasa de 0 ni de 1.
    expect(opacidadDeLasMarcas(-1)).toEqual({ cruz: 1, palomita: 0 });
    expect(opacidadDeLasMarcas(2)).toEqual({ cruz: 0, palomita: 1 });
  });
});

describe('se anuncia como un interruptor', () => {
  it('rol switch, su nombre y su estado (prendido y apagado)', () => {
    const prendido = boton(dibujar({ valor: true }).raiz);
    expect(prendido.props.accessibilityRole).toBe('switch');
    expect(prendido.props.accessibilityLabel).toBe('Prendida para todos');
    expect(prendido.props.accessibilityState).toEqual({ checked: true, disabled: false });
    // La web solo lee `aria-checked` (react-native-web 0.21).
    expect(prendido.props['aria-checked']).toBe(true);

    const apagado = boton(dibujar({ valor: false }).raiz);
    expect(apagado.props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(apagado.props['aria-checked']).toBe(false);
  });

  it('el área táctil llega a 48 aunque el riel mida 31', () => {
    const estilo = StyleSheet.flatten(boton(dibujar().raiz).props.style) as { minHeight?: number; minWidth?: number };
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
    expect(estilo.minWidth).toBeGreaterThanOrEqual(48);
  });

  it('tiene las medidas de `Interruptor`: la fila no cambia de forma', () => {
    expect([ANCHO_RIEL_DE_CONSOLA, ALTO_RIEL_DE_CONSOLA, PULGAR_DE_CONSOLA, RECORRIDO_DEL_PULGAR_DE_CONSOLA]).toEqual([51, 31, 27, 20]);
  });
});

describe('al tocarlo', () => {
  it('apagado pide prendido y da un solo «tic»', () => {
    const { raiz, onCambiar } = dibujar({ valor: false });
    (tacto.seleccion as jest.Mock).mockClear();
    act(() => boton(raiz).props.onPress());
    expect(onCambiar).toHaveBeenCalledTimes(1);
    expect(onCambiar).toHaveBeenCalledWith(true);
    expect(tacto.seleccion).toHaveBeenCalledTimes(1);
  });

  it('prendido pide apagado', () => {
    const { raiz, onCambiar } = dibujar({ valor: true });
    act(() => boton(raiz).props.onPress());
    expect(onCambiar).toHaveBeenCalledWith(false);
  });

  it('deshabilitado no responde al toque, no vibra y no llama a nadie', () => {
    (tacto.seleccion as jest.Mock).mockClear();
    const { raiz, onCambiar } = dibujar({ deshabilitado: true });
    const b = boton(raiz);
    expect(b.props.disabled).toBe(true);
    expect(b.props.accessibilityState).toEqual({ checked: false, disabled: true });
    expect(b.props['aria-checked']).toBe(false);
    // El `Pressable` no toma el toque: sin eso no hay `onPress` ni vibración.
    const vistaTactil = raiz.root.findAll(n => typeof n.type === 'string' && typeof n.props.onStartShouldSetResponder === 'function')[0];
    expect(vistaTactil.props.onStartShouldSetResponder()).toBe(false);
    expect(onCambiar).not.toHaveBeenCalled();
    expect(tacto.seleccion).not.toHaveBeenCalled();

    // Y habilitado sí lo toma.
    const habilitado = dibujar({ deshabilitado: false }).raiz.root.findAll(
      n => typeof n.type === 'string' && typeof n.props.onStartShouldSetResponder === 'function',
    )[0];
    expect(habilitado.props.onStartShouldSetResponder()).toBe(true);
  });
});

describe('el movimiento', () => {
  it('el pulgar viaja 180 ms con ease-out fuerte, sin rebote', () => {
    const { raiz, propios } = dibujar({ valor: false });
    mockConTiempo.mockClear();
    act(() => raiz.update(React.createElement(InterruptorDeConsola, { ...propios, valor: true })));
    expect(mockConTiempo).toHaveBeenCalledTimes(1);
    const [destino, config] = mockConTiempo.mock.calls[0];
    expect(destino).toBe(1);
    expect(config).toMatchObject({ duration: DURACION_MS.seleccion, easing: CURVA_SALIDA });
    expect(DURACION_MS.seleccion).toBe(180);
  });

  it('al terminar, el pulgar está a la derecha y la ✓ a la vista', () => {
    const { raiz, propios } = dibujar({ valor: false });
    const prendido = () => React.createElement(InterruptorDeConsola, { ...propios, valor: true });
    act(() => raiz.update(prendido()));
    // El valor compartido se escribe en el efecto: un segundo dibujo (con otro elemento, o React no vuelve a
    // dibujar) lo lee.
    act(() => raiz.update(prendido()));
    const pulgar = raiz.root.findAll(n => {
      const estilo = StyleSheet.flatten(n.props.style) as { transform?: unknown } | undefined;
      return typeof n.type === 'string' && Array.isArray(estilo?.transform);
    })[0];
    expect((StyleSheet.flatten(pulgar.props.style) as { transform: { translateX: number }[] }).transform[0].translateX).toBe(
      RECORRIDO_DEL_PULGAR_DE_CONSOLA,
    );
    expect(opacidad(marca(raiz, 'marca-prendido'))).toBe(1);
    expect(opacidad(marca(raiz, 'marca-apagado'))).toBe(0);
  });

  it('al montarse no anima nada: empieza donde está su valor', () => {
    mockConTiempo.mockClear();
    dibujar({ valor: true });
    // El efecto del primer dibujo solo lleva al valor que ya tiene.
    for (const [destino] of mockConTiempo.mock.calls) expect(destino).toBe(1);
  });

  it('con «reducir movimiento» el cambio es instantáneo: no se anima nada', () => {
    mockMovimiento.reducir = true;
    const { raiz, propios } = dibujar({ valor: false });
    mockConTiempo.mockClear();
    const prendido = () => React.createElement(InterruptorDeConsola, { ...propios, valor: true });
    act(() => raiz.update(prendido()));
    act(() => raiz.update(prendido()));
    expect(mockConTiempo).not.toHaveBeenCalled();
    // El estado se entiende igual: la ✓ ya está y el lector oye «activado».
    expect(opacidad(marca(raiz, 'marca-prendido'))).toBe(1);
    expect(boton(raiz).props.accessibilityState.checked).toBe(true);
  });
});

describe('solo la consola lo usa', () => {
  const RAIZ = join(__dirname, '..', '..', '..');
  const CONSOLA = join(RAIZ, 'features', 'soporte-ti');

  const archivos = (carpeta: string): string[] =>
    readdirSync(carpeta).flatMap(nombre => {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) return nombre === '__tests__' ? [] : archivos(ruta);
      return /\.tsx?$/.test(nombre) ? [ruta] : [];
    });
  const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('ninguna pantalla de la consola vuelve a importar ni dibujar `Interruptor`', () => {
    const conInterruptor = archivos(CONSOLA)
      .filter(ruta => {
        const codigo = sinComentarios(readFileSync(ruta, 'utf8'));
        return /from\s+['"][^'"]*components\/Interruptor['"]/.test(codigo) || /<Interruptor[\s/>]/.test(codigo);
      })
      .map(ruta => relative(RAIZ, ruta));
    expect(conInterruptor).toEqual([]);
  });

  it('las dos pantallas con interruptores usan el de la consola, con los mismos nombres, valores y acciones', () => {
    const funcionalidad = readFileSync(join(CONSOLA, 'screens', 'FuncionalidadConsolaScreen.tsx'), 'utf8');
    const rol = readFileSync(join(CONSOLA, 'screens', 'RolConsolaScreen.tsx'), 'utf8');
    expect(funcionalidad).toContain("from '../components/InterruptorDeConsola'");
    expect(rol).toContain("from '../components/InterruptorDeConsola'");
    expect(funcionalidad).toMatch(
      /<InterruptorDeConsola etiqueta="Prendida para todos" valor=\{formulario\.prendidaGlobal\} onCambiar=\{v => cambiar\('prendidaGlobal', v\)\} \/>/,
    );
    expect(funcionalidad).toMatch(
      /<InterruptorDeConsola\s+etiqueta=\{`Prendida para \$\{etiquetaDeRol\(rol\)\}`\}\s+valor=\{formulario\.porRol\[rol\] !== false\}\s+deshabilitado=\{!formulario\.prendidaGlobal\}\s+onCambiar=\{v => cambiar\('porRol', \{ \.\.\.formulario\.porRol, \[rol\]: v \}\)\}/,
    );
    expect(rol).toMatch(
      /<InterruptorDeConsola etiqueta="Rol activo" valor=\{formulario\.activo\} onCambiar=\{v => cambiar\('activo', v\)\} \/>/,
    );
  });

  it('el resto de la app sigue con `Interruptor` (el pedido del dueño alcanza solo a la consola)', () => {
    const ninguno = archivos(RAIZ)
      .filter(ruta => !ruta.startsWith(CONSOLA))
      .filter(ruta => /from\s+['"][^'"]*InterruptorDeConsola['"]/.test(sinComentarios(readFileSync(ruta, 'utf8'))))
      .map(ruta => relative(RAIZ, ruta));
    expect(ninguno).toEqual([]);
  });
});
