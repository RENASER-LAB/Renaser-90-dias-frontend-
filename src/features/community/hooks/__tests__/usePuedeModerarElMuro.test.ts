/**
 * Quién ve el «…» de moderación del Muro (pedido del dueño, 2026-10-31: «que solo les salga a estos roles», ADMIN y
 * ALCHEMIST). La puerta son dos cosas a la vez —el rol de la sesión y la capacidad `canAdminister` que dice el
 * servidor— y quien no puede ni siquiera hace el pedido de capacidades.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockUsuario: { current: { id: string; role: string } | null } = { current: null };
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: mockUsuario.current }) }));
const mockCapacidadesDePrograma = jest.fn<() => Promise<Record<string, unknown> | null>>();
jest.mock('../../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidadesDePrograma() }));
jest.mock('../../../programa/events/avisoDiaUnoElegido', () => ({ escucharDiaUnoElegido: () => () => undefined }));

import { usePuedeModerarElMuro } from '../usePuedeModerarElMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

async function veElBoton(rol: string, contexto: Record<string, unknown> | null): Promise<boolean> {
  mockUsuario.current = { id: 'u1', role: rol };
  mockCapacidadesDePrograma.mockResolvedValue(contexto);
  let ultimo = false;
  function Sonda() {
    ultimo = usePuedeModerarElMuro();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  return ultimo;
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockCapacidadesDePrograma.mockReset();
});

const COMO_ADMINISTRADOR = { programRequired: false, canStartProgram: false, canAccompany: true, canAdminister: true };
const SIN_ADMINISTRAR = { ...COMO_ADMINISTRADOR, canAdminister: false };

describe('el «…» de moderación del Muro', () => {
  it.each(['ADMIN', 'ALCHEMIST'])('%s lo ve', async rol => {
    expect(await veElBoton(rol, COMO_ADMINISTRADOR)).toBe(true);
  });

  it.each(['MENTOR_LEAD', 'MENTOR', 'TRAINEE_GUIDE', 'TRAINEE', 'IT_SUPPORT'])(
    '%s no lo ve, y ni siquiera se le pregunta nada al servidor',
    async rol => {
      // Aunque el servidor dijera `canAdminister` (no lo hace), el rol no alcanza.
      expect(await veElBoton(rol, COMO_ADMINISTRADOR)).toBe(false);
      expect(mockCapacidadesDePrograma).not.toHaveBeenCalled();
    },
  );

  it('el autor de la publicación, siendo aprendiz, tampoco lo ve en la suya', async () => {
    // El hook no mira de quién es la publicación: la puerta es el rol. Quien la escribió (aprendiz) no tiene «…».
    expect(await veElBoton('TRAINEE', SIN_ADMINISTRAR)).toBe(false);
  });

  it('un ADMIN sin la capacidad del servidor (cuenta suspendida, backend anterior, consulta caída) no lo ve', async () => {
    expect(await veElBoton('ADMIN', SIN_ADMINISTRAR)).toBe(false);
    act(() => raiz?.unmount());
    expect(await veElBoton('ADMIN', { programRequired: false, canStartProgram: false, canAccompany: false })).toBe(false);
    act(() => raiz?.unmount());
    expect(await veElBoton('ALCHEMIST', null)).toBe(false);
  });

  it('sin sesión no hay botón', async () => {
    mockUsuario.current = null;
    let ultimo = true;
    function Sonda() {
      ultimo = usePuedeModerarElMuro();
      return null;
    }
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda));
    });
    expect(ultimo).toBe(false);
    expect(mockCapacidadesDePrograma).not.toHaveBeenCalled();
  });
});
