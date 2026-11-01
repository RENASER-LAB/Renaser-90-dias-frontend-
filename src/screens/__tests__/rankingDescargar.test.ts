/**
 * Comunidad → Ranking → «Descargar» (spec 006 del backend, T040; pedido del dueño: «que haya opción para
 * descargar en los podios»). Dos cosas:
 *
 * 1. `ComunidadScreen` solo suma el botón: lo monta una vez, con las filas de la tabla que se mira, y no
 *    importa nada de la captura ni de compartir (todo eso vive en `features/ranking`).
 * 2. El botón (`BotonDescargarPodio`): solo con el permiso del servidor (`exportarRanking`), 48 de alto, prepara
 *    la imagen con una foto fija de las filas del momento del toque, monta la tarjeta fuera de pantalla solo
 *    mientras trabaja, no admite un segundo toque, y cancelar la hoja no es un error.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';

let mockExportar = true;
const mockCompartirImagen = jest.fn<(pedido: { vista: unknown; nombreDelArchivo: string }) => Promise<unknown>>();
const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockLogro = jest.fn<() => void>();

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../features/admin/hooks/useCapacidades', () => ({
  useCapacidades: () => ({ capacidades: { administrar: false, puedeIniciarPrograma: false, acompana: false, exportarRanking: mockExportar } }),
}));
jest.mock('../../features/ranking/utils/compartirImagenDelPodio', () => ({
  compartirImagenDelPodio: (pedido: { vista: unknown; nombreDelArchivo: string }) => mockCompartirImagen(pedido),
}));
jest.mock('../../components/Alerta', () => ({ Alert: { alert: (t: string, m?: string) => mockAlerta(t, m) } }));
jest.mock('../../utils/tacto', () => ({ tacto: { logro: () => mockLogro() } }));

import type { EntradaRankingDto } from '../../features/ranking/api/rankingApi';
import { BotonDescargarPodio } from '../../features/ranking/components/BotonDescargarPodio';
import { TarjetaDelPodioParaCompartir } from '../../features/ranking/components/TarjetaDelPodioParaCompartir';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const COMUNIDAD = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/ComunidadScreen.tsx'), 'utf-8'));

const entrada = (n: number, fullName = `Persona ${n}`): EntradaRankingDto => ({
  participanteId: `p-${n}`,
  fullName,
  posicion: n,
  puntaje: 100 - n,
});
const FILAS = Array.from({ length: 12 }, (_, i) => entrada(i + 1));
const ETIQUETA = 'Descargar la imagen del podio';

let raiz: ReactTestRenderer | null = null;
function dibujar(entradas: readonly EntradaRankingDto[] = FILAS, tabla: 'general' | 'kilometros' = 'general') {
  act(() => {
    raiz = TestRenderer.create(React.createElement(BotonDescargarPodio, { entradas, tabla, fechaDelCorte: '2026-10-19' }));
  });
  return raiz!;
}
function actualizar(entradas: readonly EntradaRankingDto[]) {
  act(() => {
    raiz!.update(React.createElement(BotonDescargarPodio, { entradas, tabla: 'general', fechaDelCorte: '2026-10-19' }));
  });
}

const boton = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => n.props.accessibilityLabel === ETIQUETA && typeof n.props.onPress === 'function')[0];
/** Nada dibujado: ningún componente de React Native (`View`, `Text`…) en el árbol. */
const vacio = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length === 0;
const tarjetas = (r: ReactTestRenderer) => r.root.findAll(n => n.type === TarjetaDelPodioParaCompartir);
const textos = (n: ReactTestInstance) =>
  n
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));

beforeEach(() => {
  jest.useFakeTimers();
  mockExportar = true;
  mockCompartirImagen.mockReset().mockResolvedValue({ ok: true, via: 'hoja' });
  mockAlerta.mockReset();
  mockLogro.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

/** Toca el botón y deja pasar la espera del fénix y los cuadros de dibujo. */
async function tocarYEsperar(r: ReactTestRenderer) {
  await act(async () => {
    (boton(r)!.props.onPress as () => void)();
  });
  await act(async () => {
    const fenix = r.root.findAll(n => n.type === Image)[0];
    (fenix.props.onLoad as () => void)();
    await jest.advanceTimersByTimeAsync(300);
  });
}

describe('ComunidadScreen solo suma el botón', () => {
  it('monta `BotonDescargarPodio` una vez, con las filas de la tabla que se mira y la fecha del corte', () => {
    expect(COMUNIDAD.match(/<BotonDescargarPodio/g)).toHaveLength(1);
    // Spec 024: además de las filas, la tabla y la fecha del corte, recibe el nombre de la formación que se mira.
    expect(COMUNIDAD).toMatch(/<BotonDescargarPodio\s+entradas=\{apiRankingEntries\}\s+tabla=\{tipoRanking\}\s+fechaDelCorte=\{rankingData\?\.fecha\}\s+nombreDeLaFormacion=\{formacionDeLaComunidad\.nombreDeLaQueSeMira\}\s+faltaElegirFormacion=\{formacionDeLaComunidad\.hayQueElegirParaCrear\}\s+\/>/);
  });

  it('no sabe de captura ni de compartir: todo eso vive en `features/ranking`', () => {
    expect(COMUNIDAD).not.toMatch(/react-native-view-shot|expo-sharing|captureRef|shareAsync|useCompartirPodio/);
    expect(COMUNIDAD).not.toMatch(/useCapacidades|canExportRanking|exportarRanking/);
  });

  it('el botón vive junto a la línea de lo que mide la tabla, y esa línea sigue ahí', () => {
    expect(COMUNIDAD).toMatch(/tablasDelRanking\.find\(tabla => tabla\.clave === tipoRanking\)\?\.explica/);
    const iBoton = COMUNIDAD.indexOf('<BotonDescargarPodio');
    const iExplica = COMUNIDAD.indexOf('?.explica');
    expect(iBoton).toBeGreaterThan(iExplica);
    expect(iBoton - iExplica).toBeLessThan(300);
  });
});

describe('quién lo ve', () => {
  it('con el permiso del servidor y filas, se dibuja «Descargar»', () => {
    const r = dibujar();
    expect(boton(r)).toBeDefined();
    expect(vacio(r)).toBe(false);
    expect(textos(r.root)).toContain('Descargar');
  });

  it('sin el permiso (aprendiz, guía, mentor o un backend anterior) no se dibuja NADA: ni botón ni hueco', () => {
    mockExportar = false;
    const r = dibujar();
    expect(boton(r)).toBeUndefined();
    expect(vacio(r)).toBe(true);
  });

  it('sin filas en la tabla no hay nada que descargar: tampoco se dibuja', () => {
    const r = dibujar([]);
    expect(vacio(r)).toBe(true);
  });

  it('mide 48 de alto como mínimo y lo lee el lector de pantalla como botón', () => {
    const r = dibujar();
    const b = boton(r)!;
    expect(b.props.accessibilityRole).toBe('button');
    const cajas = r.root.findAll(n => (StyleSheet.flatten(n.props.style) as { minHeight?: number } | undefined)?.minHeight === 48);
    expect(cajas.length).toBeGreaterThan(0);
  });
});

describe('al tocar «Descargar»', () => {
  it('monta la tarjeta fuera de pantalla solo mientras trabaja, la captura y la desmonta', async () => {
    const r = dibujar();
    expect(tarjetas(r)).toHaveLength(0);

    await act(async () => {
      (boton(r)!.props.onPress as () => void)();
    });
    expect(tarjetas(r)).toHaveLength(1);
    const contenedor = r.root.findAll(n => n.props.importantForAccessibility === 'no-hide-descendants')[0];
    const estilo = StyleSheet.flatten(contenedor.props.style) as { position?: string; left?: number };
    expect(estilo.position).toBe('absolute');
    expect(estilo.left as number).toBeLessThan(-540);
    expect(contenedor.props.pointerEvents).toBe('none');
    expect(contenedor.props.importantForAccessibility).toBe('no-hide-descendants');

    await act(async () => {
      (r.root.findAll(n => n.type === Image)[0].props.onLoad as () => void)();
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(mockCompartirImagen).toHaveBeenCalledTimes(1);
    expect(mockCompartirImagen.mock.calls[0][0].nombreDelArchivo).toBe('podio-general-2026-10-19.png');
    expect(tarjetas(r)).toHaveLength(0);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('si el fénix no avisa, captura igual a los 1,5 s (el botón no queda colgado)', async () => {
    const r = dibujar();
    await act(async () => {
      (boton(r)!.props.onPress as () => void)();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(mockCompartirImagen).not.toHaveBeenCalled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(700);
    });
    expect(mockCompartirImagen).toHaveBeenCalledTimes(1);
  });

  it('dibuja las filas del momento del toque: lo que cambie después no entra a la imagen (FR-013)', async () => {
    const r = dibujar(FILAS);
    await act(async () => {
      (boton(r)!.props.onPress as () => void)();
    });
    actualizar([entrada(1, 'Otra Persona'), ...FILAS.slice(1)]);
    const tarjeta = tarjetas(r)[0];
    expect(textos(tarjeta)).toContain('Persona 1');
    expect(textos(tarjeta)).not.toContain('Otra Persona');
  });

  it('mientras prepara dice «Preparando…», se apaga y un segundo toque no hace nada', async () => {
    const r = dibujar();
    await act(async () => {
      (boton(r)!.props.onPress as () => void)();
    });
    expect(textos(r.root)).toContain('Preparando…');
    expect(textos(r.root)).not.toContain('Descargar');
    expect(boton(r)!.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await act(async () => {
      (boton(r)!.props.onPress as () => void)();
    });
    await act(async () => {
      (r.root.findAll(n => n.type === Image)[0].props.onLoad as () => void)();
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(mockCompartirImagen).toHaveBeenCalledTimes(1);
    expect(textos(r.root)).toContain('Descargar');
  });

  it('cancelar la hoja de compartir no es un error: ni diálogo ni vibración, y vuelve a estar listo', async () => {
    mockCompartirImagen.mockResolvedValue({ ok: false, motivo: 'cancelado' });
    const r = dibujar();
    await tocarYEsperar(r);
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockLogro).not.toHaveBeenCalled();
    expect(tarjetas(r)).toHaveLength(0);
    expect(textos(r.root)).toContain('Descargar');
  });

  it('un fallo real avisa con un diálogo en tuteo y deja el botón listo para reintentar', async () => {
    mockCompartirImagen.mockResolvedValue({ ok: false, motivo: 'fallo', detalle: 'ref.current is null' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = dibujar();
    await tocarYEsperar(r);
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos preparar la imagen', 'Inténtalo de nuevo en un momento.');
    expect(mockLogro).not.toHaveBeenCalled();
    expect(textos(r.root)).toContain('Descargar');
    warn.mockRestore();
  });

  it('un teléfono que no puede compartir lo dice', async () => {
    mockCompartirImagen.mockResolvedValue({ ok: false, motivo: 'sin-compartir' });
    const r = dibujar();
    await tocarYEsperar(r);
    expect(mockAlerta).toHaveBeenCalledWith('No se puede compartir', expect.stringContaining('compartir imágenes'));
  });

  it('una excepción inesperada de la captura no deja una promesa suelta ni el botón colgado', async () => {
    mockCompartirImagen.mockRejectedValue(new Error('boom'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = dibujar();
    await tocarYEsperar(r);
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos preparar la imagen', 'Inténtalo de nuevo en un momento.');
    expect(tarjetas(r)).toHaveLength(0);
    expect(textos(r.root)).toContain('Descargar');
    warn.mockRestore();
  });
});
