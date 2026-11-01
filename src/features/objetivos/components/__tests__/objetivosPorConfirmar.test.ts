import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Los objetivos de 90 días «por confirmar» (spec 026): la etiqueta en la tarjeta del objetivo, la tarjeta «Revisa tus objetivos»
 * de Plan y la hoja donde se revisan y confirman (texto editable con contador de 500, aviso de «una sola vez», un PUT por eje y
 * qué eje falló). Lo que decide cada regla vive en `objetivosPorConfirmar` (probada aparte); acá, qué se dibuja y qué hace cada toque.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
type PropsDeHoja = { visible?: boolean; titulo?: string; children?: React.ReactNode; pie?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.children, p.pie) : null) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));

import { tacto } from '../../../../utils/tacto';
import type { RocaMaestraApi } from '../../types/objetivos.types';
import type { ResultadoDeConfirmar } from '../../hooks/useRocasMaestras';
import { HojaConfirmarObjetivos } from '../HojaConfirmarObjetivos';
import { TarjetaRevisaTusObjetivos } from '../TarjetaRevisaTusObjetivos';
import { TarjetaDelObjetivo } from '../TarjetasDelPlan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roca = (eje: RocaMaestraApi['eje'], objetivo: string, extra: Partial<RocaMaestraApi> = {}): RocaMaestraApi => ({
  id: `m-${eje}`, eje, objetivo, meta: null, avance: null, unidad: null, lineaBase: null, porcentaje: null,
  creadoEn: '2026-11-02T10:00:00Z', actualizadoEn: '2026-11-02T10:00:00Z', origin: 'DIAGNOSTICO', confirmed: false, ...extra,
});

let raiz: ReactTestRenderer | null = null;
const textos = (): string[] =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const todo = () => textos().join(' | ');
const botones = (): ReactTestInstance[] =>
  raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View');
const botonCon = (texto: string) =>
  botones().find(b => String(b.props.accessibilityLabel ?? '').includes(texto) || b.findAll(x => (x.type as unknown) === 'Text' && React.Children.toArray(x.props.children).join('').includes(texto)).length > 0);
const campos = (): ReactTestInstance[] => raiz!.root.findAll(x => typeof x.props.onChangeText === 'function' && (x.type as unknown) === 'TextInput');
const iconos = () => raiz!.root.findAll(x => typeof x.props.name === 'string' && typeof x.props.size === 'number').map(x => x.props.name as string);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  Object.values(tacto).forEach(f => (f as jest.Mock).mockReset());
});

describe('la tarjeta del objetivo marca lo que está por confirmar', () => {
  function montar(r: RocaMaestraApi | null, alAbrirOpciones = jest.fn()) {
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(TarjetaDelObjetivo, { roca: r, cargando: false, error: null, cifraDelMes: null, alAbrirOpciones, alCambiarElMes: jest.fn() }),
      );
    });
    return alAbrirOpciones;
  }

  it('un objetivo del diagnóstico sin confirmar lleva «Por confirmar» con ícono (no solo color) y sus «…» dicen revisar', () => {
    const abrir = montar(roca('CUERPO', 'Bajar de peso'));
    expect(textos()).toContain('Por confirmar');
    expect(iconos()).toContain('hourglass');
    const puntos = botonCon('Revisar y confirmar el objetivo');
    expect(puntos).toBeDefined();
    act(() => puntos!.props.onPress());
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('la etiqueta y su fondo tienen forma propia: píldora con borde', () => {
    montar(roca('CUERPO', 'Bajar de peso'));
    const chip = raiz!.root.findAll(x => x.props.accessibilityLabel === 'Por confirmar')[0];
    const estilo = StyleSheet.flatten(chip.props.style);
    expect(estilo.borderWidth).toBe(1);
    expect(estilo.borderRadius).toBeGreaterThanOrEqual(16);
  });

  it('confirmado (o de otro origen, o de un servidor anterior) no lleva la etiqueta y vuelve a «Más opciones»', () => {
    montar(roca('CUERPO', 'Bajar de peso', { confirmed: true }));
    expect(textos()).not.toContain('Por confirmar');
    expect(botonCon('Más opciones del objetivo')).toBeDefined();
    act(() => raiz?.unmount());
    montar(roca('CUERPO', 'Bajar de peso', { origin: undefined, confirmed: undefined }));
    expect(textos()).not.toContain('Por confirmar');
  });
});

describe('«Revisa tus objetivos de 90 días»', () => {
  it('dice cuántos faltan, explica qué pasa y «Revisar y confirmar» abre la hoja', () => {
    const alRevisar = jest.fn();
    act(() => {
      raiz = TestRenderer.create(React.createElement(TarjetaRevisaTusObjetivos, { cantidad: 3, alRevisar }));
    });
    expect(todo()).toContain('Revisa tus objetivos de 90 días');
    expect(todo()).toContain('3 objetivos por confirmar');
    expect(todo()).toContain('después quedan fijos');
    act(() => botonCon('Revisar y confirmar')!.props.onPress());
    expect(alRevisar).toHaveBeenCalledTimes(1);
  });

  it('con uno solo habla en singular', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(TarjetaRevisaTusObjetivos, { cantidad: 1, alRevisar: jest.fn() }));
    });
    expect(todo()).toContain('1 objetivo por confirmar');
    expect(todo()).not.toContain('1 objetivos');
  });

  it('sin voseo ni nombrar el Mapa', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(TarjetaRevisaTusObjetivos, { cantidad: 2, alRevisar: jest.fn() }));
    });
    expect(todo()).not.toMatch(/\b(confirmá|revisá|escribí|podés|tenés)\b/i);
    expect(todo()).not.toContain('Mapa');
  });
});

describe('la hoja para revisar y confirmar', () => {
  const pendientes = [roca('TRABAJO', 'Facturar 30 mil al mes'), roca('CUERPO', 'Bajar a 80 kg')];
  let alConfirmar: jest.Mock<(items: { eje: string; objetivo: string }[]) => Promise<ResultadoDeConfirmar>>;
  function montar(extra: { pendientes?: RocaMaestraApi[]; guardando?: boolean } = {}) {
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(HojaConfirmarObjetivos, {
          visible: true,
          pendientes: extra.pendientes ?? pendientes,
          guardando: extra.guardando ?? false,
          alCerrar: jest.fn(),
          alConfirmar: alConfirmar as never,
        }),
      );
    });
  }
  const escribir = (indice: number, texto: string) => act(() => campos()[indice].props.onChangeText(texto));
  const confirmar = async () => {
    await act(async () => {
      botonCon('Confirmar mis objetivos')!.props.onPress();
    });
  };
  const nuevoMock = () => {
    alConfirmar = jest.fn<(items: { eje: string; objetivo: string }[]) => Promise<ResultadoDeConfirmar>>();
  };

  it('el aviso de «una vez» va a la vista, con un campo por objetivo (el principal primero) y su contador', () => {
    nuevoMock();
    montar();
    expect(todo()).toContain('Puedes reescribirlos una vez. Después quedan fijos.');
    expect(campos()).toHaveLength(2);
    expect(campos()[0].props.value).toBe('Facturar 30 mil al mes');
    expect(campos()[1].props.value).toBe('Bajar a 80 kg');
    expect(textos().indexOf('Negocio y dinero')).toBeLessThan(textos().indexOf('Cuerpo'));
    expect(textos()).toContain('22 / 500');
    expect(textos()).toContain('13 / 500');
  });

  it('el campo no corta en silencio: sin `maxLength`, y pasar de 500 se dice y no deja confirmar', async () => {
    nuevoMock();
    montar();
    expect(campos().every(c => c.props.maxLength === undefined)).toBe(true);
    escribir(0, 'a'.repeat(501));
    expect(textos()).toContain('501 / 500');
    expect(todo()).toContain('Máximo 500 caracteres.');
    await confirmar();
    expect(alConfirmar).not.toHaveBeenCalled();
    expect(tacto.error).toHaveBeenCalled();
    expect(campos()[0].props.value).toHaveLength(501);
  });

  it('un objetivo vacío tampoco se confirma: dice «Escribe tu objetivo.»', async () => {
    nuevoMock();
    montar();
    escribir(1, '   ');
    await confirmar();
    expect(alConfirmar).not.toHaveBeenCalled();
    expect(todo()).toContain('Escribe tu objetivo.');
  });

  it('«Confirmar mis objetivos» manda cada eje con su texto (el reescrito y el que no se tocó), recortado de espacios', async () => {
    nuevoMock();
    alConfirmar.mockResolvedValue({ ok: true, confirmados: ['TRABAJO', 'CUERPO'] });
    montar();
    escribir(1, '  Bajar a 78 kg  ');
    await confirmar();
    expect(alConfirmar).toHaveBeenCalledWith([
      { eje: 'TRABAJO', objetivo: 'Facturar 30 mil al mes' },
      { eje: 'CUERPO', objetivo: 'Bajar a 78 kg' },
    ]);
  });

  it('si uno falla dice CUÁL, con el motivo, y qué ya quedó confirmado', async () => {
    nuevoMock();
    alConfirmar.mockResolvedValue({ ok: false, confirmados: ['TRABAJO'], falloEn: 'CUERPO', mensaje: 'Sin conexión con el servidor' });
    montar();
    await confirmar();
    expect(todo()).toContain('No pudimos confirmar tu objetivo de Cuerpo.');
    expect(todo()).toContain('Sin conexión con el servidor');
    expect(todo()).toContain('Ya quedó confirmado: Negocio y dinero.');
    expect(tacto.error).toHaveBeenCalled();
  });

  it('mientras confirma, el botón queda ocupado y no se puede volver a tocar', () => {
    nuevoMock();
    montar({ guardando: true });
    const boton = botones().find(b => b.props.accessibilityState?.busy === true);
    expect(boton).toBeDefined();
    expect(boton!.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it('cerrada la hoja, lo escrito no se queda para la próxima vez', () => {
    nuevoMock();
    montar();
    escribir(0, 'Otro texto');
    act(() => {
      raiz!.update(
        React.createElement(HojaConfirmarObjetivos, { visible: false, pendientes, guardando: false, alCerrar: jest.fn(), alConfirmar: alConfirmar as never }),
      );
    });
    act(() => {
      raiz!.update(
        React.createElement(HojaConfirmarObjetivos, { visible: true, pendientes, guardando: false, alCerrar: jest.fn(), alConfirmar: alConfirmar as never }),
      );
    });
    expect(campos()[0].props.value).toBe('Facturar 30 mil al mes');
  });
});
