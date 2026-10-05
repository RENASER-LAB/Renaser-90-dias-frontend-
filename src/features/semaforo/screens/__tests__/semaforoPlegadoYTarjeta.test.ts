import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El semáforo del aprendiz después del rediseño de Hoy (aprobado por el dueño el 2026-10-05):
 *
 * - «Cómo se calcula» se pliega («Más detalles» / «Ver menos», como el encabezado de Objetivos) y sus
 *   frases son más cortas. Antes eran cuatro párrafos siempre abiertos.
 * - Volver es la flecha sola, 24 en un área de 48 («← VOLVER» en versales con una flecha de 15).
 * - En la tarjeta de Hoy el chevron va a 16 y centrado a la derecha (iba arriba, a 14, junto al rótulo).
 * - «Terminar» la conversación de voz mide 44 de alto (medía ~26).
 *
 * Contra el código anterior fallan todas: no había «Más detalles», el texto largo se veía siempre, la
 * barra decía «VOLVER», el chevron de la tarjeta era de 14 y «Terminar» no tenía alto mínimo.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../components/graficos', () => ({ GraficoDeDias: () => null, GraficoDeSemanas: () => null }));
/* La entrada con fundido lee «reducir movimiento» en una promesa: acá basta con que dibuje lo de adentro. */
jest.mock('../../../../components/Aparicion', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Aparicion: View };
});

import { Icon } from '../../../../components/Icon';
import { BotonTerminarConversacion } from '../../../renasia/components/BotonTerminarConversacion';
import { TarjetaSemaforoHoy } from '../../components/TarjetaSemaforoHoy';
import { LINEAS_DE_COMO_SE_CALCULA, SemaforoScreen } from '../SemaforoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function crear(elemento: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

const DETALLE = {
  aplica: true,
  obligatorio: true,
  zona: 'America/Lima',
  pausa: null,
  vigente: null,
  semanas: [],
  calculadoEn: null,
};

function montarDetalle(): ReactTestRenderer {
  const semaforo = {
    detalle: DETALLE,
    cargando: false,
    fallo: null,
    detalleDelFallo: null,
    guardando: false,
    errorDeAccion: null,
    recargar: () => undefined,
    pausar: async () => true,
    reanudar: async () => true,
  };
  return crear(React.createElement(SemaforoScreen, { semaforo: semaforo as never, onVolver: () => undefined }));
}

describe('el detalle del semáforo', () => {
  it('«Cómo se calcula» llega plegado y se abre con «Más detalles»', () => {
    const r = montarDetalle();
    expect(textos(r)).toContain('Cómo se calcula');
    expect(textos(r)).toContain('Más detalles');
    for (const linea of LINEAS_DE_COMO_SE_CALCULA) expect(textos(r)).not.toContain(linea);

    const plegable = r.root.findAll(
      n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Ver cómo se calcula tu semáforo',
    )[0];
    act(() => plegable.props.onPress());
    for (const linea of LINEAS_DE_COMO_SE_CALCULA) expect(textos(r)).toContain(linea);
    expect(textos(r)).toContain('Ver menos');
    expect(textos(r)).toContain('80 % o más');
  });

  it('las frases son cortas: ninguna pasa de 100 caracteres (antes había de 120)', () => {
    for (const linea of LINEAS_DE_COMO_SE_CALCULA) expect(linea.length).toBeLessThanOrEqual(100);
  });

  it('volver es la flecha sola de 24 en 48, con nombre para el lector de pantalla', () => {
    const r = montarDetalle();
    expect(textos(r)).not.toMatch(/VOLVER/);
    const volver = r.root.findAll(n => n.props.accessibilityLabel === 'Volver' && typeof n.props.onPress === 'function')[0];
    const flecha = volver.findAll(n => (n.type as unknown) === Icon)[0];
    expect(flecha.props).toMatchObject({ name: 'arrowLeft', size: 24 });
  });
});

describe('la tarjeta del semáforo en Hoy', () => {
  it('lleva un solo chevron, de 16, fuera del encabezado', () => {
    const r = crear(
      React.createElement(TarjetaSemaforoHoy, {
        semaforo: { color: 'ROJO', etiqueta: 'Con problemas', porcentaje: 9.7, diasConDatos: 3, pausado: false, dias: null } as never,
        dias: null,
        onAbrir: () => undefined,
      }),
    );
    const chevrons = r.root.findAll(n => (n.type as unknown) === Icon).filter(i => i.props.name === 'chevron');
    expect(chevrons.map(i => i.props.size)).toEqual([16]);
  });
});

describe('«Terminar» la conversación de voz', () => {
  it('mide 44 de alto como mínimo y lleva el ✕ de 16', () => {
    const r = crear(React.createElement(BotonTerminarConversacion, { onPress: () => undefined }));
    const conAlto = r.root.findAll(n => {
      const estilos = ([] as unknown[]).concat(n.props.style ?? []).flat(3) as Array<Record<string, unknown> | null>;
      return estilos.some(e => e && typeof e === 'object' && e.minHeight === 44);
    });
    expect(conAlto.length).toBeGreaterThan(0);
    expect(r.root.findAll(n => (n.type as unknown) === Icon)[0].props).toMatchObject({ name: 'close', size: 16 });
  });
});
