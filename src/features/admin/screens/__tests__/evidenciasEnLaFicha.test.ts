import { readFileSync } from 'fs';
import { join } from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { EvidenciaLeida } from '../../../lider-mentores/api/cumplimientoDelLiderApi';
import type { SemanaAlumnoApi } from '../../../mentor/api/mentorSchemas';

/**
 * Las evidencias de la ficha de administración (2026-10-27): «Ver evidencia» abre la MISMA hoja que el líder, dentro
 * de la app, para cualquier aprendiz. Foto, audio, video y TEXTO se ven ahí; antes se salía al navegador y una
 * evidencia de texto decía «no hay archivo que abrir» sin mostrar nada.
 */

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
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: () => null }));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: () => null }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
/* La hoja de verdad es un `Modal` con gestos: acá basta con que muestre su contenido cuando está abierta. */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, children }: { visible: boolean; titulo: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, { testID: 'hoja' }, R.createElement(Text, null, `HOJA: ${titulo}`), children) : null,
  };
});
jest.mock('expo-image', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { Image: (props: object) => R.createElement('FotoDeExpo', props) };
});
jest.mock('../../../lider-mentores/components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../../lider-mentores/components/VisorDePublicacion', () => ({ VerPublicacion: () => null }));
jest.mock('../../../mentor/components/RejillaSemanal', () => ({ RejillaSemanal: () => null }));
jest.mock('../../../semaforo/components/TarjetaSemaforoDeAprendiz', () => ({ TarjetaSemaforoDeAprendiz: () => null }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: () => null }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));
jest.mock('../../api/adminApi', () => ({ recuperarCuentaDePersona: jest.fn() }));
jest.mock('../../utils/dialogo', () => ({ avisar: jest.fn() }));
jest.mock('../CambiarDiaScreen', () => ({ CambiarDiaScreen: () => null }));
jest.mock('../EliminarCuentaAdminScreen', () => ({ EliminarCuentaAdminScreen: () => null }));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1', role: 'ADMIN' } }) }));
jest.mock('../../hooks/useDetalleAprendiz', () => ({
  useDetalleAprendiz: () => ({ detalle: null, ultimoAjuste: null, quienAjusto: null, cargando: false, fallo: null, recargar: async () => undefined }),
}));

const mockSemana = jest.fn<() => SemanaAlumnoApi>();
jest.mock('../../hooks/useSemanaAdministrativa', () => ({
  useSemanaAdministrativa: () => ({
    semana: mockSemana(),
    sinDatos: false,
    cargando: false,
    fallo: null,
    desplazar: () => undefined,
    recargar: async () => undefined,
  }),
}));

const mockLeer = jest.fn<(id: string, tipo: string | null) => Promise<EvidenciaLeida>>();
jest.mock('../../../lider-mentores/api/cumplimientoDelLiderApi', () => {
  const actual = jest.requireActual<typeof import('../../../lider-mentores/api/cumplimientoDelLiderApi')>(
    '../../../lider-mentores/api/cumplimientoDelLiderApi',
  );
  return {
    EvidenciaNoSeAbrio: actual.EvidenciaNoSeAbrio,
    leerEvidencia: (id: string, tipo: string | null) => mockLeer(id, tipo),
    obtenerPublicacion: jest.fn(),
  };
});

import { FichaAprendizScreen } from '../FichaAprendizScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function semanaConEvidencias(): SemanaAlumnoApi {
  const obligacion = (registroId: string, titulo: string, evidenciaId: string | null) => ({
    registroId,
    titulo,
    estadoHabito: 'COMPLETADO',
    requiereEvidencia: true,
    entrega: evidenciaId ? 'ENTREGADA' : 'SIN_ENTREGA',
    entregadaEn: null,
    revision: null,
    evidenciaId,
  });
  return {
    grupoId: null,
    alumnoId: 'a-1',
    nombre: 'Ana Pérez',
    inicioDeSemana: '2026-10-19',
    finDeSemana: '2026-10-25',
    diaDePrograma: 10,
    zona: 'America/Lima',
    dias: [
      {
        fecha: '2026-10-25',
        diaDePrograma: 10,
        obligaciones: [
          obligacion('r1', 'Ritual de la mañana', 'e-foto'),
          obligacion('r2', 'Audioterapia semanal', 'e-texto'),
          obligacion('r3', 'Caminata', null),
        ],
      },
    ],
    resumen: { obligaciones: 3, cumplidas: 3, conEntrega: 2, pendientes: 0, sinCumplir: 0 },
    cobertura: 'COMPLETA',
    actualizadoEn: '2026-10-26T10:00:00Z',
  } as SemanaAlumnoApi;
}

async function montar(
  extra: { cellId?: string | null; onVerSusDias?: (grupoId: string) => void } = {},
): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(FichaAprendizScreen, {
        aprendiz: { id: 'a-1', fullName: 'Ana Pérez', cellId: extra.cellId ?? null },
        onVolver: () => undefined,
        onVerSusDias: extra.onVerSusDias,
      }),
    );
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
  const todos = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
  return todos.filter(n => !todos.includes((n as unknown as { parent: never }).parent));
}

async function tocar(r: ReactTestRenderer, parte: string): Promise<void> {
  const nodo = tocables(r).find(n => (n.props.accessibilityLabel as string).includes(parte));
  if (!nodo) throw new Error(`No hay nada tocable que diga «${parte}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  await act(async () => {
    nodo.props.onPress();
  });
}

beforeEach(() => {
  mockSemana.mockReset().mockReturnValue(semanaConEvidencias());
  mockLeer.mockReset();
});

describe('«Ver evidencia» en la ficha de administración', () => {
  it('una foto se ve dentro de la app, en la hoja del líder, y no sale al navegador', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Ritual de la mañana');

    expect(mockLeer).toHaveBeenCalledWith('e-foto', null);
    expect(textos(r)).toContain('HOJA: Ritual de la mañana');
    const foto = r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')[0];
    expect(foto.props.source.uri).toBe('https://s3/foto.jpg?firma=1');
  });

  it('una evidencia de TEXTO muestra lo escrito (antes decía «no hay archivo que abrir»)', async () => {
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'Escuché el audio y pensé en mi familia.' });
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Audioterapia semanal');

    expect(textos(r)).toContain('Escuché el audio y pensé en mi familia.');
    expect(textos(r)).not.toContain('no hay archivo que abrir');
  });

  it('el enlace no se pide al dibujar la fila, solo al abrir la hoja (vence a los diez minutos)', async () => {
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    expect(mockLeer).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Ver evidencia');
  });

  it('un hábito sin evidencia no ofrece un botón que no abre nada', async () => {
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    const botones = tocables(r).filter(n => (n.props.accessibilityLabel as string).startsWith('Ver evidencia de'));
    expect(botones.map(n => n.props.accessibilityLabel)).toEqual([
      'Ver evidencia de Ritual de la mañana',
      'Ver evidencia de Audioterapia semanal',
    ]);
  });
});

describe('«Ver sus días y evidencias» en la ficha', () => {
  it('con grupo, abre la vista del líder con el grupo de la persona', async () => {
    const abrir = jest.fn<(grupoId: string) => void>();
    const r = await montar({ cellId: 'g-7', onVerSusDias: abrir });
    await tocar(r, 'Ver los días y las evidencias de Ana Pérez');
    expect(abrir).toHaveBeenCalledWith('g-7');
    expect(textos(r)).toContain('Ver sus días y evidencias');
  });

  it('sin grupo no se ofrece: no hay nada que pedirle al servidor', async () => {
    const r = await montar({ cellId: null, onVerSusDias: jest.fn() });
    expect(tocables(r).some(n => (n.props.accessibilityLabel as string).includes('Ver los días y las evidencias'))).toBe(false);
  });

  it('sin la conexión de quien la abre, la ficha es la de siempre', async () => {
    const r = await montar({ cellId: 'g-7' });
    expect(tocables(r).some(n => (n.props.accessibilityLabel as string).includes('Ver los días y las evidencias'))).toBe(false);
  });
});

describe('la ficha no vuelve a sacar la evidencia al navegador', () => {
  const fuente = readFileSync(join(__dirname, '..', 'FichaAprendizScreen.tsx'), 'utf8');

  it('no usa Linking ni pide el enlace por su cuenta: lo hace la hoja de la evidencia', () => {
    expect(fuente).not.toMatch(/Linking\./);
    expect(fuente).not.toMatch(/import[^;]*urlDeEvidencia/);
    expect(fuente).toMatch(/<EvidenciaDeObligacion/);
  });
});
