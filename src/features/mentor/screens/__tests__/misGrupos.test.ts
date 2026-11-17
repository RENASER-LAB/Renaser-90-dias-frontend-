import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { hayTocable, montar, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';
import type { VistaCelula } from '../../hooks/useCelulaQueAcompano';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../components/Aparicion', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Aparicion: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});

const CANTIDAD: Record<string, number | null> = { 'g-1': 9, 'g-2': 1, 'g-3': null };
jest.mock('../../../semaforo/hooks/useLecturaPorSemana', () => ({
  useSemaforoDelGrupo: (origen: { grupoId: string } | null) => {
    const total = origen ? CANTIDAD[origen.grupoId] : null;
    return { datos: total === null || !origen ? null : { resumen: { total }, aprendices: [] }, cargando: false, fallo: null };
  },
}));

import { MisGruposScreen } from '../MisGruposScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const grupo = (id: string, nombre: string) => ({ id, nombre });
const vistaCon = (...grupos: Array<{ id: string; nombre: string }>) => ({ grupos, celula: grupos[0], todos: [], resumen: { total: 0 } }) as unknown as VistaCelula;
const abrir = jest.fn<(id: string) => void>();
const props = (vista: VistaCelula | null, extra: object = {}) => ({
  onSalir: () => undefined,
  onAbrirGrupo: abrir,
  vista,
  cargando: false,
  fallo: null,
  detalle: null,
  recargar: () => undefined,
  ...extra,
});

beforeEach(() => {
  abrir.mockReset();
});

describe('«Mis grupos»', () => {
  it('lista los grupos con su nombre y, a la derecha, cuántos aprendices tiene', async () => { // spec 055 FR-001
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso'), grupo('g-3', 'Alba')))));
    const texto = todoElTexto(r);
    expect(texto).toContain('Fénix');
    expect(texto).toContain('9 aprendices');
    expect(texto).toContain('Cupo piso');
    expect(texto).toContain('1 aprendiz');
    /* Un grupo cuya cantidad no llegó muestra su nombre sin un cero inventado. */
    expect(texto).toContain('Alba');
    expect(texto).not.toContain('0 aprendices');
  });

  it('al tocar un grupo entra a ese grupo, una sola vez', async () => { // spec 055 FR-001
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')))));
    await tocar(r, 'Abrir Cupo piso');
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith('g-2');
  });

  it('con un solo grupo no se queda en la lista: entra directo a ese grupo', async () => { // spec 055 FR-002
    await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix')))));
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith('g-1');
  });

  it('sin grupos activos lo dice, sin huecos ni lista vacía', async () => { // spec 055 FR-001
    const r = await montar(React.createElement(MisGruposScreen, props(null, { fallo: 'sin_celula' })));
    expect(todoElTexto(r)).toContain('Todavía no acompañas ningún grupo');
    expect(hayTocable(r, 'Abrir ')).toBe(false);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('mientras carga no entra a ningún grupo ni dibuja la lista', async () => { // spec 055 FR-001
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix')), { cargando: true })));
    expect(abrir).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('Cargando');
  });
});
