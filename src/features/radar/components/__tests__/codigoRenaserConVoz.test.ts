import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La voz en el formulario del Código Renaser (spec 030): dictar cada respuesta, lo que pasa si el micrófono falla y cómo viaja
 * «dictado». El hook del micrófono se reemplaza por un doble controlable: lo que se prueba acá es el formulario, no el motor del
 * teléfono (eso lo prueban `useDictado` y `useDictadoDelRadar`).
 *
 * Desde el 2026-11-03 «Escuchar» ya no existe (el dueño: «con solo leer ya basta») y el micrófono de «Dictar» es un ícono DENTRO del
 * campo de cada respuesta (sin texto): se busca por su nombre accesible, y su estado activo se lee en `accessibilityState`.
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
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() } }));

const mockBorrarBorrador = jest.fn(async (..._args: unknown[]) => undefined);
const mockGuardarBorrador = jest.fn(async (..._args: unknown[]) => undefined);
const mockLeerBorrador = jest.fn(async (..._args: unknown[]): Promise<unknown> => null);
jest.mock('../../storage/borradorRadar', () => ({
  borrarBorrador: (...args: unknown[]) => mockBorrarBorrador(...args),
  guardarBorrador: (...args: unknown[]) => mockGuardarBorrador(...args),
  leerBorrador: (...args: unknown[]) => mockLeerBorrador(...args),
  limpiarBorradoresViejos: async () => undefined,
}));

/* El micrófono, un doble que el formulario controla igual que al verdadero. */
const mockDictado = {
  disponible: true,
  dictandoEn: null as string | null,
  parcial: '',
  fallo: null as { campo: string; mensaje: string } | null,
  alternar: jest.fn((_campo: string) => undefined),
  detener: jest.fn(),
};
const mockPide: { alDictar: ((campo: string, texto: string) => void) | null } = { alDictar: null };
jest.mock('../../hooks/useDictadoDelRadar', () => ({
  useDictadoDelRadar: (alDictar: (campo: string, texto: string) => void) => {
    mockPide.alDictar = alDictar;
    return mockDictado;
  },
}));
import { Icon } from '../../../../components/Icon';
import { Presionable } from '../../../../components/Presionable';
import { MAXIMO_CARACTERES, PREGUNTAS_RADAR } from '../../config/configRadar';
import type { CheckInRadarApi } from '../../types/radar.types';
import { CodigoRenaserModal } from '../CodigoRenaserModal';
import { EnergiaEnChips } from '../EnergiaEnChips';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Las instancias de un componente dentro de un árbol (los tipos de `react-test-renderer` de este proyecto no traen `findAllByType`). */
const porTipo = (raiz: ReactTestInstance, tipo: unknown): ReactTestInstance[] => raiz.findAll(n => (n.type as unknown) === tipo);

const onEnviar = jest.fn(async (_c: CheckInRadarApi) => true);
const onCerrar = jest.fn();
const slot = { hora: 14, etiqueta: '14:00', cierraA: '15:00' } as never;

const montadas: ReactTestRenderer[] = [];
function montar(extra: { visible?: boolean; usuarioId?: string | null; obligatorio?: boolean } = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(CodigoRenaserModal, {
        visible: true,
        slot,
        obligatorio: true,
        usuarioId: null,
        enviando: false,
        error: null,
        onEnviar,
        onCerrar,
        onLimpiarError: () => undefined,
        ...extra,
      }),
    );
  });
  montadas.push(r);
  return r;
}

function textoDe(n: ReactTestInstance): string {
  return n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string').join(''))
    .join(' | ');
}
/** Los botones de verdad: un `Presionable` por botón (el `Pressable` y la vista de adentro repetirían la cuenta). */
const botones = (r: ReactTestRenderer) => r.root.findAll((n: ReactTestInstance) => n.type === Presionable);
const botonPorNombre = (r: ReactTestRenderer, nombre: string) => {
  const [b] = botones(r).filter(n => n.props.accessibilityLabel === nombre);
  return b;
};
/** Los micrófonos de «Dictar», por su nombre accesible (son solo ícono: no tienen texto). */
const microfonos = (r: ReactTestRenderer) =>
  botones(r).filter(n => /^(Dictar|Parar de dictar)/.test(String(n.props.accessibilityLabel ?? '')));
const iconoDe = (n: ReactTestInstance) => porTipo(n, Icon)[0]?.props.name as string | undefined;
const [P_HACE, P_PIENSA, P_SIENTE] = PREGUNTAS_RADAR.map(p => p.titulo);
const campos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'TextInput');
const valores = (r: ReactTestRenderer) => campos(r).map(c => c.props.value as string);

function escribir(r: ReactTestRenderer, indice: number, texto: string) {
  act(() => campos(r)[indice].props.onChangeText(texto));
}
function energia(r: ReactTestRenderer, valor: number) {
  act(() => porTipo(r.root, EnergiaEnChips)[0].props.onChange(valor));
}
async function registrar(r: ReactTestRenderer, etiqueta = 'Registrar') {
  const [boton] = r.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === 'button' && textoDe(n) === etiqueta);
  expect(boton).toBeDefined();
  await act(async () => {
    boton.props.onPress();
  });
}
const dictar = (campo: string, texto: string) => act(() => mockPide.alDictar!(campo, texto));

afterEach(() => {
  // Desmontar apaga los temporizadores del borrador: ninguna prueba deja uno corriendo.
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

beforeEach(() => {
  onEnviar.mockReset();
  onEnviar.mockResolvedValue(true);
  onCerrar.mockClear();
  mockBorrarBorrador.mockClear();
  mockGuardarBorrador.mockClear();
  mockLeerBorrador.mockReset();
  mockLeerBorrador.mockResolvedValue(null);
  Object.assign(mockDictado, { disponible: true, dictandoEn: null, parcial: '', fallo: null });
  mockDictado.alternar.mockReset();
  mockDictado.detener.mockReset();
  mockPide.alDictar = null;
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

describe('el micrófono de «Dictar» (User Story 1, 3 y 4)', () => {
  it('cada una de las cuatro preguntas trae un micrófono, con el nombre de su pregunta para el lector de pantalla; ya no hay «Escuchar»', () => {
    const r = montar();
    for (const p of PREGUNTAS_RADAR) expect(botonPorNombre(r, `Dictar la respuesta a ${p.titulo}`)).toBeDefined();
    expect(microfonos(r)).toHaveLength(4);
    // Son solo ícono: ninguno dibuja la palabra «Dictar».
    expect(microfonos(r).map(textoDe).join('')).toBe('');
    expect(botones(r).filter(n => /Escuchar|Detener la lectura/.test(String(n.props.accessibilityLabel ?? '')))).toHaveLength(0);
    expect(textoDe(r.root)).not.toMatch(/Escuchar/);
  });

  it('la energía es el control de un toque (chips) y no se dicta', () => {
    const r = montar();
    expect(porTipo(r.root, EnergiaEnChips)).toHaveLength(1);
    expect(botones(r).filter(n => /energía/i.test(String(n.props.accessibilityLabel ?? '')) && /dictar/i.test(String(n.props.accessibilityLabel)))).toHaveLength(0);
  });

  it('sin reconocimiento de voz en el teléfono no hay micrófono y el formulario es el de escribir', () => {
    mockDictado.disponible = false;
    const r = montar();
    expect(microfonos(r)).toHaveLength(0);
    expect(campos(r)).toHaveLength(4);
  });

  it('tocar el micrófono de una pregunta abre el de ESA pregunta (una vibración por toque)', () => {
    const r = montar();
    act(() => botonPorNombre(r, `Dictar la respuesta a ${P_SIENTE}`).props.onPress());
    expect(mockDictado.alternar).toHaveBeenCalledTimes(1);
    expect(mockDictado.alternar).toHaveBeenCalledWith('whatAmIFeeling');
  });

  it('el estado no depende solo del color: dictando se marca seleccionado y cambia su nombre para el lector', () => {
    mockDictado.dictandoEn = 'whatAmIFeeling';
    const r = montar();

    const parar = botonPorNombre(r, `Parar de dictar la respuesta a ${P_SIENTE}`);
    expect(parar.props.accessibilityState).toMatchObject({ selected: true });
    expect(iconoDe(parar)).toBe('mic');
    const reposo = botonPorNombre(r, `Dictar la respuesta a ${P_PIENSA}`);
    expect(reposo.props.accessibilityState).toMatchObject({ selected: false });
    // Las otras tres preguntas siguen en reposo.
    expect(microfonos(r).filter(n => n.props.accessibilityState.selected)).toHaveLength(1);
    expect(botonPorNombre(r, `Dictar la respuesta a ${P_HACE}`)).toBeDefined();
  });

  it('ya no hay una línea de «Te escucho» ni de «sube el volumen»: el campo dice «Te escucho…» y el micrófono se ve activo', () => {
    mockDictado.dictandoEn = 'whatAmIFeeling';
    const r = montar();
    expect(textoDe(r.root)).not.toContain('Toca el micrófono para parar');
    expect(textoDe(r.root)).not.toContain('sube el volumen');
    expect(campos(r)[2].props.placeholder).toBe('Te escucho…');
  });

  it('el mismo formulario sirve a las cuatro entradas: obligatoria o no, trae los mismos micrófonos', () => {
    const obligatoria = montar({ obligatorio: true });
    const opcional = montar({ obligatorio: false });
    const nombres = (r: ReactTestRenderer) => microfonos(r).map(n => String(n.props.accessibilityLabel ?? ''));
    expect(nombres(opcional)).toEqual(nombres(obligatoria));
    expect(nombres(obligatoria)).toHaveLength(4);
  });
});

describe('dictar una respuesta (User Story 1)', () => {
  it('lo dictado se suma al final de lo escrito y queda editable (escenarios 1 y 2)', () => {
    const r = montar();
    escribir(r, 2, 'Estoy cansada,');

    dictar('whatAmIFeeling', 'pero contenta');

    expect(valores(r)[2]).toBe('Estoy cansada, pero contenta');
    expect(campos(r)[2].props.editable).toBe(true);
    escribir(r, 2, 'Estoy cansada, pero contenta con el día');
    expect(valores(r)[2]).toBe('Estoy cansada, pero contenta con el día');
  });

  it('mientras habla, el campo muestra lo que se va entendiendo, no se puede teclear y dice «Te escucho…»', () => {
    mockDictado.dictandoEn = 'whatAmIThinking';
    mockDictado.parcial = 'estoy pensando en la cuenta';
    const r = montar();
    escribir(r, 1, 'Pienso que');

    expect(valores(r)[1]).toBe('Pienso que estoy pensando en la cuenta');
    expect(campos(r)[1].props.editable).toBe(false);
    expect(campos(r)[1].props.placeholder).toBe('Te escucho…');
    // Las otras tres preguntas no se tocan.
    expect(campos(r)[0].props.editable).toBe(true);
  });

  it('dictar no registra nada solo (escenario 4): hace falta «Registrar» y las cuatro respuestas con la energía', async () => {
    const r = montar();
    for (const p of PREGUNTAS_RADAR) dictar(p.campo, `dicho ${p.campo}`);
    energia(r, 6);

    expect(onEnviar).not.toHaveBeenCalled();
    expect(onCerrar).not.toHaveBeenCalled();

    await registrar(r);
    expect(onEnviar).toHaveBeenCalledTimes(1);
  });

  it('en los días 1 a 7 la obligatoriedad no cambia: sin «Registrar» no hay salida, dictes o no (escenario 6)', () => {
    const r = montar({ obligatorio: true });
    dictar('whatAmIDoing', 'algo');
    expect(botones(r).filter(n => n.props.accessibilityLabel === 'Cerrar')).toHaveLength(0);
  });

  it('se corta en los 2 000 caracteres, igual que al escribir (escenario 5)', () => {
    const r = montar();
    escribir(r, 0, 'a'.repeat(MAXIMO_CARACTERES - 3));

    dictar('whatAmIDoing', 'una frase larga que no cabe');

    expect(valores(r)[0]).toHaveLength(MAXIMO_CARACTERES);
  });

  it('el registro de lo dictado lleva los mismos cinco campos y `dictado: true`', async () => {
    const r = montar();
    escribir(r, 0, 'escrito');
    escribir(r, 1, 'escrito');
    dictar('whatAmIFeeling', 'dictado');
    escribir(r, 3, 'escrito');
    energia(r, 8);

    await registrar(r);

    expect(onEnviar).toHaveBeenCalledWith({
      whatAmIDoing: 'escrito',
      whatAmIThinking: 'escrito',
      whatAmIFeeling: 'dictado',
      energyLevel: 8,
      whatAmIAvoiding: 'escrito',
      dictado: true,
    });
  });

  it('lo escrito a mano se registra como siempre: sin la clave `dictado`', async () => {
    const r = montar();
    for (let i = 0; i < 4; i += 1) escribir(r, i, 'escrito');
    energia(r, 8);

    await registrar(r);

    const enviado = onEnviar.mock.calls[0][0];
    expect(Object.keys(enviado)).not.toContain('dictado');
  });

  it('si la persona borra por completo lo dictado y lo escribe de nuevo, ya no cuenta como dictado', async () => {
    const r = montar();
    dictar('whatAmIDoing', 'dictado');
    escribir(r, 0, '');
    for (let i = 0; i < 4; i += 1) escribir(r, i, 'escrito a mano');
    energia(r, 5);

    await registrar(r);

    expect(Object.keys(onEnviar.mock.calls[0][0])).not.toContain('dictado');
  });

  it('corregir una palabra de lo dictado no le quita la marca', async () => {
    const r = montar();
    dictar('whatAmIDoing', 'estoy en la ofisina');
    escribir(r, 0, 'estoy en la oficina');
    for (let i = 1; i < 4; i += 1) escribir(r, i, 'escrito');
    energia(r, 5);

    await registrar(r);

    expect(onEnviar.mock.calls[0][0]).toMatchObject({ dictado: true });
  });

  it('un dictado que no agrega nada (el campo ya estaba lleno) no marca el registro como dictado', async () => {
    const r = montar();
    escribir(r, 0, 'a'.repeat(MAXIMO_CARACTERES));
    dictar('whatAmIDoing', 'no cabe');
    for (let i = 1; i < 4; i += 1) escribir(r, i, 'escrito');
    energia(r, 5);

    await registrar(r);

    expect(Object.keys(onEnviar.mock.calls[0][0])).not.toContain('dictado');
  });

  it('con el micrófono abierto, «Registrar» lo cierra en vez de registrar: el texto dictado llega al cerrarse', async () => {
    mockDictado.dictandoEn = 'whatAmIFeeling';
    const r = montar();
    for (let i = 0; i < 4; i += 1) escribir(r, i, 'escrito');
    energia(r, 5);

    expect(textoDe(r.root)).toContain('Terminar de dictar');
    await registrar(r, 'Terminar de dictar');

    expect(mockDictado.detener).toHaveBeenCalled();
    expect(onEnviar).not.toHaveBeenCalled();
  });
});

describe('si la voz no se puede usar, se escribe y no se pierde nada (User Story 2)', () => {
  it('el aviso aparece bajo la pregunta que se intentaba, como alerta, y las otras tres no lo muestran', () => {
    mockDictado.fallo = { campo: 'whatAmIFeeling', mensaje: 'Para dictar necesito permiso del micrófono. Puedes activarlo en los ajustes del teléfono.' };
    const r = montar();

    const alertas = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'alert');
    expect(alertas).toHaveLength(1);
    expect(textoDe(alertas[0])).toContain('ajustes del teléfono');
  });

  it('lo escrito y lo dictado antes siguen en los cuatro campos, y se puede terminar y registrar escribiendo (escenario 5)', async () => {
    const r = montar();
    escribir(r, 0, 'escrito uno');
    dictar('whatAmIThinking', 'dictado dos');
    mockDictado.fallo = { campo: 'whatAmIFeeling', mensaje: 'No hay conexión para reconocer tu voz. Intenta de nuevo o escribe tu respuesta.' };
    escribir(r, 2, 'escrito tres');
    escribir(r, 3, 'escrito cuatro');
    energia(r, 4);

    expect(valores(r)).toEqual(['escrito uno', 'dictado dos', 'escrito tres', 'escrito cuatro']);
    await registrar(r);

    expect(onEnviar).toHaveBeenCalledWith(
      expect.objectContaining({ whatAmIDoing: 'escrito uno', whatAmIThinking: 'dictado dos', whatAmIFeeling: 'escrito tres', dictado: true }),
    );
  });

  it('sin voz en el teléfono el formulario sigue completo: se escribe y se registra como siempre', async () => {
    mockDictado.disponible = false;
    const r = montar();
    for (let i = 0; i < 4; i += 1) escribir(r, i, 'escrito');
    energia(r, 3);

    await registrar(r);

    expect(onEnviar).toHaveBeenCalledTimes(1);
  });
});

describe('al cerrarse el formulario', () => {
  it('no queda el micrófono abierto', () => {
    const r = montar({ visible: true });
    mockDictado.detener.mockReset();

    act(() => {
      r.update(
        React.createElement(CodigoRenaserModal, {
          visible: false,
          slot,
          obligatorio: false,
          usuarioId: null,
          enviando: false,
          error: null,
          onEnviar,
          onCerrar,
          onLimpiarError: () => undefined,
        }),
      );
    });

    expect(mockDictado.detener).toHaveBeenCalled();
  });
});

describe('el borrador conserva lo dictado igual que lo escrito (escenario 7)', () => {
  it('guarda qué respuestas se dictaron junto con el texto', async () => {
    jest.useFakeTimers();
    try {
      const r = montar({ usuarioId: 'u1' });
      await act(async () => {
        await Promise.resolve();
      });
      dictar('whatAmIFeeling', 'dictado');
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockGuardarBorrador).toHaveBeenLastCalledWith(
        'u1',
        expect.any(Date),
        expect.objectContaining({ dictados: ['whatAmIFeeling'], respuestas: expect.objectContaining({ whatAmIFeeling: 'dictado' }) }),
      );
      act(() => r.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('al reabrir, vuelve el texto y la marca de dictado: el registro sigue diciendo «dictado»', async () => {
    mockLeerBorrador.mockResolvedValue({
      respuestas: { whatAmIDoing: 'uno', whatAmIThinking: 'dos', whatAmIFeeling: 'tres dictado', whatAmIAvoiding: 'cuatro' },
      energia: 7,
      dictados: ['whatAmIFeeling'],
      guardadoEn: '2026-10-31T19:00:00Z',
    });
    let r!: ReactTestRenderer;
    await act(async () => {
      r = montar({ usuarioId: 'u1' });
      await Promise.resolve();
    });

    expect(valores(r)).toEqual(['uno', 'dos', 'tres dictado', 'cuatro']);
    await registrar(r);
    expect(onEnviar.mock.calls[0][0]).toMatchObject({ dictado: true, energyLevel: 7 });
  });

  it('un borrador anterior a la voz (sin marcas) se lee sin ninguna: se registra como escrito', async () => {
    mockLeerBorrador.mockResolvedValue({
      respuestas: { whatAmIDoing: 'uno', whatAmIThinking: 'dos', whatAmIFeeling: 'tres', whatAmIAvoiding: 'cuatro' },
      energia: 7,
      guardadoEn: '2026-10-31T19:00:00Z',
    });
    let r!: ReactTestRenderer;
    await act(async () => {
      r = montar({ usuarioId: 'u1' });
      await Promise.resolve();
    });

    await registrar(r);
    expect(Object.keys(onEnviar.mock.calls[0][0])).not.toContain('dictado');
  });
});
