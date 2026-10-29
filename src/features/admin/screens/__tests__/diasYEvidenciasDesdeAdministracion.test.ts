import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Administración y Alquimista ven los días y las evidencias de una persona como el líder (2026-10-27): la pila de
 * `AdminScreen` conecta el semáforo de un grupo y la ficha con la vista del líder (`PersonaDelLiderScreen`).
 *
 * - Semáforo → grupo → persona: con grupo que se abre (tiene mentor) va directo a sus días, en la ventana que se miraba,
 *   con un botón a su ficha; con un grupo sin mentor, a su ficha como siempre.
 * - Ficha → «Ver sus días y evidencias» (solo con grupo): abre sus días con el nombre genérico del grupo y el aviso de
 *   «por qué no» por si el servidor responde 404. Desde ahí no se ofrece volver a abrir la ficha (sería un círculo).
 * - Volver sube un nivel cada vez.
 *
 * Las pantallas hijas son piezas mínimas que exponen sus props: lo que se prueba es la conexión, no su dibujo (cada
 * una tiene sus propias pruebas).
 */

const INICIO = { posicion: { modo: 'semana', semanaHasta: '2026-10-16' }, hastaVigente: '2026-10-18' } as const;

jest.mock('../AdminInicioScreen', () => ({ AdminInicioScreen: () => null }));
jest.mock('../AnimalDeFaseDetalleScreen', () => ({ AnimalDeFaseDetalleScreen: () => null }));
jest.mock('../AnimalesDeFaseAdminScreen', () => ({ AnimalesDeFaseAdminScreen: () => null }));
jest.mock('../../hooks/useAnimalesDeFaseAdmin', () => ({ useAnimalesDeFaseAdmin: () => ({}) }));
jest.mock('../BienvenidaAdminScreen', () => ({ BienvenidaAdminScreen: () => null }));
jest.mock('../HabitosProgramaAdminScreen', () => ({ HabitosProgramaAdminScreen: () => null }));
jest.mock('../HabitoProgramaFormScreen', () => ({ HabitoProgramaFormScreen: () => null }));
jest.mock('../../hooks/useHabitosProgramaAdmin', () => ({ useHabitosProgramaAdmin: () => ({}) }));
jest.mock('../GrupoDetalleScreen', () => ({ GrupoDetalleScreen: () => null }));
jest.mock('../GrupoFormScreen', () => ({ GrupoFormScreen: () => null }));
jest.mock('../GruposAdminScreen', () => ({ GruposAdminScreen: () => null }));
jest.mock('../GuiasRecepcionScreen', () => ({ GuiasRecepcionScreen: () => null }));
jest.mock('../MasOpcionesScreen', () => ({ MasOpcionesScreen: () => null }));
jest.mock('../PersonasAdminScreen', () => ({ PersonasAdminScreen: () => null }));
jest.mock('../SolicitudesAdminScreen', () => ({ SolicitudesAdminScreen: () => null }));
jest.mock('../StaffRolesScreen', () => ({ StaffRolesScreen: () => null }));
jest.mock('../../../caja/screens/CajaContenidoScreen', () => ({ CajaContenidoScreen: () => null }));
jest.mock('../../../caja/screens/CajaDetalleScreen', () => ({ CajaDetalleScreen: () => null }));
jest.mock('../../../caja/screens/CajaListaScreen', () => ({ CajaListaScreen: () => null }));

/* El resumen por grupos: dos grupos, uno con mentor (se abre) y uno sin (no se abre). */
jest.mock('../SemaforoAdminScreen', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const boton = (etiqueta: string, alPulsar: () => void) =>
    R.createElement(Pressable, { key: etiqueta, onPress: alPulsar, accessibilityLabel: etiqueta }, R.createElement(Text, null, etiqueta));
  return {
    SemaforoAdminScreen: ({ onAbrirGrupo }: { onAbrirGrupo: (g: object, inicio: object) => void }) =>
      R.createElement(
        R.Fragment,
        null,
        R.createElement(Text, null, 'VISTA: resumen por grupos'),
        boton('Grupo con mentor', () => onAbrirGrupo({ grupoId: 'g-1', grupoNombre: 'Fénix', puedeAbrirse: true }, INICIO)),
        boton('Grupo sin mentor', () => onAbrirGrupo({ grupoId: 'g-2', grupoNombre: 'Sin mentor', puedeAbrirse: false }, INICIO)),
      ),
  };
});

/* La tabla del grupo: una persona. `useSemaforoDelGrupo` y la tabla se reemplazan; la pantalla de verdad es la que se prueba. */
jest.mock('../../../semaforo/hooks/useLecturaPorSemana', () => ({
  useSemaforoDelGrupo: (_origen: unknown, inicio: unknown) => ({
    datos: { grupoNombre: 'Fénix', aprendices: [{ aprendizId: 'a-1', nombre: 'Ana Pérez', avatarUrl: 'https://f/ana.jpg' }] },
    inicio: inicio ?? { posicion: { modo: 'vigente' }, hastaVigente: null },
  }),
}));
jest.mock('../../../semaforo/components/TablaDelSemaforo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    VistaSemaforoDelGrupo: ({ onAbrirAprendiz }: { onAbrirAprendiz: (id: string) => (() => void) | undefined }) =>
      R.createElement(
        Pressable,
        { onPress: onAbrirAprendiz('a-1'), accessibilityLabel: 'Persona Ana Pérez' },
        R.createElement(Text, null, 'Ana Pérez'),
      ),
  };
});
jest.mock('../../components/CabeceraAdmin', () => ({ CabeceraAdmin: () => null }));
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
/* Spec 012: la ficha suma el Código Renaser de la persona (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
/* Spec 015: la ficha suma su tiempo libre de la semana (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: () => null }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));

/* La vista del líder: expone qué grupo, qué persona, qué ventana y qué se le pasó, y su «volver» y «Ver su ficha». */
jest.mock('../../../lider-mentores/screens/PersonaDelLiderScreen', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PersonaDelLiderScreen: (p: {
      grupoId: string;
      grupoNombre: string;
      personaId: string;
      nombre: string;
      avatarUrl: string | null;
      inicio?: object;
      onVolver: () => void;
      avisoSiNoSeAbre?: string;
      alAbrirFicha?: () => void;
    }) =>
      R.createElement(
        R.Fragment,
        null,
        R.createElement(
          Text,
          null,
          `VISTA: sus días · grupo ${p.grupoId} (${p.grupoNombre}) · persona ${p.personaId} (${p.nombre}) · foto ${p.avatarUrl ?? 'ninguna'} · ventana ${
            p.inicio ? JSON.stringify(p.inicio) : 'vigente'
          } · aviso ${p.avisoSiNoSeAbre ? 'sí' : 'no'}`,
        ),
        R.createElement(Pressable, { onPress: p.onVolver, accessibilityLabel: 'Volver' }, R.createElement(Text, null, 'Volver')),
        p.alAbrirFicha
          ? R.createElement(Pressable, { onPress: p.alAbrirFicha, accessibilityLabel: 'Ver su ficha' }, R.createElement(Text, null, 'Ver su ficha'))
          : null,
      ),
  };
});

/* La ficha: expone a quién es, y ofrece sus días solo si la pila se lo pide. */
jest.mock('../FichaAprendizScreen', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FichaAprendizScreen: (p: {
      aprendiz: { id: string; fullName: string | null; cellId?: string | null };
      onVolver: () => void;
      onVerSusDias?: (grupoId: string) => void;
    }) => {
      const grupo = p.aprendiz.cellId ?? null;
      return R.createElement(
        R.Fragment,
        null,
        R.createElement(Text, null, `VISTA: ficha de ${p.aprendiz.fullName} (${p.aprendiz.id})`),
        R.createElement(Pressable, { onPress: p.onVolver, accessibilityLabel: 'Volver' }, R.createElement(Text, null, 'Volver')),
        p.onVerSusDias && grupo
          ? R.createElement(
              Pressable,
              { onPress: () => p.onVerSusDias?.(grupo), accessibilityLabel: 'Ver sus días y evidencias' },
              R.createElement(Text, null, 'Ver sus días y evidencias'),
            )
          : null,
      );
    },
  };
});

import { AdminScreen, type EntradaDeAdmin } from '../AdminScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function montar(abrirEn: EntradaDeAdmin): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(AdminScreen, { onSalir: () => undefined, abrirEn }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

function tocables(r: ReactTestRenderer): ReactTestInstance[] {
  return r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
}

async function tocar(r: ReactTestRenderer, etiqueta: string): Promise<void> {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay nada tocable que diga «${etiqueta}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  await act(async () => {
    nodo.props.onPress();
  });
}

function hay(r: ReactTestRenderer, etiqueta: string): boolean {
  return tocables(r).some(n => n.props.accessibilityLabel === etiqueta);
}

describe('Semáforo → grupo → persona', () => {
  it('con un grupo con mentor, tocar a la persona abre sus días en la ventana que se miraba y con el nombre y la foto de la fila', async () => {
    const r = await montar('semaforo');
    await tocar(r, 'Grupo con mentor');
    expect(textos(r)).toContain('Ana Pérez');

    await tocar(r, 'Persona Ana Pérez');

    const vista = textos(r);
    expect(vista).toContain('VISTA: sus días');
    expect(vista).toContain('grupo g-1 (Fénix)');
    expect(vista).toContain('persona a-1 (Ana Pérez)');
    expect(vista).toContain('foto https://f/ana.jpg');
    // La ventana del resumen manda en todo: la misma posición y el mismo ancla.
    expect(vista).toContain(JSON.stringify(INICIO));
    expect(vista).toContain('aviso sí');
    expect(hay(r, 'Ver su ficha')).toBe(true);
  });

  it('con un grupo sin mentor, tocar a la persona abre su ficha como siempre (el servidor no abriría sus días)', async () => {
    const r = await montar('semaforo');
    await tocar(r, 'Grupo sin mentor');
    await tocar(r, 'Persona Ana Pérez');

    expect(textos(r)).toContain('VISTA: ficha de Ana Pérez (a-1)');
    expect(textos(r)).not.toContain('VISTA: sus días');
  });

  it('desde sus días, «Ver su ficha» abre la ficha (cambiar día, caja, eliminar) sin ofrecer volver a los días', async () => {
    const r = await montar('semaforo');
    await tocar(r, 'Grupo con mentor');
    await tocar(r, 'Persona Ana Pérez');
    await tocar(r, 'Ver su ficha');

    expect(textos(r)).toContain('VISTA: ficha de Ana Pérez (a-1)');
    // Ya vino de sus días: no se ofrece el círculo ficha → días → ficha.
    expect(hay(r, 'Ver sus días y evidencias')).toBe(false);
  });

  it('volver sube un nivel cada vez: ficha → sus días → grupo → resumen', async () => {
    const r = await montar('semaforo');
    await tocar(r, 'Grupo con mentor');
    await tocar(r, 'Persona Ana Pérez');
    await tocar(r, 'Ver su ficha');

    await tocar(r, 'Volver');
    expect(textos(r)).toContain('VISTA: sus días');
    await tocar(r, 'Volver');
    expect(textos(r)).toContain('Ana Pérez');
    expect(textos(r)).not.toContain('VISTA: sus días');
  });
});

describe('Ficha → «Ver sus días y evidencias»', () => {
  it('con grupo, abre sus días con el grupo de la persona, el nombre genérico del grupo y el aviso por si el servidor responde 404', async () => {
    const r = await montar({ ficha: { id: 'a-3', fullName: 'Carla Soto', cellId: 'g-3' } });
    expect(textos(r)).toContain('VISTA: ficha de Carla Soto (a-3)');

    await tocar(r, 'Ver sus días y evidencias');

    const vista = textos(r);
    expect(vista).toContain('grupo g-3 (Su grupo)');
    expect(vista).toContain('persona a-3 (Carla Soto)');
    expect(vista).toContain('ventana vigente');
    expect(vista).toContain('aviso sí');
    // La ficha está justo debajo: no hace falta otro botón a ella.
    expect(hay(r, 'Ver su ficha')).toBe(false);
  });

  it('volver desde sus días regresa a la ficha, que ya no se rompe ni se cierra', async () => {
    const r = await montar({ ficha: { id: 'a-3', fullName: 'Carla Soto', cellId: 'g-3' } });
    await tocar(r, 'Ver sus días y evidencias');
    await tocar(r, 'Volver');

    expect(textos(r)).toContain('VISTA: ficha de Carla Soto (a-3)');
    expect(hay(r, 'Ver sus días y evidencias')).toBe(true);
  });

  it('sin grupo no hay entrada: no hay nada que pedirle al servidor', async () => {
    const r = await montar({ ficha: { id: 'a-4', fullName: 'Dino Ríos', cellId: null } });

    expect(textos(r)).toContain('VISTA: ficha de Dino Ríos (a-4)');
    expect(hay(r, 'Ver sus días y evidencias')).toBe(false);
  });
});
