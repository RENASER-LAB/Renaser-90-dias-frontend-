// pedido del dueño 2026-11-05 muro compacto
/**
 * El Muro en lista compacta: la lista dibuja filas (`FilaCompactaDelMuro`), tocar una abre la tarjeta COMPLETA de siempre
 * (`TarjetaPublicacionMuro`) dentro de `PublicacionAbierta`, y el atrás (flecha y sistema) vuelve a la lista. La pantalla
 * de Comunidad son ~5000 líneas que no se montan en Jest: se fija el cableado en el código y se monta `PublicacionAbierta`.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { PublicacionAbierta } from '../../features/community/components/PublicacionAbierta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fuente = fs.readFileSync(path.join(__dirname, '..', 'ComunidadScreen.tsx'), 'utf8');

describe('el Muro compacto en Comunidad', () => {
  it('la lista del Muro dibuja la fila compacta, no la tarjeta', () => {
    const render = fuente.slice(fuente.indexOf('const renderPublicacion'), fuente.indexOf('const renderPublicacion') + 600);
    expect(render).toContain('<FilaCompactaDelMuro');
    expect(render).not.toContain('<TarjetaPublicacionMuro');
  });

  // pedido del dueño 2026-11-05 muro compacto: deslizar hacia abajo para recargar
  it('la lista del Muro se recarga deslizando hacia abajo, con los colores del tema', () => {
    // La lista del Muro (por su ref: desde la spec 048 fase 2 sus datos suman las publicaciones que esperan señal).
    const inicio = fuente.indexOf('ref={muroListaRef}');
    const bloque = fuente.slice(inicio, fuente.indexOf('onEndReached={alLlegarAlFinalDelMuro}', inicio));
    expect(bloque).toContain('<RefreshControl');
    expect(bloque).toContain('refreshing={muroRefrescando}');
    expect(bloque).toContain('refrescarMuro()');
    expect(bloque).toContain('colors={[c.goldInk]}');
  });

  it('la publicación abierta usa la tarjeta completa de siempre', () => {
    const inicio = fuente.indexOf('<PublicacionAbierta');
    const bloque = fuente.slice(inicio, fuente.indexOf('</PublicacionAbierta>', inicio));
    expect(bloque).toContain('<TarjetaPublicacionMuro');
    expect(bloque).toContain('acciones={accionesPublicacion}');
    expect(bloque).toContain('puedeModerar={puedeModerarMuro}');
  });

  it('el atrás del sistema cierra la publicación abierta (después de las hojas que se abren desde ella)', () => {
    const atras = fuente.slice(fuente.indexOf('useSystemBackHandler(() => {'));
    const cierre = atras.indexOf('setPublicacionAbiertaId(null)');
    expect(cierre).toBeGreaterThan(-1);
    expect(atras.indexOf('setReactionsModalVisible(false)')).toBeLessThan(cierre);
    expect(atras.indexOf('setShareSheetPost(null)')).toBeLessThan(cierre);
    expect(atras.slice(0, atras.indexOf('/**'))).toContain('publicacionAbiertaId !== null);');
  });

  it('la publicación abierta esconde la barra de pestañas', () => {
    expect(fuente).toContain('const sinPestanas = pantallaCompleta || conPublicacionAbierta;');
  });

  it('PublicacionAbierta: cabecera «Publicación» con volver de 48, y la tarjeta adentro', () => {
    const onVolver = jest.fn();
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(PublicacionAbierta, { onVolver, children: React.createElement(Text, null, 'la tarjeta completa') })
      );
    });
    const textos = raiz.root.findAll((n: ReactTestInstance) => (n.type as unknown) === Text).map(n => n.props.children);
    expect(textos).toContain('Publicación');
    expect(textos).toContain('la tarjeta completa');
    const volver = raiz.root.findAll(n => n.props.accessibilityLabel === 'Volver' && typeof n.props.onPress === 'function')[0];
    expect(JSON.stringify(volver.props.style)).toContain('"width":48');
    act(() => volver.props.onPress());
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});
