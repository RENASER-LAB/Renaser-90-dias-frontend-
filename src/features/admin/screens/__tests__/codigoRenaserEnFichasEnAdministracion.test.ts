/**
 * «Código Renaser en las fichas» (spec 034, D-299; pedido del dueño del 2026-10-31) está enchufada en Administración, se abre
 * desde «Más opciones» y se dibuja con sus estados. Mezcla lectura del código (el cableado, como las otras de Administración) y
 * un dibujo real de la pantalla con el hook simulado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: require('react').createContext(null),
}));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), seleccion: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../components/ConfirmacionEnLinea', () => ({
  ConfirmacionEnLinea: ({ texto }: { texto: string }) => require('react').createElement('Text', { testID: 'hecho' }, texto),
}));
const mockConfirmar = jest.fn<(titulo: string, mensaje?: string, opciones?: { ok?: string }) => Promise<boolean>>();
jest.mock('../../utils/dialogo', () => ({ confirmar: (...args: [string, string?, { ok?: string }?]) => mockConfirmar(...args) }));

type Estado = ReturnType<typeof import('../../hooks/useCodigoRenaserEnFichas').useCodigoRenaserEnFichas>;
let mockEstado: Partial<Estado> = {};
jest.mock('../../hooks/useCodigoRenaserEnFichas', () => ({ useCodigoRenaserEnFichas: () => mockEstado }));

import { CodigoRenaserEnFichasAdminScreen } from '../CodigoRenaserEnFichasAdminScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

const cambiar = jest.fn<Estado['cambiar']>();
const reintentar = jest.fn<Estado['reintentar']>();

const APAGADO = { visible: false, mixto: false, porRol: {}, ultimoCambio: null };
const BASE: Partial<Estado> = { estado: APAGADO, cargando: false, guardando: false, fallo: null, cambiar, reintentar };

let raiz: ReactTestRenderer | null = null;
function dibujar(cambios: Partial<Estado> = {}): ReactTestRenderer {
  mockEstado = { ...BASE, ...cambios };
  act(() => raiz?.unmount());
  act(() => {
    raiz = TestRenderer.create(React.createElement(CodigoRenaserEnFichasAdminScreen, { onVolver: jest.fn() }));
  });
  return raiz!;
}
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.type === 'string' && n.type === 'Text').map(n => [n.props.children].flat().join(''));
const interruptor = (r: ReactTestRenderer): ReactTestInstance => r.root.findAll(n => n.props.accessibilityRole === 'switch')[0];
const boton = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta);

beforeEach(() => {
  cambiar.mockReset().mockResolvedValue({ ...APAGADO, visible: true });
  reintentar.mockReset().mockResolvedValue(null);
  mockConfirmar.mockReset().mockResolvedValue(true);
  mockLogro.mockReset();
});

describe('cableado en Administración', () => {
  it('AdminScreen tiene la vista y «Más opciones» la abre', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'codigo-renaser-en-fichas'\s*\}/);
    expect(admin).toMatch(/<CodigoRenaserEnFichasAdminScreen onVolver=\{volver\}/);
    expect(admin).toMatch(/onAbrirCodigoRenaserEnFichas=\{\(\) => entrar\(\{ nombre: 'codigo-renaser-en-fichas' \}\)\}/);
  });

  it('«Más opciones» la ofrece y sigue la disponibilidad de Administración', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Código Renaser en las fichas'/);
    expect(mas).toMatch(/onPress: onAbrirCodigoRenaserEnFichas/);
    expect(mas).toMatch(/clave: CLAVES\.admin/);
  });
});

describe('la pantalla', () => {
  it('apagado de fábrica: el interruptor sin marcar y una frase que dice quién lo sigue viendo', () => {
    const r = dibujar();
    expect(interruptor(r).props.accessibilityState.checked).toBe(false);
    expect(textos(r).join(' ')).toContain('no lo ven');
    expect(textos(r).join(' ')).toContain('propia persona');
  });

  it('encendido dice que lo ven en la ficha de cada aprendiz', () => {
    const r = dibujar({ estado: { ...APAGADO, visible: true } });
    expect(interruptor(r).props.accessibilityState.checked).toBe(true);
    expect(textos(r).join(' ')).toContain('lo ven en la ficha de cada aprendiz');
  });

  it('si Soporte TI los dejó distintos lo dice, no afirma que lo ven todos', () => {
    const r = dibujar({ estado: { ...APAGADO, mixto: true } });
    expect(textos(r).join(' ')).toContain('Soporte TI lo dejó distinto');
  });

  it('muestra quién lo cambió por última vez, y nada mientras nadie lo hizo', () => {
    expect(textos(dibujar()).join(' ')).not.toContain('Último cambio');
    const r = dibujar({ estado: { ...APAGADO, ultimoCambio: { porNombre: 'Ana Pérez', en: '2026-10-31T23:40:00' } } });
    expect(textos(r).join(' ')).toContain('Último cambio: Ana Pérez');
  });

  it('mientras carga por primera vez dice «Cargando…» y no dibuja el interruptor', () => {
    const r = dibujar({ estado: null, cargando: true });
    expect(textos(r)).toContain('Cargando…');
    expect(r.root.findAll(n => n.props.accessibilityRole === 'switch')).toHaveLength(0);
  });

  it('no pide ningún motivo: no hay campo de texto', () => {
    const r = dibujar();
    expect(r.root.findAll(n => typeof n.type === 'string' && n.type === 'TextInput')).toHaveLength(0);
  });
});

describe('cambiarlo', () => {
  it('pide confirmación, manda el cambio y dice lo hecho con una vibración de logro', async () => {
    const r = dibujar();
    await act(async () => {
      interruptor(r).props.onPress();
    });
    expect(mockConfirmar).toHaveBeenCalledWith('Mostrar el Código Renaser', expect.stringContaining('No se avisa a nadie'), { ok: 'Mostrar' });
    expect(cambiar).toHaveBeenCalledWith(true);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Listo: el mentor y el líder ya ven el Código Renaser.');
  });

  it('apagarlo pregunta por «Ocultar» y manda false', async () => {
    cambiar.mockResolvedValue(APAGADO);
    const r = dibujar({ estado: { ...APAGADO, visible: true } });
    await act(async () => {
      interruptor(r).props.onPress();
    });
    expect(mockConfirmar).toHaveBeenCalledWith('Ocultar el Código Renaser', expect.any(String), { ok: 'Ocultar' });
    expect(cambiar).toHaveBeenCalledWith(false);
    expect(textos(r)).toContain('Listo: el mentor y el líder ya no ven el Código Renaser.');
  });

  it('si la persona cancela la confirmación, no se manda nada', async () => {
    mockConfirmar.mockResolvedValue(false);
    const r = dibujar();
    await act(async () => {
      interruptor(r).props.onPress();
    });
    expect(cambiar).not.toHaveBeenCalled();
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('si el servidor lo rechaza no hay «Listo» ni vibración de logro', async () => {
    cambiar.mockResolvedValue(null);
    const r = dibujar();
    await act(async () => {
      interruptor(r).props.onPress();
    });
    expect(mockLogro).not.toHaveBeenCalled();
    expect(r.root.findAll(n => n.props.testID === 'hecho')).toHaveLength(0);
  });

  it('mientras guarda, el interruptor no se puede volver a tocar', () => {
    const r = dibujar({ guardando: true });
    expect(interruptor(r).props.accessibilityState.disabled).toBe(true);
  });
});

describe('cuando algo falla', () => {
  const CASOS: [NonNullable<Estado['fallo']>, string, boolean][] = [
    ['sin_permiso', 'Tu cuenta no puede cambiar esto.', false],
    ['no_disponible', 'Esta opción todavía no está disponible. Inténtalo cuando se actualice el servidor.', false],
    ['sin_red', 'Sin conexión con el servidor.', true],
    ['error', 'No se pudo cargar esta opción.', true],
  ];
  it.each(CASOS)('%s dice «%s»; «Reintentar» solo si tiene sentido', (fallo, texto, conReintentar) => {
    const r = dibujar({ fallo });
    expect(textos(r)).toContain(texto);
    const reintentos = r.root.findAll(n => typeof n.props.onPress === 'function' && textos({ root: n } as unknown as ReactTestRenderer).includes('Reintentar'));
    expect(reintentos.length > 0).toBe(conReintentar);
  });

  it('«Reintentar» vuelve a pedir lo que falló', async () => {
    const r = dibujar({ fallo: 'sin_red', estado: null });
    const reintento = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Reintentar')[0];
    await act(async () => {
      reintento.props.onPress();
    });
    expect(reintentar).toHaveBeenCalledTimes(1);
  });
});
