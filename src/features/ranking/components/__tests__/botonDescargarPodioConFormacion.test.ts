/**
 * «Descargar» el podio con la formación (spec 024): la imagen lleva el nombre de la formación que se mira; Administración leyendo
 * «Todas» tiene que elegir una antes (una línea, sin diálogo, y no se prepara ninguna imagen).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../admin/hooks/useCapacidades', () => ({ useCapacidades: () => ({ capacidades: { exportarRanking: true } }) }));
const mockCompartir = jest.fn<(podio: unknown) => Promise<void>>();
jest.mock('../../hooks/useCompartirPodio', () => ({
  useCompartirPodio: () => ({ enCurso: null, preparando: false, tarjetaRef: { current: null }, alTarjetaLista: () => undefined, compartir: mockCompartir }),
}));

import type { EntradaRankingDto } from '../../api/rankingApi';
import { BotonDescargarPodio } from '../BotonDescargarPodio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const entradas: EntradaRankingDto[] = [{ participanteId: 'a', fullName: 'Ana', posicion: 1, puntaje: 10 }];
let raiz: ReactTestRenderer | null = null;
/** El primer nodo con esas props (los tipos mínimos no traen `findByProps`); falla si no existe. */
const conProps = (r: ReactTestRenderer, props: Record<string, unknown>) => {
  const nodo = r.root.findAll(x => Object.entries(props).every(([k, v]) => x.props[k] === v))[0];
  if (!nodo) throw new Error(`No hay un nodo con ${JSON.stringify(props)}`);
  return nodo;
};
const montar = (props: Record<string, unknown>) => {
  act(() => {
    raiz = TestRenderer.create(React.createElement(BotonDescargarPodio, { entradas, tabla: 'general', fechaDelCorte: '2026-10-19', ...props }));
  });
};
const tocarDescargar = () => act(() => conProps(raiz!, { accessibilityLabel: 'Descargar la imagen del podio' }).props.onPress());
const textos = () => raiz!.root.findAll(x => (x.type as unknown) === 'Text').map(x => x.props.children);

beforeEach(() => {
  mockCompartir.mockReset();
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«Descargar» con la formación', () => {
  it('con una formación a la vista, la imagen se prepara con su nombre', () => {
    montar({ nombreDeLaFormacion: 'Diplomado Renaser' });
    tocarDescargar();
    expect(mockCompartir).toHaveBeenCalledTimes(1);
    const podio = mockCompartir.mock.calls[0][0] as { formacion: string; nombreDelArchivo: string };
    expect(podio.formacion).toBe('Diplomado Renaser');
    expect(podio.nombreDelArchivo).toContain('diplomado-renaser');
  });

  it('sin formación conocida (un backend anterior) es la imagen de siempre', () => {
    montar({});
    tocarDescargar();
    expect((mockCompartir.mock.calls[0][0] as { formacion: string | null }).formacion).toBeNull();
  });

  it('con «Todas» no se prepara nada: una línea pide elegir una formación arriba', () => {
    montar({ faltaElegirFormacion: true });
    expect(textos()).not.toContain('Elige una formación arriba para descargar el podio.');
    tocarDescargar();
    expect(mockCompartir).not.toHaveBeenCalled();
    expect(textos()).toContain('Elige una formación arriba para descargar el podio.');
  });
});
