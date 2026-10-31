/**
 * `AvisoDeAbajo` (pedido del dueño, 2026-10-31): el aviso «Publicación oculta» / «Publicación eliminada» flotaba ARRIBA del Muro,
 * con fondo transparente y encima de los círculos de las secciones («Muro», «Eventos»). Ahora es un snackbar de abajo, opaco,
 * encima de los botones flotantes de SER, que se va solo.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { ALTO_TAB_BAR, DIAMETRO, SEPARACION } from '../../features/renasia/components/lugarDelLanzador';
import { dark, light } from '../../theme/tokens';
import {
  AVISO_DE_ABAJO_VISIBLE_MS,
  AvisoDeAbajo,
  ENTRADA_MS,
  RECORRIDO,
  SALIDA_MS,
  alturaDelAviso,
} from '../AvisoDeAbajo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

function dibujar(aviso: { clave: number; texto: string } | null, onTerminar = jest.fn(), insetAbajo?: number): ReactTestRenderer {
  const arbol = React.createElement(AvisoDeAbajo, { aviso, onTerminar });
  act(() => {
    raiz = TestRenderer.create(
      insetAbajo === undefined
        ? arbol
        : React.createElement(
            SafeAreaInsetsContext.Provider,
            { value: { top: 0, left: 0, right: 0, bottom: insetAbajo } },
            arbol,
          ),
    );
  });
  return raiz!;
}

const caja = (r: ReactTestRenderer): ReactTestInstance => r.root.findAll(n => n.props.testID === 'aviso-de-abajo')[0];
const estiloDe = (n: ReactTestInstance): Record<string, unknown> => StyleSheet.flatten(n.props.style) as Record<string, unknown>;
const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'Text').map(n => [n.props.children].flat().join(''));

describe('el aviso de abajo', () => {
  it('dice el texto, lo anuncia al lector de pantalla y no dibuja nada sin aviso', () => {
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    expect(caja(dibujar(null))).toBeUndefined();
    act(() => raiz?.unmount());
    const r = dibujar({ clave: 1, texto: 'Publicación oculta' });
    expect(textos(r)).toContain('Publicación oculta');
    expect(anunciar).toHaveBeenCalledWith('Publicación oculta');
    expect(caja(r).props.accessibilityLiveRegion).toBe('polite');
  });

  it('va ABAJO, nunca arriba: sin `top`, anclado al borde de abajo', () => {
    const e = estiloDe(caja(dibujar({ clave: 1, texto: 'Publicación oculta' })));
    expect(e.position).toBe('absolute');
    expect(e.top).toBeUndefined();
    expect(typeof e.bottom).toBe('number');
  });

  it('queda justo encima del orbe de SER, contado desde el borde de abajo de la sección (que ya termina sobre la barra)', () => {
    // La sección termina sobre la caja de la barra de pestañas (que reserva su alto y el borde seguro): el aviso no vuelve
    // a sumarlos. Antes los sumaba y quedaba ~110 dp por encima del orbe, tapando la foto de la publicación (E2E 31/10).
    expect(alturaDelAviso()).toBe(SEPARACION + DIAMETRO + 8);
    expect(alturaDelAviso()).toBeLessThan(ALTO_TAB_BAR + SEPARACION + DIAMETRO);
    expect(estiloDe(caja(dibujar({ clave: 1, texto: 'x' }))).bottom).toBe(alturaDelAviso());
    act(() => raiz?.unmount());
    // El borde seguro no lo mueve: ya lo reserva la caja de la barra.
    expect(estiloDe(caja(dibujar({ clave: 1, texto: 'x' }, jest.fn(), 24))).bottom).toBe(alturaDelAviso());
  });

  it('se alinea con las tarjetas del Muro: 16 a cada lado', () => {
    const e = estiloDe(caja(dibujar({ clave: 1, texto: 'x' })));
    expect(e.left).toBe(16);
    expect(e.right).toBe(16);
  });

  it('tiene fondo OPACO (sin transparencia), borde y una sombra suave', () => {
    const e = estiloDe(caja(dibujar({ clave: 1, texto: 'Publicación eliminada' })));
    // Un color con canal alfa sería `#RRGGBBAA` o `rgba(...)`: el fondo es un hex de 6 dígitos.
    expect(e.backgroundColor).toBe(light.cardBgAlt);
    expect(String(e.backgroundColor)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(String(dark.cardBgAlt)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(e.borderWidth).toBe(1);
    expect(e.borderColor).toBe(light.borderStrong);
    expect(e.shadowOpacity).toBeGreaterThan(0);
    expect(e.shadowOpacity as number).toBeLessThanOrEqual(0.25);
    expect(e.elevation).toBeGreaterThan(0);
  });

  it('el ✓ es dorado y el texto es de 16 px', () => {
    const r = dibujar({ clave: 1, texto: 'Publicación oculta' });
    const marca = r.root.findAll(n => n.type === 'View' && estiloDe(n).backgroundColor === light.gold)[0];
    expect(marca).toBeDefined();
    const check = r.root.findAll(n => n.props.name === 'check')[0];
    expect(check.props.color).toBe(light.onGold);
    const texto = r.root.findAll(n => n.type === 'Text')[0];
    expect(estiloDe(texto).fontSize).toBe(16);
  });

  it('no recibe toques (no tapa lo que hay debajo)', () => {
    expect(caja(dibujar({ clave: 1, texto: 'x' })).props.pointerEvents).toBe('none');
  });

  it('se va solo a los ~2,5 s: sale en 150 ms y recién ahí avisa que terminó', () => {
    expect(AVISO_DE_ABAJO_VISIBLE_MS).toBe(2500);
    const onTerminar = jest.fn();
    dibujar({ clave: 1, texto: 'Publicación oculta' }, onTerminar);
    act(() => {
      jest.advanceTimersByTime(AVISO_DE_ABAJO_VISIBLE_MS);
    });
    expect(onTerminar).not.toHaveBeenCalled(); // está saliendo
    act(() => {
      jest.advanceTimersByTime(SALIDA_MS);
    });
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it('un aviso nuevo con uno a la vista reinicia la cuenta', () => {
    const onTerminar = jest.fn();
    dibujar({ clave: 1, texto: 'Publicación oculta' }, onTerminar);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    act(() => {
      raiz!.update(React.createElement(AvisoDeAbajo, { aviso: { clave: 2, texto: 'Publicación eliminada' }, onTerminar }));
    });
    expect(textos(raiz!)).toContain('Publicación eliminada');
    act(() => {
      jest.advanceTimersByTime(AVISO_DE_ABAJO_VISIBLE_MS - 100 + SALIDA_MS); // pasó el vencimiento del primero
    });
    expect(onTerminar).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it('desmontado antes de irse no avisa nada', () => {
    const onTerminar = jest.fn();
    dibujar({ clave: 1, texto: 'x' }, onTerminar);
    act(() => raiz?.unmount());
    raiz = null;
    act(() => {
      jest.advanceTimersByTime(AVISO_DE_ABAJO_VISIBLE_MS + SALIDA_MS);
    });
    expect(onTerminar).not.toHaveBeenCalled();
  });
});

describe('el movimiento (código)', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'AvisoDeAbajo.tsx'), 'utf8');

  it('entra en 200 ms y 8 px, sale en 150 ms, con ease-out fuerte', () => {
    expect(ENTRADA_MS).toBe(200);
    expect(SALIDA_MS).toBe(150);
    expect(RECORRIDO).toBe(8);
    expect(fuente).toMatch(/withTiming\(1, \{ duration: ENTRADA_MS, easing: CURVA_SALIDA \}\)/);
    expect(fuente).toMatch(/withTiming\(0, \{ duration: SALIDA_MS, easing: CURVA_SALIDA \}\)/);
  });

  it('con «reducir movimiento» solo hay fundido: no sube', () => {
    expect(fuente).toMatch(/useReducedMotion\(\)/);
    expect(fuente).toMatch(/translateY: reducir \? 0 :/);
  });

  it('solo anima opacidad y transformación (hilo de la interfaz), sin `entering`', () => {
    expect(fuente).toMatch(/opacity: visible\.get\(\)/);
    expect(fuente).not.toMatch(/entering=/);
  });
});
