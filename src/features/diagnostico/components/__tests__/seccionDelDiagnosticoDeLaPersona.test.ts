import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Diagnóstico inicial» en la ficha de quien acompaña (spec 026, FR-011): solo lectura. Misma política que el tiempo libre y
 * los cierres: un 403, un 404, la ficha estándar o ningún diagnóstico NO dibujan nada, y mientras llega la primera lectura
 * tampoco (sin parpadeo).
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
import type { LecturaDelDiagnostico } from '../../types/diagnostico.types';
import { SeccionDelDiagnosticoDeLaPersona } from '../SeccionDelDiagnosticoDeLaPersona';
import { tocar, vaciar } from './ayudasDePrueba';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LECTURA: LecturaDelDiagnostico = {
  persona: { id: 'p-1', nombre: 'María Pérez' },
  ficha: 'CON_DIAGNOSTICO',
  estado: 'COMPLETADO',
  version: 3,
  completadoEn: '2026-11-02T15:04:00Z',
  formacion: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' },
  secciones: [
    {
      titulo: 'Tu vida hoy',
      preguntas: [
        { id: 5, texto: '¿Qué tan satisfecho(a) estás?', tipo: 'CUADRICULA', retirada: false, escalaMax: 5, respuesta: { texto: null, valores: [], filas: [{ etiqueta: 'Mi salud…', valor: 4 }] } },
        { id: 13, texto: '¿Tienes un negocio?', tipo: 'SELECCION_UNICA', retirada: true, respuesta: { texto: 'Sí.', valores: [], filas: [] } },
        { id: 14, texto: '¿Qué haces cuando no actúas?', tipo: 'SELECCION_MULTIPLE', retirada: false, respuesta: { texto: null, valores: ['Postergo', 'Dudo'], filas: [] } },
        { id: 15, texto: 'Cuéntanos más', tipo: 'AREA_TEXTO', retirada: false, respuesta: null },
      ],
    },
    {
      titulo: 'De la decisión a la acción',
      preguntas: [{ id: 23, texto: 'Declaración de responsabilidad', tipo: 'CASILLA', retirada: false, respuesta: { texto: 'Aceptó', valores: [], filas: [] } }],
    },
  ],
};

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}
const sinNada = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length === 0;

async function dibujar(cargar: (() => Promise<LecturaDelDiagnostico>) | null): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(SeccionDelDiagnosticoDeLaPersona, { cargar }));
    await vaciar();
  });
  return r;
}

describe('SeccionDelDiagnosticoDeLaPersona: lo que muestra', () => {
  it('el título, la fecha, la formación, la cuenta y cada sección con sus preguntas y respuestas', async () => {
    const t = textos(await dibujar(async () => LECTURA));
    expect(t).toContain('Diagnóstico inicial');
    expect(t).toContain('Completado el 2 de noviembre de 2026');
    expect(t).toContain('Diplomado Renaser');
    expect(t).toContain('4 de 5 preguntas respondidas');
    expect(t).toContain('Tu vida hoy');
    expect(t).toContain('De la decisión a la acción');
    expect(t).toContain('Mi salud… · 4 de 5');
    expect(t).toContain('Postergo');
    expect(t).toContain('Dudo');
    expect(t).toContain('Aceptó');
  });

  it('una pregunta retirada lleva la marca «Pregunta retirada» y conserva su respuesta', async () => {
    const t = textos(await dibujar(async () => LECTURA));
    expect(t).toContain('¿Tienes un negocio? | Pregunta retirada | Sí.');
  });

  it('una pregunta sin respuesta dice «Sin respuesta»', async () => {
    expect(textos(await dibujar(async () => LECTURA))).toContain('Cuéntanos más | Sin respuesta');
  });

  it('no tiene botones de editar: es solo lectura', async () => {
    const r = await dibujar(async () => LECTURA);
    expect(r.root.findAll(n => typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(r.root.findAll(n => typeof n.props.onChangeText === 'function')).toHaveLength(0);
  });

  it('si todavía no lo completó, lo dice (y no inventa respuestas)', async () => {
    for (const estado of ['PENDIENTE', 'EN_CURSO'] as const) {
      const t = textos(await dibujar(async () => ({ ...LECTURA, estado, completadoEn: null, secciones: [] })));
      expect(t).toContain('Diagnóstico inicial');
      expect(t).toContain('Todavía no lo ha completado.');
      expect(t).not.toContain('Completado el');
    }
  });

  it('en curso muestra lo poco que ya respondió', async () => {
    const t = textos(await dibujar(async () => ({ ...LECTURA, estado: 'EN_CURSO', completadoEn: null })));
    expect(t).toContain('Todavía no lo ha completado.');
    expect(t).toContain('Mi salud… · 4 de 5');
  });
});

describe('SeccionDelDiagnosticoDeLaPersona: cuándo no se dibuja nada', () => {
  it('un 403 y un 404 no dibujan nada, sin error', async () => {
    expect(sinNada(await dibujar(async () => { throw new ApiError(403, 'Prohibido'); }))).toBe(true);
    expect(sinNada(await dibujar(async () => { throw new ApiError(404, 'No existe'); }))).toBe(true);
  });

  it('la ficha estándar o ningún diagnóstico no dibujan nada', async () => {
    expect(sinNada(await dibujar(async () => ({ ...LECTURA, ficha: 'ESTANDAR', estado: 'NO_APLICA', secciones: [] })))).toBe(true);
    expect(sinNada(await dibujar(async () => ({ ...LECTURA, estado: 'NO_APLICA', secciones: [] })))).toBe(true);
  });

  it('sin cargar (una ficha sin a quién preguntarle) no hace ningún pedido ni dibuja nada', async () => {
    expect(sinNada(await dibujar(null))).toBe(true);
  });

  it('mientras llega la primera lectura no dibuja nada (sin parpadeo)', async () => {
    let resolver!: (l: LecturaDelDiagnostico) => void;
    const pendiente = new Promise<LecturaDelDiagnostico>(res => { resolver = res; });
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(SeccionDelDiagnosticoDeLaPersona, { cargar: () => pendiente }));
      await vaciar();
    });
    expect(sinNada(r)).toBe(true);
    await act(async () => {
      resolver(LECTURA);
      await vaciar();
    });
    expect(textos(r)).toContain('Diagnóstico inicial');
  });
});

describe('SeccionDelDiagnosticoDeLaPersona: cuando falla la red', () => {
  it('dice que no se pudo cargar y «Reintentar» vuelve a pedir y muestra la lectura', async () => {
    const cargar = jest.fn<() => Promise<LecturaDelDiagnostico>>()
      .mockRejectedValueOnce(new ApiError(0, 'sin red'))
      .mockResolvedValue(LECTURA);
    const r = await dibujar(cargar);
    expect(textos(r)).toContain('Diagnóstico inicial');
    expect(textos(r)).toContain('No se pudo cargar el diagnóstico. Revisa tu conexión.');
    const reintentar = r.root.findAll(n => n.props.accessibilityLabel === 'Reintentar' && typeof n.props.onPress === 'function')[0];
    expect(reintentar).toBeDefined();
    await tocar(r, 'Reintentar');
    expect(cargar).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Completado el 2 de noviembre de 2026');
    expect(textos(r)).not.toContain('No se pudo cargar');
  });

  it('un fallo del servidor (no de red) lo dice sin hablar de la conexión', async () => {
    const r = await dibujar(async () => { throw new ApiError(500, 'error'); });
    expect(textos(r)).toContain('No se pudo cargar el diagnóstico.');
    expect(textos(r)).not.toContain('Revisa tu conexión');
  });

  it('un 404 después de reintentar esconde la sección', async () => {
    const cargar = jest.fn<() => Promise<LecturaDelDiagnostico>>()
      .mockRejectedValueOnce(new ApiError(500, 'error'))
      .mockRejectedValue(new ApiError(404, 'No existe'));
    const r = await dibujar(cargar);
    await tocar(r, 'Reintentar');
    expect(sinNada(r)).toBe(true);
  });
});
