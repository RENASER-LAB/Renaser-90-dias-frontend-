import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Modal } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Los tres selectores de la Ficha Inicial que pasaron de diálogo centrado a hoja desde abajo
 * (2026-10-05): la fecha de nacimiento, el código de país del WhatsApp y la ubicación.
 *
 * Lo que se prueba es lo que la persona hace con ellos y lo que se guarda — las mismas claves y los
 * mismos formatos de siempre —, más lo nuevo: «LISTO», las ruedas accesibles, la fecha que existe,
 * la lista con lo elegido marcado, la búsqueda sin tildes y la atribución de Google.
 *
 * Contra el código de antes estas pruebas fallan: no había hoja (ni «Cerrar sin cambiar la
 * fecha»), las columnas de la fecha no eran controles ajustables y dejaban confirmar el 31 de
 * febrero, las filas de país no decían cuál estaba elegida y no había «Powered by Google».
 */

const mockSeleccion = jest.fn();
const mockBuscarEnGoogle = jest.fn<(q: string, iso?: string) => Promise<unknown[]>>();

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => undefined },
}));
jest.mock('../../services/locationService', () => {
  const real = jest.requireActual<typeof import('../../services/locationService')>('../../services/locationService');
  class LocationServiceDePrueba extends real.LocationService {
    static searchGooglePlaces(q: string, iso?: string) {
      return mockBuscarEnGoogle(q, iso) as ReturnType<typeof real.LocationService.searchGooglePlaces>;
    }
  }
  return { ...real, LocationService: LocationServiceDePrueba };
});

import { DatePickerField } from '../DatePickerField';
import { PhoneCountryInput } from '../PhoneCountryInput';
import { LocationCascadePicker, type LocationData } from '../LocationCascadePicker';
import { LocationService } from '../../services/locationService';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

function montar(elemento: React.ReactElement): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz!;
}

/** El elemento tocable con esa etiqueta para el lector de pantalla. */
function tocable(r: ReactTestRenderer, etiqueta: string | RegExp): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof etiqueta === 'string' ? n.props.accessibilityLabel === etiqueta : etiqueta.test(n.props.accessibilityLabel)),
  );
  if (!nodo) throw new Error(`No hay nada tocable con la etiqueta ${String(etiqueta)}`);
  return nodo;
}

async function tocar(r: ReactTestRenderer, etiqueta: string | RegExp) {
  const nodo = tocable(r, etiqueta);
  await act(async () => {
    nodo.props.onPress();
  });
}

const modales = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Modal);
const hojaAbierta = (r: ReactTestRenderer) => modales(r).length > 0;
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children)).map(n =>
    ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join(''),
  );

function rueda(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n => n.props.accessibilityRole === 'adjustable' && n.props.accessibilityLabel === etiqueta && typeof n.props.onAccessibilityAction === 'function',
  );
  if (!nodo) throw new Error(`No hay una rueda «${etiqueta}»`);
  return nodo;
}

function girar(r: ReactTestRenderer, etiqueta: string, accion: 'increment' | 'decrement', veces = 1) {
  for (let i = 0; i < veces; i++) {
    act(() => {
      rueda(r, etiqueta).props.onAccessibilityAction({ nativeEvent: { actionName: accion } });
    });
  }
}

beforeEach(() => {
  mockSeleccion.mockReset();
  mockBuscarEnGoogle.mockReset();
  mockBuscarEnGoogle.mockResolvedValue([]);
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Fecha de nacimiento en una hoja con ruedas', () => {
  it('se abre en una hoja con tres ruedas accesibles y «LISTO» guarda "DD/MM/AAAA"', async () => {
    const onChange = jest.fn<(valor: string) => void>();
    const r = montar(React.createElement(DatePickerField, { label: 'FECHA DE NACIMIENTO', value: '', onChange }));
    expect(hojaAbierta(r)).toBe(false);

    await tocar(r, 'Fecha de nacimiento: sin elegir');
    expect(hojaAbierta(r)).toBe(true);
    // Arranca en la fecha por defecto de siempre.
    expect(rueda(r, 'Día').props.accessibilityValue).toEqual({ text: '15' });
    expect(rueda(r, 'Mes').props.accessibilityValue).toEqual({ text: 'junio' });
    expect(rueda(r, 'Año').props.accessibilityValue).toEqual({ text: '1995' });

    girar(r, 'Año', 'decrement', 2);
    girar(r, 'Día', 'increment');
    expect(textos(r)).toContain('16 de junio de 1993');

    const [listo] = r.root.findAll(n => n.props.label === 'LISTO' && typeof n.props.onPress === 'function');
    await act(async () => {
      listo.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('16/06/1993');
    expect(hojaAbierta(r)).toBe(false);
  });

  it('no deja elegir un día que no existe: del 31 de enero a febrero queda en el 29 (bisiesto)', async () => {
    const onChange = jest.fn<(valor: string) => void>();
    const r = montar(React.createElement(DatePickerField, { label: 'FECHA DE NACIMIENTO', value: '31/01/1996', onChange }));
    await tocar(r, 'Fecha de nacimiento: 31 de enero de 1996');

    girar(r, 'Mes', 'increment');
    expect(rueda(r, 'Día').props.accessibilityValue).toEqual({ text: '29' });

    const [listo] = r.root.findAll(n => n.props.label === 'LISTO' && typeof n.props.onPress === 'function');
    await act(async () => {
      listo.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('29/02/1996');
  });

  it('cerrar sin «LISTO» (la ✕ o el atrás de Android) no cambia la fecha', async () => {
    const onChange = jest.fn<(valor: string) => void>();
    const r = montar(React.createElement(DatePickerField, { label: 'FECHA DE NACIMIENTO', value: '15/06/1995', onChange }));

    await tocar(r, 'Fecha de nacimiento: 15 de junio de 1995');
    girar(r, 'Año', 'increment');
    await tocar(r, 'Cerrar sin cambiar la fecha');
    expect(hojaAbierta(r)).toBe(false);

    await tocar(r, 'Fecha de nacimiento: 15 de junio de 1995');
    await act(async () => {
      modales(r)[0].props.onRequestClose();
    });
    expect(hojaAbierta(r)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Código de país del WhatsApp en una hoja con buscador', () => {
  it('marca el país elegido, busca sin tildes y al elegir guarda el mismo formato de siempre', async () => {
    const onChange = jest.fn<(numero: string, codigo: string, local: string) => void>();
    const r = montar(React.createElement(PhoneCountryInput, { label: '', value: '+51 987654321', onChange }));

    await tocar(r, 'Código de país: Perú, +51');
    expect(hojaAbierta(r)).toBe(true);
    expect(tocable(r, 'Perú, +51').props.accessibilityState).toEqual({ selected: true });
    expect(tocable(r, 'Bolivia, +591').props.accessibilityState).toEqual({ selected: false });

    const [buscador] = r.root.findAll(n => n.props.accessibilityLabel === 'Buscar país o prefijo' && typeof n.props.onChangeText === 'function');
    act(() => buscador.props.onChangeText('mexico'));
    expect(textos(r)).toContain('México');

    await tocar(r, 'México, +52');
    expect(mockSeleccion).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('+52 987654321', '+52', '987654321');
    expect(hojaAbierta(r)).toBe(false);
  });
});

describe('Ubicación en filas que abren una hoja', () => {
  const ubicacion: LocationData = { pais: 'Perú', departamento: 'Lima', ciudad: 'Lima Metropolitana', distrito: 'Miraflores', direccion: '' };

  it('elegir un departamento mantiene la cascada de siempre (su primera ciudad y su primer distrito)', async () => {
    const onChange = jest.fn<(data: LocationData) => void>();
    const r = montar(React.createElement(LocationCascadePicker, { data: ubicacion, onChange }));

    await tocar(r, 'depto / estado: Lima');
    expect(tocable(r, 'Lima').props.accessibilityState).toEqual({ selected: true });
    await tocar(r, 'Arequipa');

    const ciudad = LocationService.getCities('Perú', 'Arequipa')[0];
    const distrito = LocationService.getDistricts(ciudad, 'Arequipa')[0];
    expect(onChange).toHaveBeenCalledWith({ ...ubicacion, departamento: 'Arequipa', ciudad, distrito });
    expect(hojaAbierta(r)).toBe(false);
  });

  it('las sugerencias de Google del distrito llevan «Powered by Google» y guardan lo mismo que antes', async () => {
    mockBuscarEnGoogle.mockResolvedValue([
      {
        placeId: 'p-1',
        description: 'Miraflores, Lima, Perú',
        mainText: 'Miraflores',
        secondaryText: 'Lima, Perú',
        distrito: 'Miraflores',
        ciudad: 'Lima',
        departamento: 'Lima',
        pais: 'Perú',
      },
    ]);
    const onChange = jest.fn<(data: LocationData) => void>();
    const r = montar(React.createElement(LocationCascadePicker, { data: ubicacion, onChange }));

    await tocar(r, 'distrito / zona: Miraflores');
    expect(textos(r)).not.toContain('Powered by Google');

    const [buscador] = r.root.findAll(n => n.props.accessibilityLabel === 'Buscar distrito' && typeof n.props.onChangeText === 'function');
    await act(async () => {
      buscador.props.onChangeText('mira');
    });
    expect(mockBuscarEnGoogle).toHaveBeenCalledWith('mira', 'PE');
    expect(textos(r)).toContain('Powered by Google');

    await tocar(r, 'Miraflores, Lima, Perú');
    expect(onChange).toHaveBeenCalledWith({ ...ubicacion, pais: 'Perú', departamento: 'Lima', ciudad: 'Lima', distrito: 'Miraflores' });
  });

  it('«Usar …» guarda como distrito lo que se escribió', async () => {
    const onChange = jest.fn<(data: LocationData) => void>();
    const r = montar(React.createElement(LocationCascadePicker, { data: ubicacion, onChange }));

    await tocar(r, 'distrito / zona: Miraflores');
    const [buscador] = r.root.findAll(n => n.props.accessibilityLabel === 'Buscar distrito' && typeof n.props.onChangeText === 'function');
    await act(async () => {
      buscador.props.onChangeText('Villa El Salvador');
    });
    await tocar(r, 'Usar «Villa El Salvador»');
    expect(onChange).toHaveBeenCalledWith({ ...ubicacion, distrito: 'Villa El Salvador' });
  });
});
