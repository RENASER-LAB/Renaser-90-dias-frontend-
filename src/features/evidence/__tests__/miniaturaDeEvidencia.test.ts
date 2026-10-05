import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';

/**
 * La miniatura de una evidencia en Yo (2026-10-05, backend D-252). Antes era siempre el ícono del
 * tipo (una cámara para cada foto). Ahora: la foto real encima del ícono, el ícono de respaldo si
 * no hay foto o si no carga, y tocarla en «Registro de Evidencias» la abre en el visor que ya existe.
 */

// El visor del Muro arrastra gestos y hojas que acá no se prueban: un doble que solo recibe props.
jest.mock('../../community/components/ImageViewerModal', () => ({
  ImageViewerModal: () => null,
}));

import { Icon } from '../../../components/Icon';
import { ImageViewerModal } from '../../community/components/ImageViewerModal';
import { MiniaturaDeEvidencia } from '../components/MiniaturaDeEvidencia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OBJETO = 'https://s3-renaser90dias.s3.us-east-1.amazonaws.com/evidencia-habitos/u-1/r-1/f-1';
const firmada = (firma: string) => `${OBJETO}?X-Amz-Signature=${firma}`;

let raiz: ReactTestRenderer | null = null;

type Props = React.ComponentProps<typeof MiniaturaDeEvidencia>;

function dibujar(props: Partial<Props> & Pick<Props, 'evidencia'>): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(MiniaturaDeEvidencia, { tamanoIcono: 26, colorIcono: '#8A6D1F', ...props }),
    );
  });
  return raiz!;
}

function redibujar(r: ReactTestRenderer, props: Partial<Props> & Pick<Props, 'evidencia'>) {
  act(() => {
    r.update(React.createElement(MiniaturaDeEvidencia, { tamanoIcono: 26, colorIcono: '#8A6D1F', ...props }));
  });
}

const fotos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Image);
const iconos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Icon).map(n => n.props.name);
const ampliar = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.props.accessibilityLabel === 'Ver la foto en grande' && typeof n.props.onPress === 'function');
const visores = (r: ReactTestRenderer) => r.root.findAll(n => n.type === ImageViewerModal);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('MiniaturaDeEvidencia', () => {
  it('con fotoUrl pinta la foto real, con la dirección del objeto como clave de caché, sobre el ícono', () => {
    const r = dibujar({ evidencia: { id: 'ev-1', tipo: 'FOTO', fotoUrl: firmada('aaa') } });

    expect(fotos(r)).toHaveLength(1);
    expect(fotos(r)[0].props.source).toEqual({ uri: firmada('aaa'), cacheKey: OBJETO });
    expect(fotos(r)[0].props.contentFit).toBe('cover');
    expect(iconos(r)).toEqual(['camera']);
  });

  it('sin foto (una evidencia de texto) queda el ícono de su tipo', () => {
    const r = dibujar({ evidencia: { id: 'ev-2', tipo: 'TEXTO', fotoUrl: null } });

    expect(fotos(r)).toHaveLength(0);
    expect(iconos(r)).toEqual(['doc']);
  });

  it('contra un backend anterior a D-252 (sin el campo) la foto sigue con la cámara, como antes', () => {
    const r = dibujar({ evidencia: { id: 'ev-3', tipo: 'FOTO' } });

    expect(fotos(r)).toHaveLength(0);
    expect(iconos(r)).toEqual(['camera']);
  });

  it('si la foto no carga queda el ícono; con una firma nueva lo vuelve a intentar', () => {
    const r = dibujar({ evidencia: { id: 'ev-1', tipo: 'FOTO', fotoUrl: firmada('vencida') } });

    act(() => fotos(r)[0].props.onError({ error: 'HTTP 403' }));
    expect(fotos(r)).toHaveLength(0);
    expect(iconos(r)).toEqual(['camera']);

    redibujar(r, { evidencia: { id: 'ev-1', tipo: 'FOTO', fotoUrl: firmada('nueva') } });
    expect(fotos(r)).toHaveLength(1);
    expect(fotos(r)[0].props.source.uri).toBe(firmada('nueva'));
  });

  it('ampliable: tocarla abre la foto en el visor y cerrarlo la saca', () => {
    const r = dibujar({ evidencia: { id: 'ev-1', tipo: 'FOTO', fotoUrl: firmada('aaa') }, ampliable: true });
    expect(visores(r)).toHaveLength(0);

    act(() => ampliar(r)[0].props.onPress());
    expect(visores(r)).toHaveLength(1);
    expect(visores(r)[0].props.images).toEqual([{ url: firmada('aaa') }]);

    act(() => visores(r)[0].props.onClose());
    expect(visores(r)).toHaveLength(0);
  });

  it('sin foto no hay nada que ampliar: no es tocable', () => {
    const r = dibujar({ evidencia: { id: 'ev-2', tipo: 'TEXTO', fotoUrl: null }, ampliable: true });
    expect(ampliar(r)).toHaveLength(0);
  });

  it('en la tira de Yo (no ampliable) el toque es de quien la contiene: la miniatura no lo captura', () => {
    const r = dibujar({ evidencia: { id: 'ev-1', tipo: 'FOTO', fotoUrl: firmada('aaa') } });
    expect(ampliar(r)).toHaveLength(0);
  });
});
