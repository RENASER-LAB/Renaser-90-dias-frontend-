import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { hayTocable, montar, porTestID, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';
import type { VistaCelula } from '../../hooks/useCelulaQueAcompano';
import type { GrupoAnterior } from '../../types/mentor.types';
import { entradaAMisGrupos, hayVariosGrupos } from '../../utils/entradaAMisGrupos';

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

/**
 * «Anteriores» (spec 057 FR-022, historia 3): solo lectura, debajo de los activos; sin anteriores no hay sección; con un solo grupo
 * activo y anteriores, la entrada abre «Mis grupos» en vez de saltar al grupo.
 */
const anterior = (nombre: string, extra: Partial<GrupoAnterior> = {}): GrupoAnterior => ({
  clave: `${nombre}-2026-03-02`,
  nombre,
  desde: '2026-03-02',
  hasta: '2026-06-26',
  aprendices: 8,
  puestoFinal: { posicion: 2, total: 7 },
  colorFinal: 'VERDE',
  porcentajeFinal: 84,
  personas: [
    { nombre: 'Ana Quispe', colorFinal: 'ROJO' },
    { nombre: 'Beto Rojas', colorFinal: 'VERDE' },
  ],
  ...extra,
});

describe('«Anteriores»', () => {
  it('debajo de los activos: nombre, período, cuántos aprendices, cómo cerró y las personas con su color final', async () => { // spec 057 FR-022
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')), { anteriores: [anterior('Alba')] })));
    const texto = todoElTexto(r);
    expect(texto).toContain('Anteriores');
    expect(texto).toContain('Alba');
    expect(texto).toContain('mar 2026 – jun 2026');
    expect(texto).toContain('8 aprendices');
    expect(texto).toContain('Cerró en el puesto 2 de 7 · 84 %');
    expect(texto).toContain('color final verde');
    expect(texto).toContain('Ana Quispe');
    expect(texto).toContain('rojo');
    expect(texto.indexOf('Fénix')).toBeLessThan(texto.indexOf('Anteriores'));
  });

  it('es de solo lectura: ni el grupo ni las personas son botones, y no hay ids con qué abrir fichas', async () => { // spec 057 FR-022
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')), { anteriores: [anterior('Alba')] })));
    expect(hayTocable(r, 'Alba')).toBe(false);
    expect(hayTocable(r, 'Ana Quispe')).toBe(false);
    expect(porTestID(r, 'grupo-anterior')).toHaveLength(1);
    expect(Object.keys(anterior('Alba').personas[0]).sort()).toEqual(['colorFinal', 'nombre']);
  });

  it('con tramos repetidos y personas con el mismo nombre no hay keys duplicadas (React no avisa)', async () => { // spec 057 FR-022
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const gemelas = [{ nombre: 'Ana Quispe', colorFinal: 'ROJO' as const }, { nombre: 'Ana Quispe', colorFinal: 'VERDE' as const }];
    await montar(
      React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')), { anteriores: [anterior('Alba', { clave: 'g-9-a-b-0', personas: gemelas }), anterior('Alba', { clave: 'g-9-a-b-1', personas: gemelas })] })),
    );
    expect(error.mock.calls.filter(([m]) => String(m).includes('same key'))).toHaveLength(0);
    error.mockRestore();
  });

  it('sin anteriores no hay sección ni título vacío', async () => { // spec 057 FR-022
    for (const anteriores of [[], undefined]) {
      const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')), { anteriores })));
      expect(todoElTexto(r)).not.toContain('Anteriores');
    }
  });

  it('un grupo anterior sin puesto ni porcentaje no inventa cifras ni deja huecos', async () => { // spec 057 FR-022
    const r = await montar(
      React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix'), grupo('g-2', 'Cupo piso')), { anteriores: [anterior('Alba', { puestoFinal: null, porcentajeFinal: null, colorFinal: 'SIN_DATOS', personas: [], aprendices: null })] })),
    );
    const texto = todoElTexto(r);
    expect(texto).toContain('Alba');
    expect(texto).not.toMatch(/Cerró|color final|\b0 %|0 aprendices/);
  });

  it('con un solo grupo activo y anteriores NO salta al grupo: se queda en «Mis grupos» con la lista y los anteriores', async () => { // spec 057 FR-022
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix')), { anteriores: [anterior('Alba')] })));
    expect(abrir).not.toHaveBeenCalled();
    const texto = todoElTexto(r);
    expect(texto).toContain('Fénix');
    expect(texto).toContain('Anteriores');
    await tocar(r, 'Abrir Fénix');
    expect(abrir).toHaveBeenCalledWith('g-1');
  });

  it('mientras no se sabe si hay anteriores, un solo grupo espera; al saber que no hay, entra directo', async () => { // spec 057 FR-022
    const r = await montar(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix')), { anterioresListos: false })));
    expect(abrir).not.toHaveBeenCalled();
    await act(async () => r.update(React.createElement(MisGruposScreen, props(vistaCon(grupo('g-1', 'Fénix')), { anterioresListos: true }))));
    expect(abrir).toHaveBeenCalledWith('g-1');
  });

  it('un mentor que rotó (sin grupos activos, con anteriores) ve «Anteriores» y una línea, no «no acompañas ningún grupo»', async () => { // spec 057 FR-022
    const r = await montar(React.createElement(MisGruposScreen, props(null, { fallo: 'sin_celula', anteriores: [anterior('Alba')] })));
    const texto = todoElTexto(r);
    expect(texto).toContain('Anteriores');
    expect(texto).toContain('Alba');
    expect(texto).toContain('Hoy no acompañas ningún grupo');
    expect(texto).not.toContain('Todavía no acompañas ningún grupo');
    expect(abrir).not.toHaveBeenCalled();
  });

  it('sin activos ni anteriores queda el mensaje de siempre; mientras no se sabe si hay anteriores, espera sin parpadear', async () => { // spec 057 FR-022
    expect(todoElTexto(await montar(React.createElement(MisGruposScreen, props(null, { fallo: 'sin_celula' }))))).toContain('Todavía no acompañas ningún grupo');
    const esperando = await montar(React.createElement(MisGruposScreen, props(null, { fallo: 'sin_celula', anterioresListos: false })));
    expect(todoElTexto(esperando)).not.toContain('Todavía no acompañas ningún grupo');
  });

  it('la entrada decide por grupos y anteriores: uno y sin anteriores entra directo; uno con anteriores o dos o más, a la lista', () => { // spec 057 FR-022
    expect(entradaAMisGrupos(1, false)).toBe('miGrupo');
    expect(entradaAMisGrupos(1, true)).toBe('misGrupos');
    expect(entradaAMisGrupos(2, false)).toBe('misGrupos');
    expect(entradaAMisGrupos(0, true)).toBe('misGrupos'); // sin activos pero con anteriores
    expect(entradaAMisGrupos(0, false)).toBe('miGrupo');
    expect(hayVariosGrupos(1)).toBe(false);
    expect(hayVariosGrupos(1, true)).toBe(true);
  });
});
