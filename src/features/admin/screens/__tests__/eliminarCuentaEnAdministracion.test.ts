import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Administración → ficha → «Eliminar cuenta» y «Recuperar cuenta» (D-243): quién lo ve, la
 * confirmación escribiendo el correo, y el aviso de una cuenta cerrada.
 */

let mockUsuario: { id: string; role: string } | null = { id: 'admin-1', role: 'ADMIN' };
let mockDetalle: Record<string, unknown> | null = null;
const mockRecargar = jest.fn(async () => undefined);
const mockEliminar = jest.fn(async (_id: string, _correo: string): Promise<void> => undefined);
const mockRecuperar = jest.fn(async (_id: string): Promise<void> => undefined);
const mockAlerta = jest.fn((_t: string, _m?: string) => undefined);

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
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (t: string, m?: string) => mockAlerta(t, m) },
}));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: mockUsuario }) }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: async () => ({ id: 'c1' }) }));
jest.mock('../../../evidence/api/evidenceApi', () => ({ urlDeEvidencia: async () => null }));
jest.mock('../../../mentor/components/RejillaSemanal', () => ({ RejillaSemanal: () => null }));
jest.mock('../../../semaforo/components/TarjetaSemaforoDeAprendiz', () => ({ TarjetaSemaforoDeAprendiz: () => null }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: () => null }));
jest.mock('../../../home/hooks/useResumenHome', () => ({ rotuloDeFase: () => null }));
jest.mock('../../hooks/useSemanaAdministrativa', () => ({
  useSemanaAdministrativa: () => ({ semana: null, sinDatos: false, cargando: false, fallo: null, desplazar: () => undefined }),
}));
jest.mock('../../hooks/useDetalleAprendiz', () => ({
  useDetalleAprendiz: () => ({ detalle: mockDetalle, ultimoAjuste: null, quienAjusto: null, cargando: false, fallo: null, recargar: mockRecargar }),
}));
jest.mock('../../api/adminApi', () => ({
  eliminarCuentaDePersona: (id: string, correo: string) => mockEliminar(id, correo),
  recuperarCuentaDePersona: (id: string) => mockRecuperar(id),
  cambiarDiaDelPrograma: async () => undefined,
}));

import { ApiError } from '../../../../services/http/apiClient';
import { EliminarCuentaAdminScreen } from '../EliminarCuentaAdminScreen';
import { FichaAprendizScreen } from '../FichaAprendizScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const APRENDIZ = { id: 'ap-1', fullName: 'Ana Pérez', email: 'ana@correo.com' };
const DETALLE = { id: 'ap-1', programDay: 5, inscrito: true, email: 'ana@correo.com', role: 'TRAINEE', status: 'ACTIVE' };

const boton = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const campo = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onChangeText === 'function')[0];

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

function montarFicha(props: Partial<React.ComponentProps<typeof FichaAprendizScreen>> = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(FichaAprendizScreen, { aprendiz: APRENDIZ, onVolver: () => undefined, ...props }),
    );
  });
  return r;
}

beforeEach(() => {
  mockUsuario = { id: 'admin-1', role: 'ADMIN' };
  mockDetalle = { ...DETALLE };
  mockEliminar.mockReset();
  mockRecuperar.mockReset();
  mockRecargar.mockClear();
  mockAlerta.mockClear();
});

describe('quién ve «Eliminar cuenta» en la ficha', () => {
  it('ADMIN y ALQUIMISTA sobre un aprendiz sí; un mentor o un líder no', () => {
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeDefined();
    mockUsuario = { id: 'alq-1', role: 'ALCHEMIST' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeDefined();
    mockUsuario = { id: 'm-1', role: 'MENTOR' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeUndefined();
    mockUsuario = { id: 'l-1', role: 'MENTOR_LEAD' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeUndefined();
  });

  it('nadie lo ve sobre sí mismo', () => {
    mockUsuario = { id: 'ap-1', role: 'ADMIN' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeUndefined();
  });

  it('sobre un ADMIN o ALQUIMISTA, solo un ADMIN', () => {
    mockDetalle = { ...DETALLE, role: 'ADMIN' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeDefined();
    mockUsuario = { id: 'alq-1', role: 'ALCHEMIST' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeUndefined();
    mockDetalle = { ...DETALLE, role: 'ALCHEMIST' };
    expect(boton(montarFicha(), 'Eliminar cuenta')).toBeUndefined();
  });
});

describe('confirmación escribiendo el correo', () => {
  function montar(onEliminada = jest.fn()): ReactTestRenderer {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        React.createElement(EliminarCuentaAdminScreen, {
          personaId: 'ap-1',
          nombre: 'Ana Pérez',
          correo: 'ana@correo.com',
          onVolver: () => undefined,
          onEliminada,
        }),
      );
    });
    return r;
  }

  it('el botón se habilita solo si el correo coincide (sin mayúsculas ni espacios en los extremos)', async () => {
    const onEliminada = jest.fn();
    const r = montar(onEliminada);
    expect(textos(r)).toContain('Se borra ahora y para siempre. No se puede deshacer.');
    expect(boton(r, 'Eliminar cuenta').props.disabled).toBe(true);
    act(() => campo(r, 'Correo de la persona').props.onChangeText('ana@correo.co'));
    expect(boton(r, 'Eliminar cuenta').props.disabled).toBe(true);
    act(() => campo(r, 'Correo de la persona').props.onChangeText('  ANA@correo.com '));
    expect(boton(r, 'Eliminar cuenta').props.disabled).toBe(false);

    await act(async () => {
      boton(r, 'Eliminar cuenta').props.onPress();
    });
    expect(mockEliminar).toHaveBeenCalledWith('ap-1', 'ANA@correo.com');
    expect(onEliminada).toHaveBeenCalledTimes(1);
  });

  it('un 400 del servidor se muestra y no da por eliminada la cuenta', async () => {
    mockEliminar.mockRejectedValueOnce(new ApiError(400, 'El correo no coincide.'));
    const onEliminada = jest.fn();
    const r = montar(onEliminada);
    act(() => campo(r, 'Correo de la persona').props.onChangeText('ana@correo.com'));
    await act(async () => {
      boton(r, 'Eliminar cuenta').props.onPress();
    });
    expect(textos(r)).toContain('El correo no coincide.');
    expect(onEliminada).not.toHaveBeenCalled();
  });

  it('desde la ficha: eliminar abre la confirmación y al terminar vuelve con onCuentaEliminada', async () => {
    const onCuentaEliminada = jest.fn();
    const r = montarFicha({ onCuentaEliminada });
    act(() => boton(r, 'Eliminar cuenta').props.onPress());
    act(() => campo(r, 'Correo de la persona').props.onChangeText('ana@correo.com'));
    await act(async () => {
      boton(r, 'Eliminar cuenta').props.onPress();
    });
    expect(onCuentaEliminada).toHaveBeenCalledTimes(1);
    expect(mockAlerta).toHaveBeenCalledWith('Cuenta eliminada', 'La cuenta de Ana Pérez se borró.');
  });
});

describe('cuenta cerrada: aviso y «Recuperar cuenta»', () => {
  it('muestra cuándo se borra y recupera', async () => {
    mockDetalle = { ...DETALLE, deletionScheduledFor: '2026-11-01T15:00:00Z' };
    const r = montarFicha();
    expect(textos(r)).toContain('Cerró su cuenta. Se borra el 1 de noviembre.');
    await act(async () => {
      boton(r, 'Recuperar cuenta').props.onPress();
    });
    expect(mockRecuperar).toHaveBeenCalledWith('ap-1');
    expect(mockRecargar).toHaveBeenCalled();
    expect(textos(r)).not.toContain('Cerró su cuenta.');
  });

  it('un 409 (ya no estaba pendiente) se avisa', async () => {
    mockDetalle = { ...DETALLE, deletionScheduledFor: '2026-11-01T15:00:00Z' };
    mockRecuperar.mockRejectedValueOnce(new ApiError(409, 'La cuenta no tiene un borrado pendiente.'));
    const r = montarFicha();
    await act(async () => {
      boton(r, 'Recuperar cuenta').props.onPress();
    });
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo recuperar', 'La cuenta no tiene un borrado pendiente.');
  });

  it('sin el campo (backend viejo) no hay aviso', () => {
    expect(textos(montarFicha())).not.toContain('Cerró su cuenta');
  });

  it('sin detalle, usa lo que trae la fila de Personas', () => {
    mockDetalle = null;
    const r = montarFicha({ aprendiz: { ...APRENDIZ, deletionScheduledFor: '2026-11-01T15:00:00Z' } });
    expect(textos(r)).toContain('Cerró su cuenta. Se borra el 1 de noviembre.');
  });
});

describe('Personas', () => {
  it('la fila de Personas muestra la fecha del borrado', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const personas = fs.readFileSync(path.join(__dirname, '../PersonasAdminScreen.tsx'), 'utf8');
    expect(personas).toMatch(/etiquetaDeBorradoPendiente\(persona\.deletionScheduledFor\)/);
  });
});
