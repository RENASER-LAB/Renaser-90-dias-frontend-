/**
 * El Muro con la letra del sistema grande (E2E del 03/11, issue #115):
 *
 * (a) «Me gusta», «Comentar» y «Compartir» se cortaban con «…». Sin tope de líneas ni `numberOfLines`; si no caben —letra por encima de 1,15, o una
 *     etiqueta que se parte en dos líneas— la fila muestra solo los íconos, cada uno con su nombre y un área de 48.
 * (b) «Ver más...» salía solo con más de 120 caracteres: con letra grande un texto de 102 se cortaba en tres líneas sin salida. Ahora lo decide un
 *     `Text` invisible que mide el texto entero sin tope de líneas.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
const ventana = { width: 411, height: 900, scale: 2.6, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ventana }));
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import { accionesSoloConIconos } from '../../utils/accionesDelMuro';
import { CARACTERES_QUE_SIEMPRE_CABEN, claveDeLaMedida, hayMasQueVer, seMideElTexto } from '../../utils/medidaDelTextoDelMuro';
import { TarjetaPublicacionMuro, type AccionesPublicacion } from '../TarjetaPublicacionMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TEXTO_DE_102 = 'Hoy cumplí mi compromiso de caminar y cerré el día. Gracias por acompañarme en este proceso, equipo.'.padEnd(102, '.');
const TEXTO_DE_130 = 'Hoy cumplí mi compromiso de caminar y cerré el día. Gracias por acompañarme en este proceso, equipo. Mañana sigo con más energía.'.padEnd(130, '.');

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: 'Lucía Paredes',
  avatar: '👤',
  avatarUrl: null,
  cell: '',
  diaPrograma: 14,
  timeAgo: 'Hace 4 minutos',
  text: '',
  media: [],
  likes: 0,
  userReaction: null,
  comments: [],
  ...cambios,
});

let raiz: ReactTestRenderer | null = null;
const alternarExpandida = jest.fn();
function tarjeta(post: PostItem, expandida: boolean) {
  const todas = new Proxy({ alternarExpandida }, { get: (o, k) => (o as never)[k] ?? jest.fn() }) as unknown as AccionesPublicacion;
  return React.createElement(TarjetaPublicacionMuro, {
    post,
    expandida,
    comentariosAbiertos: false,
    destacada: false,
    proporcion: undefined,
    textoComentario: '',
    fotoComentario: null,
    comentariosExpandidos: {},
    confirmacion: null,
    acciones: todas,
  });
}
function dibujar(post: PostItem, expandida = false): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(tarjeta(post, expandida));
  });
  return raiz as unknown as ReactTestRenderer;
}
beforeEach(() => {
  ventana.fontScale = 1;
  alternarExpandida.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

const estilo = (e: unknown) => (StyleSheet.flatten(e as never) ?? {}) as Record<string, unknown>;
const textoDe = (n: ReactTestInstance) => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'Text');
const etiqueta = (r: ReactTestRenderer, palabra: string) => textos(r).find(n => textoDe(n) === palabra);
const medidor = (r: ReactTestRenderer, texto: string) => textos(r).find(n => textoDe(n) === texto && estilo(n.props.style).opacity === 0);
const visible = (r: ReactTestRenderer, texto: string) => textos(r).find(n => textoDe(n) === texto && estilo(n.props.style).opacity !== 0);
const lineas = (cuantas: number) => ({ nativeEvent: { lines: Array.from({ length: cuantas }, () => ({})) } });
const verMas = (r: ReactTestRenderer) => textos(r).find(n => ['Ver más...', 'Ver menos'].includes(textoDe(n)));
const boton = (r: ReactTestRenderer, nombre: string) =>
  r.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === nombre && typeof n.props.onPress === 'function')[0];

describe('(a) las etiquetas de las acciones', () => {
  it('con letra normal se leen enteras: sin tope de líneas y con `flexShrink`', () => {
    const r = dibujar(publicacion());
    for (const palabra of ['Me gusta', 'Comentar', 'Compartir']) {
      const t = etiqueta(r, palabra)!;
      expect(t).toBeDefined();
      expect(t.props.numberOfLines).toBeUndefined(); // antes numberOfLines={1}: «Me gus…»
      expect(estilo(t.props.style).flexShrink).toBe(1);
    }
  });

  it('si una etiqueta se parte en dos líneas, la fila pasa a solo íconos: cada botón conserva su nombre y un área de 48', () => {
    const r = dibujar(publicacion());
    act(() => etiqueta(r, 'Compartir')!.props.onTextLayout(lineas(2)));
    for (const palabra of ['Me gusta', 'Comentar', 'Compartir']) expect(etiqueta(r, palabra)).toBeUndefined();
    for (const nombre of ['Reaccionar a la publicacion', 'Ver y escribir comentarios', 'Compartir la publicacion']) {
      const b = boton(r, nombre);
      expect(b).toBeDefined();
      const caja = b.findAll(n => n.type === 'View' || n.props.style).map(n => estilo(n.props.style));
      expect(caja.some(e => typeof e.minWidth === 'number' && e.minWidth >= 44)).toBe(true);
      expect(caja.some(e => typeof e.minHeight === 'number' && e.minHeight >= 44)).toBe(true);
    }
  });

  it('con una sola línea por etiqueta, se quedan las etiquetas', () => {
    const r = dibujar(publicacion());
    act(() => etiqueta(r, 'Compartir')!.props.onTextLayout(lineas(1)));
    expect(etiqueta(r, 'Compartir')).toBeDefined();
  });

  it('con la letra por encima de 1,15 va directo a solo íconos, sin esperar a medir (sin parpadeo)', () => {
    ventana.fontScale = 1.3;
    const r = dibujar(publicacion());
    for (const palabra of ['Me gusta', 'Comentar', 'Compartir']) expect(etiqueta(r, palabra)).toBeUndefined();
    expect(boton(r, 'Compartir la publicacion')).toBeDefined();
    expect(boton(r, 'Ver y escribir comentarios')).toBeDefined();
  });

  it('un «Me gusta» ya dado se distingue sin la etiqueta: fondo dorado además del color', () => {
    ventana.fontScale = 1.3;
    const r = dibujar(publicacion({ userReaction: 'like' }));
    const b = boton(r, 'Quitar reaccion');
    const fondos = b.findAll(n => n.props.style).map(n => estilo(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style));
    expect(fondos.some(e => e.backgroundColor !== undefined)).toBe(true);
  });

  it('la regla pura: más de 1,15 o una etiqueta partida', () => {
    expect(accionesSoloConIconos(1, false)).toBe(false);
    expect(accionesSoloConIconos(1.15, false)).toBe(false);
    expect(accionesSoloConIconos(1.16, false)).toBe(true);
    expect(accionesSoloConIconos(1, true)).toBe(true);
  });
});

describe('(b) «Ver más...» por las líneas reales', () => {
  it('un texto de 102 caracteres con letra grande: lo mide un Text invisible sin tope de líneas y, si pasa de tres líneas, ofrece «Ver más...»', () => {
    ventana.fontScale = 1.3;
    expect(TEXTO_DE_102).toHaveLength(102);
    const r = dibujar(publicacion({ text: TEXTO_DE_102 }));
    expect(verMas(r)).toBeUndefined(); // sin medir, un texto de 102 no se supone largo (no aparece de golpe)

    const m = medidor(r, TEXTO_DE_102)!;
    expect(m).toBeDefined();
    expect(m.props.numberOfLines).toBeUndefined(); // sin tope: así cuenta todas las líneas, también en Android
    expect(estilo(m.props.style)).toMatchObject({ position: 'absolute', opacity: 0 });
    expect(m.props.pointerEvents).toBe('none');
    expect(m.props.accessibilityElementsHidden).toBe(true);
    expect(m.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(visible(r, TEXTO_DE_102)!.props.numberOfLines).toBe(3);

    act(() => m.props.onTextLayout(lineas(4)));
    expect(verMas(r)).toBeDefined();
    expect(textoDe(verMas(r)!)).toBe('Ver más...');
    expect(medidor(r, TEXTO_DE_102)).toBeUndefined(); // se midió UNA vez y se desmontó
    expect(visible(r, TEXTO_DE_102)!.props.numberOfLines).toBe(3);
  });

  it('tocar «Ver más...» alterna la publicación; expandida dice «Ver menos» y quita el tope', () => {
    ventana.fontScale = 1.3;
    const r = dibujar(publicacion({ text: TEXTO_DE_102 }));
    act(() => medidor(r, TEXTO_DE_102)!.props.onTextLayout(lineas(4)));
    const pulsable = r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(x => x === verMas(r)).length > 0).at(-1)!;
    act(() => pulsable.props.onPress());
    expect(alternarExpandida).toHaveBeenCalledWith('p1');

    act(() => raiz!.unmount());
    const r2 = dibujar(publicacion({ text: TEXTO_DE_102 }), true);
    act(() => medidor(r2, TEXTO_DE_102)!.props.onTextLayout(lineas(4)));
    expect(textoDe(verMas(r2)!)).toBe('Ver menos');
    expect(visible(r2, TEXTO_DE_102)!.props.numberOfLines).toBeUndefined();
  });

  it('un texto que cabe en tres líneas no ofrece «Ver más...»', () => {
    const r = dibujar(publicacion({ text: TEXTO_DE_102 }));
    act(() => medidor(r, TEXTO_DE_102)!.props.onTextLayout(lineas(3)));
    expect(verMas(r)).toBeUndefined();
  });

  it('un texto de más de 120 caracteres parte con el botón (como antes) y se corrige con la medida: si cabe en tres líneas, se va', () => {
    const r = dibujar(publicacion({ text: TEXTO_DE_130 }));
    expect(verMas(r)).toBeDefined();
    act(() => medidor(r, TEXTO_DE_130)!.props.onTextLayout(lineas(3)));
    expect(verMas(r)).toBeUndefined();
  });

  it('un texto corto ni se mide ni lleva botón; sin texto, nada', () => {
    const r = dibujar(publicacion({ text: 'Gracias, equipo.' }));
    expect(medidor(r, 'Gracias, equipo.')).toBeUndefined();
    expect(verMas(r)).toBeUndefined();
    const sin = dibujar(publicacion({ text: '' }));
    expect(verMas(sin)).toBeUndefined();
  });

  it('cambiar el tamaño de la letra vuelve a medir (la medida de otra letra no vale)', () => {
    ventana.fontScale = 1;
    const post = publicacion({ text: TEXTO_DE_102 });
    const r = dibujar(post);
    act(() => medidor(r, TEXTO_DE_102)!.props.onTextLayout(lineas(2)));
    expect(verMas(r)).toBeUndefined();
    expect(medidor(r, TEXTO_DE_102)).toBeUndefined();

    ventana.fontScale = 1.3; // el usuario sube la letra del sistema
    act(() => r.update(tarjeta(post, false)));
    expect(medidor(r, TEXTO_DE_102)).toBeDefined();
    act(() => medidor(r, TEXTO_DE_102)!.props.onTextLayout(lineas(4)));
    expect(verMas(r)).toBeDefined();
  });
});

describe('la decisión pura', () => {
  const texto = TEXTO_DE_102;
  const clave = claveDeLaMedida(texto, 411, 1.3);

  it('con la medida de ESTE texto, ancho y letra manda la medida; sin ella, la regla de antes', () => {
    expect(hayMasQueVer(texto, { clave, lineas: 4 }, clave)).toBe(true);
    expect(hayMasQueVer(texto, { clave, lineas: 3 }, clave)).toBe(false);
    expect(hayMasQueVer(texto, null, clave)).toBe(false); // 102 caracteres: no se supone largo
    expect(hayMasQueVer(TEXTO_DE_130, null, claveDeLaMedida(TEXTO_DE_130, 411, 1))).toBe(true);
    // Una medida de otra letra, otro ancho u otro texto no vale.
    expect(hayMasQueVer(texto, { clave: claveDeLaMedida(texto, 411, 1), lineas: 4 }, clave)).toBe(false);
    expect(hayMasQueVer(texto, { clave: claveDeLaMedida(texto, 360, 1.3), lineas: 4 }, clave)).toBe(false);
  });

  it('lo que siempre cabe no se mide ni lleva botón', () => {
    const corto = 'x'.repeat(CARACTERES_QUE_SIEMPRE_CABEN);
    expect(seMideElTexto(corto, null, claveDeLaMedida(corto, 411, 1.3))).toBe(false);
    expect(hayMasQueVer(corto, null, claveDeLaMedida(corto, 411, 1.3))).toBe(false);
    expect(seMideElTexto(texto, null, clave)).toBe(true);
    expect(seMideElTexto(texto, { clave, lineas: 4 }, clave)).toBe(false);
  });
});
