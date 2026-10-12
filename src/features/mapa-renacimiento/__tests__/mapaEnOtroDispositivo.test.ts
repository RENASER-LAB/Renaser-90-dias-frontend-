import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ c: tokens.light, t: tokens.type }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../almacen', () => ({ almacenMapa: { leer: jest.fn(), guardar: jest.fn() } }));
jest.mock('../api/mapaApi', () => ({
  consultarMapa: jest.fn(), guardarAccionesDelMapa: jest.fn(), guardarProtocolosDelMapa: jest.fn(),
  completarEtapaMapa: jest.fn(),
}));
jest.mock('../api/respuestasDelMapa', () => ({ guardarPrioridad: jest.fn(), guardarRespuestasDelMapa: jest.fn() }));

import { almacenMapa } from '../almacen';
import { consultarMapa, guardarAccionesDelMapa, guardarProtocolosDelMapa } from '../api/mapaApi';
import { guardarRespuestasDelMapa } from '../api/respuestasDelMapa';
import { useMapaRenacimiento } from '../hooks/useMapaRenacimiento';
import { CierreScreen } from '../screens/CierreScreen';
import { textosConLosDiasQueQuedan } from '../textosDeApertura';
import { mapaVacio } from '../tipos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const servidor = {
  stageCompleted: true,
  actions: ['salud', 'negocio_dinero', 'relaciones'].map((area, i) => ({
    actionId: `accion-${i}`, area, text: `Acción guardada ${i}`, weeklyFrequency: 3,
    days: [1, 3, 5], moment: null, evidence: 'check', habitId: null,
  })),
  protocols: [{ protocolId: 'postergar', pattern: 'postergar', trigger: 'Al terminar de trabajar',
    currentBehavior: 'Mirar el teléfono', alternativeResponse: 'Caminar diez minutos', sentence: 'Caminar diez minutos' }],
};

function PantallaDeOtroDispositivo() {
  const estado = useMapaRenacimiento('otro-dispositivo');
  return React.createElement(CierreScreen, {
    estado, onSalir: () => undefined,
    dias: textosConLosDiasQueQuedan({ diaPrograma: 0, inscrito: true, loading: false }),
  });
}

async function comprobarCierre() {
  let pantalla!: ReactTestRenderer;
  await act(async () => { pantalla = TestRenderer.create(React.createElement(PantallaDeOtroDispositivo)); });
  const textos = pantalla.root.findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
  expect(textos).toContain('Tu mapa está activo.');
  expect(textos).toContain('3 acciones semanales');
  expect(textos).toContain('1 reemplazo');
  // Leer el cierre en un navegador limpio no debe enviar un borrador vacío al servidor.
  expect(guardarRespuestasDelMapa).not.toHaveBeenCalled();
  expect(guardarAccionesDelMapa).not.toHaveBeenCalled();
  expect(guardarProtocolosDelMapa).not.toHaveBeenCalled();
  act(() => pantalla.unmount());
}

describe('el resumen de un mapa activo en otro dispositivo (E-592)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(almacenMapa.guardar).mockResolvedValue(undefined);
    jest.mocked(consultarMapa).mockResolvedValue(servidor);
  });

  it('muestra las cantidades guardadas aunque no exista ningún borrador local', async () => {
    jest.mocked(almacenMapa.leer).mockResolvedValue(null);
    await comprobarCierre();
  });

  it('recupera también el cierre vacío que la versión anterior dejó en el dispositivo', async () => {
    jest.mocked(almacenMapa.leer).mockResolvedValue({ ...mapaVacio(), estado: 'activo', pasoActual: 11 });
    await comprobarCierre();
  });
});
