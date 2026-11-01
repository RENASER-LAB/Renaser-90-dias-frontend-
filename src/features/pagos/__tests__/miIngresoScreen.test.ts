import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → «Mi ingreso» (spec 032, maqueta del dueño del 2026-11-01): los pasos, «Tu pago fue cancelado» sin cronograma, «Tus fechas de pago» con cronograma
 * (una fila por cuota con «Pagado» o «Pendiente»), y la confirmación UNA sola vez —casilla, nombre y botón—, que se vuelve a pedir si Administración cambió las
 * cuotas. Nunca bloquea nada.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };
// Perezoso: la fábrica corre al primer require (antes de que exista `mockTacto`), así que cada método lee el doble recién al llamarse.
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockTacto.seleccion(), error: () => mockTacto.error(), logro: () => mockTacto.logro() },
}));
const mockFuncion = { prendida: true, aviso: null as string | null, disponible: true };
jest.mock('../../plataforma/estado/useFuncionalidad', () => ({ useFuncionalidad: () => mockFuncion }));
jest.mock('../../plataforma/components/AvisoDeMantenimiento', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { AvisoDeMantenimiento: () => R.createElement(Text, null, 'Esta función está en mantenimiento.') };
});
jest.mock('../../../components/ConfirmacionEnLinea', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { ConfirmacionEnLinea: ({ texto }: { texto: string }) => R.createElement(Text, null, texto) };
});
jest.mock('../components/RecordatoriosDePagoEnMiIngreso', () => ({ RecordatoriosDePagoEnMiIngreso: () => null }));

import type { MiIngreso, PagosDeLaPersona } from '../api/pagosSchemas';
import { MiIngresoScreen } from '../screens/MiIngresoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cuota = (id: string, venceEl: string, pagada: boolean) => ({ id, venceEl, monto: 1000, pagada, marcadaEn: null, marcadaPor: null });
const conCronograma = (confirmacion: Extract<PagosDeLaPersona, { modo: 'CON_CRONOGRAMA' }>['confirmacion']): MiIngreso => ({
  pasos: [{ clave: 'DIAGNOSTICO', hecho: true }, { clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: false }],
  pagos: {
    modo: 'CON_CRONOGRAMA',
    moneda: 'USD',
    cuotas: [cuota('a', '2026-10-15', true), cuota('b', '2026-11-15', false), cuota('c', '2026-12-15', false)],
    confirmacion,
  },
});
const SIN_CONFIRMAR = { estado: 'SIN_CONFIRMAR', confirmadaEn: null, nombre: null } as const;

const onConfirmar = jest.fn<(nombre: string) => Promise<boolean>>();
const onVolver = jest.fn();

function montar(ingreso: MiIngreso): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(MiIngresoScreen, { userId: 'u1', ingreso, onVolver, onConfirmar, onReintentar: () => undefined }));
  });
  return r;
}

const textos = (r: ReactTestRenderer): string =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
const boton = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const campoDelNombre = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.props.accessibilityLabel === 'Tu nombre' && typeof n.props.onChangeText === 'function')[0];
const casilla = (r: ReactTestRenderer) => r.root.findAll(n => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  onConfirmar.mockReset().mockResolvedValue(true);
  onVolver.mockClear();
  Object.values(mockTacto).forEach(f => f.mockClear());
  mockFuncion.prendida = true;
  mockFuncion.aviso = null;
});

describe('con cronograma (la maqueta)', () => {
  it('muestra los pasos, «Tus fechas de pago · Revisa el cronograma acordado.» y una fila por cuota con su estado', () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));
    const texto = textos(r);

    expect(texto).toContain('Diagnóstico');
    expect(texto).toContain('Acuerdo');
    expect(texto).toContain('Pagos');
    expect(texto).toContain('Tus fechas de pago');
    expect(texto).toContain('Revisa el cronograma acordado.');
    expect(texto).toContain('15 oct');
    expect(texto).toContain('15 nov');
    expect(texto).toContain('15 dic');
    expect(texto).toContain('Pagado');
    expect(texto).toContain('Pendiente');
    expect(texto).toContain('US$ 1 000');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Pagos, en curso')).not.toHaveLength(0);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Diagnóstico, hecho')).not.toHaveLength(0);
  });

  it('cada cuota se lee como una sola frase, con su estado en palabras (no solo color)', () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));
    const etiquetas = r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('de noviembre de 2026')).map(n => n.props.accessibilityLabel);
    expect(etiquetas).toContain('15 de noviembre de 2026, US$ 1 000, pendiente');
  });

  it('un paso que no aplica no se dibuja: sin diagnóstico asignado, solo Acuerdo y Pagos', () => {
    const base = conCronograma(SIN_CONFIRMAR);
    const r = montar({ ...base, pasos: base.pasos.filter(p => p.clave !== 'DIAGNOSTICO') });
    expect(textos(r)).not.toContain('Diagnóstico');
    expect(textos(r)).toContain('Acuerdo');
  });

  it('pide confirmar: la casilla «Revisé mis fechas y montos.», «Tu nombre» y «Confirmar cronograma»', () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));
    expect(textos(r)).toContain('Revisé mis fechas y montos.');
    expect(campoDelNombre(r)).toBeDefined();
    expect(boton(r, 'Confirmar cronograma')).toBeDefined();
  });
});

describe('confirmar (una sola vez, sin bloquear nada)', () => {
  it('sin la casilla o sin el nombre no manda nada: dice qué falta y vibra con el error', async () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));

    await act(async () => boton(r, 'Confirmar cronograma').props.onPress());
    expect(textos(r)).toContain('Marca que revisaste tus fechas y montos.');
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(mockTacto.error).toHaveBeenCalledTimes(1);

    act(() => casilla(r).props.onPress());
    await act(async () => boton(r, 'Confirmar cronograma').props.onPress());
    expect(textos(r)).toContain('Escribe tu nombre.');
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('con la casilla y el nombre confirma (el nombre se limpia en la API), vibra el logro y lo dice en una línea', async () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));
    act(() => casilla(r).props.onPress());
    act(() => campoDelNombre(r).props.onChangeText('  Beto Aprendiz '));

    await act(async () => boton(r, 'Confirmar cronograma').props.onPress());

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith('  Beto Aprendiz ');
    expect(mockTacto.logro).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Cronograma confirmado');
  });

  it('si el servidor lo rechaza, dice el motivo y deja lo escrito para reintentar', async () => {
    onConfirmar.mockRejectedValue(new Error('No tienes un cronograma de pagos que confirmar'));
    const r = montar(conCronograma(SIN_CONFIRMAR));
    act(() => casilla(r).props.onPress());
    act(() => campoDelNombre(r).props.onChangeText('Beto'));

    await act(async () => boton(r, 'Confirmar cronograma').props.onPress());

    expect(textos(r)).toMatch(/No tienes un cronograma|No se pudo confirmar/);
    expect(mockTacto.logro).not.toHaveBeenCalled();
    expect(campoDelNombre(r).props.value).toBe('Beto');
  });

  it('si Administración cambió las cuotas, avisa y vuelve a pedir la confirmación', () => {
    const r = montar(conCronograma({ estado: 'DESACTUALIZADA', confirmadaEn: '2026-11-01T15:00:00Z', nombre: 'Beto' }));
    expect(textos(r)).toContain('Tu cronograma cambió. Revísalo y confírmalo de nuevo.');
    expect(boton(r, 'Confirmar cronograma')).toBeDefined();
  });

  it('ya confirmado, dice cuándo y no vuelve a pedir nada', () => {
    const r = montar(conCronograma({ estado: 'CONFIRMADA', confirmadaEn: new Date(2026, 10, 3, 12, 0).toISOString(), nombre: 'Beto Aprendiz' }));
    expect(textos(r)).toContain('Confirmaste tu cronograma el 3 de noviembre.');
    expect(boton(r, 'Confirmar cronograma')).toBeUndefined();
    expect(campoDelNombre(r)).toBeUndefined();
  });
});

describe('sin cronograma', () => {
  it('«Tu pago fue cancelado», sin cuotas, sin casilla y sin botón', () => {
    const r = montar({ pasos: [{ clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: true }], pagos: { modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null } });
    const texto = textos(r);
    expect(texto).toContain('Tu pago fue cancelado');
    expect(texto).not.toContain('Tus fechas de pago');
    expect(texto).not.toContain('Pendiente');
    expect(boton(r, 'Confirmar cronograma')).toBeUndefined();
    expect(casilla(r)).toBeUndefined();
  });
});

describe('sin cronograma: una tarjeta de éxito con cuerpo (issue #90)', () => {
  it('el pago completo va en una tarjeta con el check, el título y la explicación (no un título suelto con la pantalla vacía)', () => {
    const r = montar({ pasos: [{ clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: true }], pagos: { modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null } });
    const texto = textos(r);
    expect(texto).toContain('Tu pago fue cancelado');
    expect(texto).toContain('No tienes cuotas por pagar.');
    const iconos = r.root.findAll(n => n.props?.name === 'check');
    expect(iconos.length).toBeGreaterThan(0);
    const titulo = r.root.findAll(
      n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header' && React.Children.toArray(n.props.children).join('') === 'Tu pago fue cancelado',
    );
    expect(titulo.length).toBeGreaterThan(0);
  });
});

describe('el resto', () => {
  it('con la función apagada por Soporte TI, el aviso de mantenimiento reemplaza todo lo demás', () => {
    mockFuncion.prendida = false;
    const r = montar(conCronograma(SIN_CONFIRMAR));
    expect(textos(r)).toContain('Esta función está en mantenimiento.');
    expect(textos(r)).not.toContain('Tus fechas de pago');
  });

  it('un tono de reproche no aparece nunca: ni «atrasada», ni «vencida», ni «deuda»', () => {
    const r = montar(conCronograma(SIN_CONFIRMAR));
    expect(textos(r)).not.toMatch(/atrasad|vencid|deuda|mora\b/i);
  });
});
