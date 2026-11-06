/** Spec 046: la hoja para elegir el sobrenombre y la fila de Hoy con «Ahora no». */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { MiSobrenombre } from '../api/sobrenombreApi';

const mockElegir = jest.fn<(s: string) => Promise<MiSobrenombre>>();
const mockDescartar = jest.fn<() => Promise<MiSobrenombre>>();
jest.mock('../api/sobrenombreApi', () => ({
  elegirSobrenombre: (s: string) => mockElegir(s),
  quitarMiSobrenombre: () => Promise.resolve({ sobrenombre: null, puedeCambiarDesde: null, invitacionDescartada: false }),
  descartarInvitacionDelSobrenombre: () => mockDescartar(),
}));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Ana Pérez', avatarUrl: null } }) }));
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));

import { ApiError } from '../../../services/http/apiClient';
import { FilaDelSobrenombre } from '../components/FilaDelSobrenombre';
import { HojaDelSobrenombre } from '../components/HojaDelSobrenombre';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const sin: MiSobrenombre = { sobrenombre: null, puedeCambiarDesde: null, invitacionDescartada: false };
const textos = () => raiz!.root.findAll(n => (n.type as unknown) === Text).map(n => [n.props.children].flat().join(''));

beforeEach(() => {
  mockElegir.mockReset();
  mockDescartar.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

function escribir(valor: string) {
  const campo = raiz!.root.findAll(n => (n.type as unknown) === TextInput && n.props.accessibilityLabel === 'Tu sobrenombre')[0];
  act(() => campo.props.onChangeText(valor));
}
async function guardar() {
  const boton = raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll((x: ReactTestInstance) => (x.type as unknown) === Text).some(t => [t.props.children].flat().join('') === 'Guardar'))[0];
  await act(async () => boton.props.onPress());
}

describe('la hoja del sobrenombre', () => {
  it('spec 046 FR-001: escribe, ve la vista previa con su sobrenombre y lo guarda en el servidor', async () => {
    const alGuardar = jest.fn();
    mockElegir.mockResolvedValue({ ...sin, sobrenombre: 'Fénix de Arequipa' });
    act(() => {
      raiz = TestRenderer.create(React.createElement(HojaDelSobrenombre, { visible: true, mio: sin, alCerrar: () => undefined, alGuardar }));
    });
    expect(textos()).toContain('Así te verán en el Muro. Tu mentor y el equipo siguen viendo tu nombre.');
    escribir('Fénix de Arequipa');
    expect(textos()).toContain('17 / 20');
    expect(textos()).toContain('Fénix de Arequipa');
    await guardar();
    expect(mockElegir).toHaveBeenCalledWith('Fénix de Arequipa');
    expect(alGuardar).toHaveBeenCalledWith({ ...sin, sobrenombre: 'Fénix de Arequipa' });
  });

  it('spec 046 FR-004: lo que rechaza el servidor (repetido) se dice bajo el campo, sin diálogo', async () => {
    mockElegir.mockRejectedValue(new ApiError(409, 'Ese sobrenombre ya lo tiene otra persona.', { codigo: 'SOBRENOMBRE_REPETIDO' }));
    act(() => {
      raiz = TestRenderer.create(React.createElement(HojaDelSobrenombre, { visible: true, mio: sin, alCerrar: () => undefined, alGuardar: () => undefined }));
    });
    escribir('León del Misti');
    await guardar();
    expect(textos()).toContain('Ese sobrenombre ya lo tiene otra persona.');
  });

  it('spec 046 FR-004: antes de los 30 días dice desde cuándo y no deja guardar (D5)', () => {
    const futuro = new Date(Date.now() + 10 * 86400000).toISOString();
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(HojaDelSobrenombre, { visible: true, mio: { ...sin, sobrenombre: 'Fénix', puedeCambiarDesde: futuro }, alCerrar: () => undefined, alGuardar: () => undefined }),
      );
    });
    expect(textos().some((x: string) => x.startsWith('Puedes cambiarlo de nuevo desde el'))).toBe(true);
  });
});

describe('la hoja tiene aire a los lados', () => {
  it('spec 046 FR-001: el cuerpo lleva 20 de relleno lateral (en el E2E el texto y el campo tocaban el borde de la pantalla)', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(HojaDelSobrenombre, { visible: true, mio: sin, alCerrar: () => undefined, alGuardar: () => undefined }));
    });
    const cuerpo = raiz!.root.findAll(n => n.props.testID === 'cuerpo-de-la-hoja-del-sobrenombre')[0];
    const estilo = Object.assign({}, ...[cuerpo.props.style].flat());
    expect(estilo.paddingHorizontal).toBe(20);
  });
});

describe('el compositor del Muro', () => {
  it('spec 046 FR-002: muestra el sobrenombre de quien escribe, si lo eligió (así lo verán)', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const fuente = fs.readFileSync(path.join(__dirname, '../../../screens/ComunidadScreen.tsx'), 'utf8');
    expect(fuente).toMatch(/nombreEnElCompositor = miSobrenombre\?\.sobrenombre\?\.trim\(\) \|\| nombreUsuario/);
    expect(fuente).toMatch(/autor=\{\{ nombre: nombreEnElCompositor/);
  });
});

describe('la fila de Hoy', () => {
  it('spec 046 FR-001: «Ahora no» la esconde en el acto y lo guarda en el servidor (D2: no vuelve)', async () => {
    const actualizar = jest.fn();
    mockDescartar.mockResolvedValue({ ...sin, invitacionDescartada: true });
    act(() => {
      raiz = TestRenderer.create(React.createElement(FilaDelSobrenombre, { sobrenombre: { mio: sin, recargar: () => undefined, actualizar } }));
    });
    expect(textos()).toContain('Elige cómo te verán en el Muro');
    const ahoraNo = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Ahora no. Puedes elegirlo después desde Yo.' && typeof n.props.onPress === 'function')[0];
    await act(async () => ahoraNo.props.onPress());
    expect(actualizar).toHaveBeenCalledWith({ ...sin, invitacionDescartada: true });
    expect(mockDescartar).toHaveBeenCalledTimes(1);
  });
});
