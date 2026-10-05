/**
 * Un ícono propio por eje, el mismo en Plan y en el Mapa (rediseño de Plan, 2026-10-05), y los
 * íconos nuevos de Plan con el grosor común de la app.
 *
 * Contra el código anterior falla: `iconoDelEje` no existía, el Mapa dibujaba Relaciones con `users`
 * (Tribu) y Cuerpo con `heart`, y `activity`, `heartHandshake` y `calendarRange` no eran íconos (caían
 * al chevron del `default`). `flag` (de Hoy) y `compass` (de Yo) entraron en paralelo y Plan los usa.
 */
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { GROSOR_TRAZO_PX, Icon, type IconName } from '../../../../components/Icon';
import { ICONO_DEL_EJE, iconoDelEje } from '../iconoDelEje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(nombre: IconName, size: number): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Icon, { name: nombre, size, color: '#000' }));
  });
  return raiz;
}

describe('iconoDelEje', () => {
  it('Cuerpo con el pulso, Negocio con el maletín y Relaciones con las manos en el corazón', () => {
    expect(ICONO_DEL_EJE).toEqual({ CUERPO: 'activity', TRABAJO: 'briefcase', RELACIONES: 'heartHandshake' });
    expect(iconoDelEje('RELACIONES')).toBe('heartHandshake');
  });

  it('ningún eje usa un ícono que ya significa otra cosa en la app', () => {
    // `users` es Tribu, `heart` el Protocolo de retorno, `zap` los puntos, `target` las acciones.
    for (const usado of ['users', 'heart', 'zap', 'target', 'trophy']) {
      expect(Object.values(ICONO_DEL_EJE)).not.toContain(usado);
    }
  });
});

describe('los íconos nuevos de Plan', () => {
  const NUEVOS: IconName[] = ['activity', 'heartHandshake', 'calendarRange', 'flag', 'compass'];

  it('se dibujan en su caja de 24 (no caen al chevron) con el trazo de 1,75 px a 16, 20 y 24', () => {
    for (const nombre of NUEVOS) {
      for (const size of [16, 20, 24]) {
        const raiz = dibujar(nombre, size);
        const svg = raiz.root.findAll(n => n.type === Svg)[0];
        expect({ nombre, viewBox: svg.props.viewBox }).toEqual({ nombre, viewBox: '0 0 24 24' });
        const trazos = [Path, Circle, Rect].flatMap(tipo => raiz.root.findAll(n => n.type === tipo));
        expect(trazos.length).toBeGreaterThan(0);
        for (const trazo of trazos) {
          expect((Number(trazo.props.strokeWidth) * size) / 24).toBeCloseTo(GROSOR_TRAZO_PX, 6);
        }
      }
    }
  });
});
