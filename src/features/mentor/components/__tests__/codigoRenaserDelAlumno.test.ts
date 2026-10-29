import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El Código Renaser en la ficha de quien acompaña (spec 012): lo ven el mentor, el líder, el administrador y el
 * alquimista con el mismo componente, cada uno con su manera de pedirlo. Muestra si la persona encendió Mi Radar y a
 * qué horas, y la hora prevista de cada registro. Un 403 o un 404 no dibujan la sección.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

/* `Aparicion` anima con el hilo nativo, que en Jest no existe: aparece ya puesta. */
jest.mock('../../../../components/Aparicion', () => ({
  Aparicion: ({ children }: { children: React.ReactNode }) => children,
}));

import { ApiError } from '../../../../services/http/apiClient';
import type { HistorialRadarApi, RegistroRadarApi } from '../../../radar/types/radar.types';
import { CodigoRenaserDelAlumno } from '../CodigoRenaserDelAlumno';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registro = (id: string, dia: number, hora: number, extra: Partial<RegistroRadarApi> = {}): RegistroRadarApi => ({
  id,
  whatAmIDoing: `haciendo ${id}`,
  whatAmIThinking: `pensando ${id}`,
  whatAmIFeeling: `sintiendo ${id}`,
  energyLevel: 7,
  whatAmIAvoiding: `evitando ${id}`,
  createdAt: new Date(2026, 9, dia, hora, 6).toISOString(),
  ...extra,
});

async function dibujar(cargar: ((cursor?: string | null) => Promise<HistorialRadarApi>) | null): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CodigoRenaserDelAlumno, { cargar }));
    await new Promise<void>(res => setImmediate(res));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

describe('CodigoRenaserDelAlumno en la ficha', () => {
  it('dice si encendió Mi Radar y a qué horas, y la hora prevista de cada registro', async () => {
    const r = await dibujar(async () => ({
      entries: [registro('a', 25, 14, { horaPrevista: 14 }), registro('b', 25, 11)],
      nextCursor: null,
      miRadar: { encendido: true, horas: [9, 14, 20] },
    }));
    const t = textos(r);
    expect(t).toContain('Mi Radar: encendido · 09:00, 14:00 y 20:00');
    expect(t).toContain('Prevista 14:00 · respondida 14:06');
    // Un registro libre: solo la hora en que respondió.
    expect(t).toContain('11:06');
    expect(t).not.toContain('Prevista 11:00');
    expect(t).toContain('haciendo a');
  });

  it('con días que van distinto, la ficha los dice: «… · sáb 11:00 · dom sin Radar»', async () => {
    const r = await dibujar(async () => ({
      entries: [],
      nextCursor: null,
      miRadar: { encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }, { dia: 7, horas: [] }] },
    }));
    expect(textos(r)).toContain('Mi Radar: encendido · 09:00, 14:00 y 20:00 · sáb 11:00 · dom sin Radar');
  });

  it('esa línea larga se parte en renglones: nunca se corta con «…»', async () => {
    const r = await dibujar(async () => ({
      entries: [],
      nextCursor: null,
      miRadar: { encendido: true, horas: [9, 14, 20], dias: [{ dia: 1, horas: [8] }, { dia: 6, horas: [10, 15] }, { dia: 7, horas: [] }] },
    }));
    const linea = r.root.findAll(n => (n.type as unknown) === 'Text' && String(n.props.children).startsWith('Mi Radar:'))[0];
    expect(linea.props.numberOfLines).toBeUndefined();
    expect(linea.props.ellipsizeMode).toBeUndefined();
    expect(String(linea.props.children)).toContain('lun 08:00 · sáb 10:00 y 15:00 · dom sin Radar');
  });

  it('«Prevista … respondida …» se parte en dos renglones y no empuja la energía fuera de la tarjeta', async () => {
    // Hallazgo del E2E en el emulador: con la hora prevista el texto es largo y, sin `flexShrink`, «Energía 5 / 10» se
    // salía por el borde derecho de la tarjeta.
    const r = await dibujar(async () => ({
      entries: [registro('a', 25, 14, { horaPrevista: 14 })],
      nextCursor: null,
      miRadar: { encendido: true, horas: [14] },
    }));
    const estiloDe = (empieza: string) => {
      const nodo = r.root.findAll(n => (n.type as unknown) === 'Text' && String(n.props.children).startsWith(empieza))[0];
      return StyleSheet.flatten(nodo.props.style) as { flexShrink?: number };
    };
    expect(estiloDe('Prevista 14:00').flexShrink).toBe(1);
    expect(estiloDe('Energía').flexShrink).toBe(0);
  });

  it('apagado también se dice, y sin registros dice «Sin registros.»', async () => {
    const r = await dibujar(async () => ({ entries: [], nextCursor: null, miRadar: { encendido: false, horas: [] } }));
    const t = textos(r);
    expect(t).toContain('Mi Radar: apagado');
    expect(t).toContain('Sin registros.');
  });

  it('con un backend anterior (sin `miRadar`) la sección es la de siempre, sin esa línea', async () => {
    const r = await dibujar(async () => ({ entries: [registro('a', 20, 10)], nextCursor: null }));
    const t = textos(r);
    expect(t).not.toContain('Mi Radar');
    expect(t).toContain('haciendo a');
  });

  it.each([403, 404])('un %i esconde la sección, sin error', async estado => {
    const r = await dibujar(async () => {
      throw new ApiError(estado, 'x');
    });
    expect(r.root.findAll(n => typeof n.type === 'string')).toHaveLength(0);
  });

  it('sin a quién preguntarle (la persona no tiene grupo) no dibuja nada', async () => {
    const r = await dibujar(null);
    expect(r.root.findAll(n => typeof n.type === 'string')).toHaveLength(0);
  });

  it('un fallo de red lo dice, sin esconder la sección', async () => {
    const r = await dibujar(async () => {
      throw new ApiError(0, 'sin red');
    });
    expect(textos(r)).toContain('No se pudieron cargar sus registros.');
  });
});
