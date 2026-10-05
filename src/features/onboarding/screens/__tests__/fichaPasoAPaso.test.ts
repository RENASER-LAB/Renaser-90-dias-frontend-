import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Ficha Inicial de a un paso por pantalla (2026-10-05, pedido del dueño: «veo cosas como si fuera
 * una web, tipo el registro, que lo hace por fases»).
 *
 * Lo que se prueba es el contrato que NO podía cambiar con la forma: dentro de un capítulo,
 * «SIGUIENTE» sólo muestra el paso siguiente (no manda nada); al terminar el capítulo se guarda UNA
 * vez, con las mismas respuestas y el mismo `avanzarEstado` de antes; y «atrás» (flecha o gesto del
 * sistema) retrocede un paso, nunca sale de la ficha salvo desde el primero.
 *
 * Contra el código de antes estas pruebas fallan: allí «SIGUIENTE» en el capítulo 1 validaba las
 * doce preguntas juntas y, con el nombre solo, decía «Sexo requerido» en vez de pasar a «Sobre ti».
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockGuardarCapitulo = jest.fn(async (_respuestas: unknown) => ({ pendientes: 0 }));
const mockAvanzarEstado = jest.fn(async (_estado: unknown) => undefined);
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };
let mockAtrasDelSistema: (() => boolean | void) | null = null;

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
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));
// Con un «getter»: la fábrica corre al importar la pantalla, antes de que `mockTacto` exista.
jest.mock('../../../../utils/tacto', () => ({
  get tacto() {
    return mockTacto;
  },
}));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (manejador: () => boolean | void, activo: boolean) => {
    if (activo) mockAtrasDelSistema = manejador;
  },
}));
jest.mock('../../hooks/usePersistenciaOnboarding', () => ({
  usePersistenciaOnboarding: () => ({
    guardarCapitulo: (respuestas: unknown) => mockGuardarCapitulo(respuestas),
    avanzarEstado: (estado: unknown) => mockAvanzarEstado(estado),
  }),
}));
jest.mock('../../../../services/storage/almacenamientoLocal', () => ({
  almacenamientoLocal: {
    leerBorradorFicha: async () => null,
    guardarBorradorFicha: async () => undefined,
    borrarBorradorFicha: async () => undefined,
  },
}));
jest.mock('../../api/onboardingApi', () => ({ obtenerRespuestas: async () => ({ sections: [] }) }));

import { FichaInicialScreen } from '../FichaInicialScreen';
import { PasoDocumento, PasoSobreTi, PasoWhatsapp } from '../../components/ChapterIdentidad';
import { mapearIdentidad } from '../../data/mapaPreguntas';
import { INITIAL_FICHA_DATA } from '../../data/chaptersConfig';
import type { FichaIdentidadData } from '../../types/onboarding.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const onComplete = jest.fn();
const onBack = jest.fn();

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(FichaInicialScreen, {
        userId: 'u-1',
        initialUserName: 'Ana Pérez',
        initialUserEmail: 'ana@renaser.test',
        onComplete,
        onBack,
      }),
    );
  });
  return r;
}

/** El título grande del paso que se ve. */
function titulo(r: ReactTestRenderer): string {
  const [cabecera] = r.root.findAll(n => n.props.accessibilityRole === 'header' && typeof n.props.children === 'string');
  return cabecera.props.children as string;
}

async function siguiente(r: ReactTestRenderer) {
  const [boton] = r.root.findAll(n => n.props.label === 'SIGUIENTE' || n.props.label === 'CONTINUAR A TÉRMINOS');
  await act(async () => {
    await boton.props.onPress();
  });
}

/** Cambia la identidad como lo haría el paso en pantalla. */
function completar(r: ReactTestRenderer, tipo: typeof PasoSobreTi, cambios: Partial<FichaIdentidadData>) {
  const [paso] = r.root.findAll(n => n.type === tipo);
  act(() => paso.props.onChange({ ...paso.props.data, ...cambios }));
}

beforeEach(() => {
  mockAlerta.mockReset();
  mockGuardarCapitulo.mockClear();
  mockAvanzarEstado.mockClear();
  mockTacto.seleccion.mockReset();
  mockTacto.error.mockReset();
  mockTacto.logro.mockReset();
  mockAtrasDelSistema = null;
  onComplete.mockReset();
  onBack.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Ficha Inicial de a un paso por pantalla', () => {
  it('con el nombre lleno, SIGUIENTE pasa a «Sobre ti» sin mandar nada todavía', async () => {
    raiz = await montar();
    expect(titulo(raiz)).toBe('Nombre completo');

    await siguiente(raiz);
    expect(titulo(raiz)).toBe('Sobre ti');
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockGuardarCapitulo).not.toHaveBeenCalled();
    expect(mockAvanzarEstado).not.toHaveBeenCalled();
  });

  it('un paso incompleto dice qué falta (mismo aviso de siempre), vibra y no avanza', async () => {
    raiz = await montar();
    await siguiente(raiz);

    await siguiente(raiz);
    expect(mockAlerta).toHaveBeenCalledWith('Sexo requerido', 'Por favor selecciona una opción de sexo.');
    expect(mockTacto.error).toHaveBeenCalledTimes(1);
    expect(titulo(raiz)).toBe('Sobre ti');
  });

  it('el capítulo 1 se guarda UNA vez al final, con las mismas respuestas y el mismo estado', async () => {
    raiz = await montar();
    await siguiente(raiz); // nombre → sobre ti
    completar(raiz, PasoSobreTi, { sexo: 'Femenino', fechaNacimiento: '15/06/1995' });
    await siguiente(raiz); // → familia
    await siguiente(raiz); // → trabajo
    await siguiente(raiz); // → documento
    completar(raiz, PasoDocumento, { numeroDocumento: '72345678' });
    await siguiente(raiz); // → whatsapp
    completar(raiz, PasoWhatsapp, { whatsapp: '+51 987654321' });
    await siguiente(raiz); // → ubicación
    await siguiente(raiz); // → expectativa
    await siguiente(raiz); // → temor
    expect(titulo(raiz)).toBe('¿Qué temes que no funcione?');
    expect(mockGuardarCapitulo).not.toHaveBeenCalled();

    await siguiente(raiz); // cierra el capítulo 1

    expect(mockGuardarCapitulo).toHaveBeenCalledTimes(1);
    expect(mockGuardarCapitulo.mock.calls[0][0]).toEqual(
      mapearIdentidad({
        ...INITIAL_FICHA_DATA.identidad,
        nombre: 'Ana Pérez',
        email: 'ana@renaser.test',
        sexo: 'Femenino',
        fechaNacimiento: '15/06/1995',
        numeroDocumento: '72345678',
        whatsapp: '+51 987654321',
        codigoPais: '+51',
      }),
    );
    expect(mockAvanzarEstado).toHaveBeenCalledWith({
      flow: 'ficha_inicial',
      section: 'identidad_operativa',
      step: 0,
      flowProgress: JSON.stringify({ chapter: 0, totalChapters: 3, porcentaje: 33 }),
    });
    expect(mockTacto.logro).toHaveBeenCalledTimes(1);
    expect(titulo(raiz)).toBe('Tu descanso');
  });

  it('si el guardado del capítulo falla, avisa y NO avanza (decisión 2026-09-03)', async () => {
    mockGuardarCapitulo.mockResolvedValueOnce({ pendientes: 1 });
    raiz = await montar();
    await siguiente(raiz);
    completar(raiz, PasoSobreTi, { sexo: 'Otro', fechaNacimiento: '01/01/1980' });
    for (let i = 0; i < 3; i++) await siguiente(raiz);
    completar(raiz, PasoDocumento, { numeroDocumento: '12345678' });
    await siguiente(raiz);
    completar(raiz, PasoWhatsapp, { whatsapp: '+51 999888777' });
    for (let i = 0; i < 4; i++) await siguiente(raiz);

    expect(mockAlerta).toHaveBeenCalledWith(
      'No se pudo guardar',
      'No pudimos guardar tus respuestas de este capítulo. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(mockAvanzarEstado).not.toHaveBeenCalled();
    expect(titulo(raiz)).toBe('¿Qué temes que no funcione?');
  });

  it('el gesto atrás del sistema retrocede UN paso; sólo desde el primero sale de la ficha', async () => {
    raiz = await montar();
    await siguiente(raiz);
    expect(titulo(raiz)).toBe('Sobre ti');

    act(() => {
      expect(mockAtrasDelSistema?.()).toBe(true);
    });
    expect(titulo(raiz)).toBe('Nombre completo');
    expect(onBack).not.toHaveBeenCalled();

    act(() => {
      mockAtrasDelSistema?.();
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('en el primer paso la flecha dice «Salir»; después es una flecha sola', async () => {
    raiz = await montar();
    expect(raiz.root.findAll(n => n.props.accessibilityLabel === 'Salir de la ficha inicial').length).toBeGreaterThan(0);
    await siguiente(raiz);
    expect(raiz.root.findAll(n => n.props.accessibilityLabel === 'Volver al paso anterior').length).toBeGreaterThan(0);
  });
});
