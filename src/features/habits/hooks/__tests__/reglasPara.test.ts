/**
 * El hook del registro con foto elige a qué endpoints ir según el destino (D-178).
 */
import { describe, expect, it, jest } from '@jest/globals';

import type { ReglasDelDestino } from '../../utils/destinoDeFoto';
import { reglasPara } from '../useRegistroConFoto';

// El hook trae (por el tema y la foto pendiente) AsyncStorage, que en Jest no tiene módulo nativo.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const DE_ROCA: ReglasDelDestino = {
  estadoFresco: async () => ({ tipo: 'disponible', evidenciaYaSubida: false }),
  registrar: async () => ({ puntosOtorgados: 20, yaEstabaCompletado: false }),
};

describe('reglasPara', () => {
  it('sin destino, o hábito, van las reglas de hábitos (nunca las de rocas)', () => {
    const deHabito = reglasPara(undefined, { roca: DE_ROCA });
    expect(deHabito).not.toBeNull();
    expect(deHabito).not.toBe(DE_ROCA);
    expect(reglasPara('habito', { roca: DE_ROCA })).toBe(deHabito);
  });

  it('roca usa las reglas que inyectó quien montó el hook', () => {
    expect(reglasPara('roca', { roca: DE_ROCA })).toBe(DE_ROCA);
  });

  it('roca sin reglas inyectadas no abre nada (no cae en los endpoints de hábitos con un id de roca)', () => {
    expect(reglasPara('roca', undefined)).toBeNull();
    expect(reglasPara('roca', {})).toBeNull();
  });
});
