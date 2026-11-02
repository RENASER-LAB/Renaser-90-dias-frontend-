import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 039 (Acuerdo de transformación): las pantallas de Términos en sus tres casos.
 *  1. Sin cronograma (el de siempre): «Mi aceptación» con los datos reales, firma y casilla; el pedido lleva el inicio que vio y ninguna huella.
 *  2. Con cronograma: debajo de «Mi aceptación» sale «Mi cronograma de pagos» con la frase de la cláusula 19; sin esa casilla no avanza; con ella, el pedido lleva la huella.
 *  3. Volver a aceptar (quien ya estaba dentro): «Mi aceptación» con su programa y fechas reales y NUNCA el cronograma.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockFirma = jest.fn<(props: { onSignatureChange: (valida: boolean, datos: { type: string; data: string }) => void }) => void>();
const mockAceptarTerminos = jest.fn<(versionId: string | null, acuerdo?: { inicioVisto?: string | null; huellaDelCronograma?: string | null }) => Promise<unknown>>();
let mockTerminos: unknown = null;
const mockRecargar = jest.fn(async () => null);

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
jest.mock('../../../../components/SignatureCanvas', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    SignatureCanvas: React.forwardRef((props: Parameters<typeof mockFirma>[0], ref) => {
      React.useImperativeHandle(ref, () => ({ capturarComoPngBase64: async () => 'png-base64' }));
      mockFirma(props);
      return null;
    }),
    safeParsePaths: (valor: unknown) => valor,
  };
});
jest.mock('../../hooks/usePersistenciaOnboarding', () => ({
  usePersistenciaOnboarding: () => ({
    guardarCapitulo: async () => ({ pendientes: 0 }),
    guardarFirma: async () => ({ ok: true }),
    aceptarHito: async () => undefined,
    aceptarTerminos: (versionId: string | null, acuerdo?: { inicioVisto?: string | null; huellaDelCronograma?: string | null }) => mockAceptarTerminos(versionId, acuerdo),
    avanzarEstado: async () => undefined,
  }),
}));
jest.mock('../hooks/useMisTerminos', () => ({
  useMisTerminos: () => ({ terminos: mockTerminos, cargada: true, recargar: mockRecargar }),
}));

import { fechaEnPalabrasDePago, aIso, hoyDelTelefono } from '../../../pagos/utils/fechasDePago';
import { TerminosScreen } from '../../screens/TerminosScreen';
import { terminosDeMiFormacionSchema, type TerminosDeMiFormacionApi } from '../api/terminosSchemas';
import { TerminosActualizadosScreen } from '../screens/TerminosActualizadosScreen';
import { FRASE_DE_LA_DECISION, FRASE_DE_LA_DECLARACION, FRASE_DEL_CRONOGRAMA } from '../utils/miAceptacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VERSION = {
  id: 'version-2',
  formation: 'ESCUELA',
  state: 'PUBLICADA',
  number: 2,
  title: 'Términos y condiciones',
  introduction: 'Al inscribirme en Formación RENASER, declaro que lo hago de manera libre y voluntaria, aceptando íntegramente los siguientes términos:',
  clauses: ['Primera cláusula', 'Reconozco algo.\n\nY además esto.'],
  checkboxText: 'He leído y acepto los Términos y Condiciones',
  asksNewAcceptance: true,
};
const CRONOGRAMA = {
  currency: 'PEN',
  installments: [
    { id: 'c-1', dueDate: '2026-11-15', amount: 500, status: 'PENDING' },
    { id: 'c-2', dueDate: '2026-12-15', amount: 500, status: 'PENDING' },
  ],
  fingerprint: 'huella-1',
};

function terminos(pending: string, agreement: Record<string, unknown>): TerminosDeMiFormacionApi {
  return terminosDeMiFormacionSchema.parse({
    formation: { code: 'ESCUELA', name: 'Escuela Renaser' },
    version: VERSION,
    pending,
    blocks: pending !== 'FIRST_TIME',
    changeNote: pending === 'NEW_VERSION' ? 'Nuevo Acuerdo de transformación' : null,
    agreement,
  });
}

const SIN_CRONOGRAMA = { participantName: 'Ana María Pérez Soto', program: 'Formación RENASER · 90 días', startDate: '2026-11-03', endDate: '2027-01-31', started: false, schedule: null };

let raiz: ReactTestRenderer | null = null;
const onAccept = jest.fn();

function montarOnboarding(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(TerminosScreen, { onAccept, onBack: () => undefined }));
  });
  return r;
}

function montarVolverAAceptar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(TerminosActualizadosScreen, {
        terminos: mockTerminos as TerminosDeMiFormacionApi,
        alAceptar: onAccept,
        alCerrarSesion: () => undefined,
        alCambiar: async () => undefined,
      }),
    );
  });
  return r;
}

/** Todo el texto que se ve, en orden. */
function textoDe(r: ReactTestRenderer): string {
  const partes: string[] = [];
  const recorrer = (nodo: unknown): void => {
    if (nodo == null) return;
    if (typeof nodo === 'string') partes.push(nodo);
    else if (Array.isArray(nodo)) nodo.forEach(recorrer);
    else if (typeof nodo === 'object') recorrer((nodo as { children?: unknown }).children);
  };
  recorrer(r.toJSON());
  return partes.join(' | ');
}

const boton = (r: ReactTestRenderer) => r.root.findAll(n => n.props.label === 'Continuar' || n.props.label === 'Aceptar')[0];
const casilla = (r: ReactTestRenderer, titulo: string) => r.root.findAll(n => n.props.title === titulo)[0];

async function continuar(r: ReactTestRenderer) {
  await act(async () => {
    boton(r).props.onPress();
  });
}

function firmar() {
  act(() => mockFirma.mock.lastCall![0].onSignatureChange(true, { type: 'draw', data: '[[1,2],[3,4]]' }));
}

beforeEach(() => {
  mockAlerta.mockReset();
  mockFirma.mockReset();
  mockAceptarTerminos.mockReset();
  mockAceptarTerminos.mockResolvedValue({ ok: true });
  mockRecargar.mockClear();
  onAccept.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockTerminos = null;
});

describe('sin cronograma: la firma de siempre, con «Mi aceptación»', () => {
  beforeEach(() => {
    mockTerminos = terminos('FIRST_TIME', SIN_CRONOGRAMA);
  });

  it('lee el título, las cláusulas que manda el servidor y «Mi aceptación» con las dos frases y los cinco datos; sin cronograma', () => {
    raiz = montarOnboarding();
    const texto = textoDe(raiz);

    expect(texto).toContain('Lee atentamente las 2 cláusulas y sella tu aceptación.');
    expect(texto).toContain('Al inscribirme en Formación RENASER');
    expect(texto).toContain('Reconozco algo.\n\nY además esto.');
    expect(texto.toLowerCase()).toContain('mi aceptación');
    expect(texto).toContain(FRASE_DE_LA_DECISION);
    expect(texto).toContain(FRASE_DE_LA_DECLARACION);
    for (const dato of ['Participante', 'Ana María Pérez Soto', 'Programa', 'Formación RENASER · 90 días', 'Fecha de inicio', '3 de noviembre de 2026', 'Fecha de finalización',
      '31 de enero de 2027', 'Fecha de aceptación', fechaEnPalabrasDePago(aIso(hoyDelTelefono()))]) {
      expect(texto).toContain(dato);
    }
    expect(texto).not.toContain('Mi cronograma de pagos');
    expect(texto).not.toContain(FRASE_DEL_CRONOGRAMA);
  });

  it('«Mi aceptación» va al final de los términos y antes de la firma', () => {
    raiz = montarOnboarding();
    const texto = textoDe(raiz);
    expect(texto.indexOf('Y además esto.')).toBeLessThan(texto.toLowerCase().indexOf('mi aceptación'));
    expect(texto.toLowerCase().indexOf('mi aceptación')).toBeLessThan(texto.indexOf('He leído y acepto los Términos y Condiciones'));
  });

  it('firma y sigue: el pedido lleva la versión y el inicio que vio, y ninguna huella de cronograma', async () => {
    raiz = montarOnboarding();
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockAceptarTerminos).toHaveBeenCalledWith('version-2', { inicioVisto: '2026-11-03', huellaDelCronograma: null });
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('pasó la medianoche (409): relee, avisa con las palabras del servidor y no avanza', async () => {
    mockAceptarTerminos.mockResolvedValue({ ok: false, cambiaron: true, mensaje: 'Pasó la medianoche y tus fechas cambiaron: léelas de nuevo.' });
    raiz = montarOnboarding();
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockRecargar).toHaveBeenCalledTimes(1);
    expect(mockAlerta).toHaveBeenCalledWith('Algo cambió mientras leías', 'Pasó la medianoche y tus fechas cambiaron: léelas de nuevo.');
    expect(onAccept).not.toHaveBeenCalled();
  });
});

describe('con cronograma: se firma en el mismo acto', () => {
  beforeEach(() => {
    mockTerminos = terminos('FIRST_TIME', { ...SIN_CRONOGRAMA, schedule: CRONOGRAMA });
  });

  it('debajo de «Mi aceptación» sale «Mi cronograma de pagos» con la moneda, una fila por cuota y la frase de la cláusula 19', () => {
    raiz = montarOnboarding();
    const texto = textoDe(raiz);

    expect(texto).toContain('Mi cronograma de pagos');
    expect(texto).toContain('Soles (S/)');
    expect(texto).toContain('15 nov');
    expect(texto).toContain('15 dic');
    expect(texto).toContain('S/ 500');
    expect(texto).toContain('Pendiente');
    expect(texto.toLowerCase().indexOf('mi aceptación')).toBeLessThan(texto.indexOf('Mi cronograma de pagos'));
    expect(casilla(raiz, FRASE_DEL_CRONOGRAMA)).toBeDefined();
  });

  it('sin marcar la casilla del cronograma no avanza y dice qué falta; no se manda nada', async () => {
    raiz = montarOnboarding();
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockAlerta).toHaveBeenCalledWith('Cronograma por aceptar', 'Marca que aceptas el cronograma de pagos para continuar.');
    expect(mockAceptarTerminos).not.toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
    expect(textoDe(raiz)).toContain('Marca esta casilla para continuar.');
  });

  it('con la casilla del cronograma, la casilla de los términos y la firma: el pedido lleva la huella del cronograma que vio', async () => {
    raiz = montarOnboarding();
    act(() => casilla(raiz!, FRASE_DEL_CRONOGRAMA).props.onToggle(true));
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockAceptarTerminos).toHaveBeenCalledWith('version-2', { inicioVisto: '2026-11-03', huellaDelCronograma: 'huella-1' });
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('Administración cambió el cronograma mientras leía (409): se relee, se avisa y no queda nada marcado', async () => {
    mockAceptarTerminos.mockResolvedValue({ ok: false, cambiaron: true, mensaje: 'Tu cronograma cambió mientras leías: revísalo de nuevo.' });
    raiz = montarOnboarding();
    act(() => casilla(raiz!, FRASE_DEL_CRONOGRAMA).props.onToggle(true));
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockRecargar).toHaveBeenCalledTimes(1);
    expect(mockAlerta).toHaveBeenCalledWith('Algo cambió mientras leías', 'Tu cronograma cambió mientras leías: revísalo de nuevo.');
    expect(onAccept).not.toHaveBeenCalled();

    // El cronograma nuevo llega con otra huella: lo marcado antes era de otro y se vuelve a pedir.
    mockTerminos = terminos('FIRST_TIME', { ...SIN_CRONOGRAMA, schedule: { ...CRONOGRAMA, fingerprint: 'huella-2' } });
    act(() => raiz!.update(React.createElement(TerminosScreen, { onAccept, onBack: () => undefined })));
    expect(casilla(raiz, FRASE_DEL_CRONOGRAMA).props.checked).toBe(false);
  });
});

describe('volver a aceptar: quien ya estaba dentro', () => {
  beforeEach(() => {
    // Aunque tuviera un cronograma, el servidor no lo manda aquí (se le pide en «Mi ingreso»); y si llegara, esta pantalla no lo dibuja.
    mockTerminos = terminos('NEW_VERSION', {
      participantName: 'Beto Quispe',
      program: 'Formación RENASER · 90 días',
      startDate: '2026-10-26',
      endDate: '2027-01-23',
      started: true,
      schedule: CRONOGRAMA,
    });
  });

  it('muestra el texto nuevo y «Mi aceptación» con su programa y sus fechas reales, sin la sección del cronograma', () => {
    raiz = montarVolverAAceptar();
    const texto = textoDe(raiz);

    expect(texto).toContain('Actualizamos nuestros términos');
    expect(texto).toContain('Nuevo Acuerdo de transformación');
    expect(texto.toLowerCase()).toContain('mi aceptación');
    expect(texto).toContain('Beto Quispe');
    expect(texto).toContain('Formación RENASER · 90 días');
    expect(texto).toContain('26 de octubre de 2026');
    expect(texto).toContain('23 de enero de 2027');
    expect(texto).not.toContain('Mi cronograma de pagos');
    expect(texto).not.toContain(FRASE_DEL_CRONOGRAMA);
  });

  it('firma y acepta: el pedido lleva el inicio que vio y NINGUNA huella', async () => {
    raiz = montarVolverAAceptar();
    act(() => casilla(raiz!, 'He leído y acepto los Términos y Condiciones').props.onToggle(true));
    firmar();

    await continuar(raiz);

    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockAceptarTerminos).toHaveBeenCalledWith('version-2', { inicioVisto: '2026-10-26', huellaDelCronograma: null });
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
