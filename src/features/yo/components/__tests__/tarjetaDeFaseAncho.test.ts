/**
 * La tarjeta de fase de Yo (y de la vista previa de Administración): el animal NUNCA tapa el texto, en
 * teléfonos de 320 a 430 px y con letra del sistema normal o grande (fontScale 1,3).
 *
 * Contra el código anterior falla: el animal medía 240 px fijos y salía 26 px por la derecha (empezaba 214 px
 * antes del borde) mientras la columna de texto terminaba 160 px antes del borde: 54 px de texto quedaban
 * debajo del animal en cualquier ancho. A 360 px se veía el gorila encima de «de esta fase» y «en total».
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const ventana = { width: 412, height: 915, scale: 2, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ventana }));
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: jest.fn(), seleccion: jest.fn() } }));

import { TarjetaDeFase } from '../TarjetaDeFase';

const PROPS = {
  numero: 2, totalDeFases: 4, nombreDeLaFase: 'El Ciclo Alquímico', rango: 'Días 8–34',
  animal: { nombre: 'Gorila', imagen: 1, imagenDeRespaldo: 2 }, diasDeLaFase: { dia: 23, total: 27 },
  diaDelPrograma: 30, diasDelPrograma: 90,
};

const estilo = (n: ReactTestInstance) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));

/** Dibuja la tarjeta con un ancho real (el `onLayout`) y devuelve dónde termina el texto y dónde empieza el animal. */
function bordes(anchoDePantalla: number, fontScale: number) {
  ventana.width = anchoDePantalla;
  ventana.fontScale = fontScale;
  const anchoDeLaTarjeta = anchoDePantalla - 2 * 14; // el margen más chico de la app: la tarjeta más ancha posible
  let raiz!: ReactTestRenderer;
  act(() => { raiz = TestRenderer.create(React.createElement(TarjetaDeFase, PROPS)); });
  const tarjeta = raiz.root.findAll(n => typeof n.props.onLayout === 'function')[0];
  if (tarjeta) act(() => { tarjeta.props.onLayout({ nativeEvent: { layout: { width: anchoDeLaTarjeta, height: 262 } } }); });
  const vistas = raiz.root.findAll(n => n.type === 'View' || typeof n.type !== 'string');
  const animal = vistas.map(estilo).find(e => e.position === 'absolute' && typeof e.width === 'number' && e.width === e.height)!;
  const columna = vistas.map(estilo).find(e => typeof e.paddingRight === 'number' && e.flex === 1)!;
  const inicioDelAnimal = anchoDeLaTarjeta - (animal.width + animal.right);
  const finDelTexto = anchoDeLaTarjeta - columna.paddingRight;
  const anchoDelTexto = finDelTexto - columna.padding;
  return { inicioDelAnimal, finDelTexto, anchoDelTexto, lado: animal.width as number };
}

describe('TarjetaDeFase: el animal no tapa el texto', () => {
  const anchos = [320, 340, 360, 375, 390, 412, 430];
  it.each(anchos.flatMap(a => [[a, 1], [a, 1.3]]))('a %i px con fontScale %p el texto termina antes del animal', (ancho, fontScale) => {
    const b = bordes(ancho, fontScale);
    expect(b.finDelTexto).toBeLessThanOrEqual(b.inicioDelAnimal - 4);
    expect(b.anchoDelTexto).toBeGreaterThanOrEqual(150);
  });

  it('en un teléfono ancho el animal sigue grande, como en el diseño B', () => {
    expect(bordes(412, 1).lado).toBeGreaterThanOrEqual(200);
  });
});
