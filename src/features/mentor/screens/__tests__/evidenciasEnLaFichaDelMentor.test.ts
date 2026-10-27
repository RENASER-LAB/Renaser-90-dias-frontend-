import { readFileSync } from 'fs';
import { join } from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Linking } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { EvidenciaLeida } from '../../../lider-mentores/api/cumplimientoDelLiderApi';
import type { SemanaAlumnoApi } from '../../api/mentorSchemas';
import { alumnoDesdeLaInfo } from '../../utils/alumnoDesdeLaInfo';

/**
 * Las evidencias de la ficha del mentor (2026-10-27): «Ver evidencia» abre la MISMA hoja que el líder, dentro de la
 * app. Foto, audio, video y TEXTO se ven ahí; antes se salía al navegador con `Linking.openURL` y una evidencia de
 * texto decía «no hay archivo que abrir» sin mostrar lo escrito. Vale para «Mi grupo» y para la ficha que se abre
 * desde la info del chat del grupo (`alumnoDesdeLaInfo`): es la misma pantalla.
 *
 * El servidor deja leer el detalle y el archivo de una evidencia al mentor o a la guía de aprendiz asignados a esa
 * persona (`EvidenciaService.requireDuenoOAdmin` del backend), así que no hace falta otra fuente para el texto.
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
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
jest.mock('../../../../components/Aparicion', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Aparicion: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});
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
jest.mock('../../components/RejillaSemanal', () => ({ RejillaSemanal: () => null }));
jest.mock('../../components/HabitosDelAlumno', () => ({ HabitosDelAlumno: () => null }));
jest.mock('../../components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
jest.mock('../../../semaforo/components/TarjetaSemaforoDeAprendiz', () => ({ TarjetaSemaforoDeAprendiz: () => null }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: () => null }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));

const mockSemana = jest.fn<() => SemanaAlumnoApi>();
const mockUsarSemana = jest.fn<(grupoId: string | null, alumnoId: string | null) => void>();
jest.mock('../../hooks/useSemanaDelAlumno', () => ({
  useSemanaDelAlumno: (grupoId: string | null, alumnoId: string | null) => {
    mockUsarSemana(grupoId, alumnoId);
    const semana = mockSemana();
    const conAlgo = semana.dias.filter(d => d.obligaciones.length > 0);
    return {
      semana,
      diasConContenido: conAlgo.length > 0 ? conAlgo : semana.dias,
      cargando: false,
      fallo: null,
      desplazar: () => undefined,
      recargar: async () => undefined,
    };
  },
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

import { AlumnoScreen } from '../AlumnoScreen';

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
    grupoId: 'g-7',
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
  alumno = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-7', null),
  grupoId: string | null = 'g-7',
): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(AlumnoScreen, { alumno, grupoId, onVolver: () => undefined }));
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

let abrirEnElNavegador: jest.SpiedFunction<typeof Linking.openURL>;

beforeEach(() => {
  mockSemana.mockReset().mockReturnValue(semanaConEvidencias());
  mockLeer.mockReset();
  mockUsarSemana.mockReset();
  abrirEnElNavegador = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

describe('«Ver evidencia» en la ficha del mentor', () => {
  it('una foto se ve dentro de la app, en la hoja del líder, con el id de ESA evidencia y sin salir al navegador', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Ritual de la mañana');

    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(mockLeer).toHaveBeenCalledWith('e-foto', null);
    expect(textos(r)).toContain('HOJA: Ritual de la mañana');
    const foto = r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')[0];
    expect(foto.props.source.uri).toBe('https://s3/foto.jpg?firma=1');
    expect(abrirEnElNavegador).not.toHaveBeenCalled();
  });

  it('una evidencia de TEXTO muestra lo escrito (antes decía «no hay archivo que abrir»)', async () => {
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'Escuché el audio y pensé en mi familia.' });
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Audioterapia semanal');

    expect(mockLeer).toHaveBeenCalledWith('e-texto', null);
    expect(textos(r)).toContain('Escuché el audio y pensé en mi familia.');
    expect(textos(r)).not.toContain('no hay archivo que abrir');
    expect(abrirEnElNavegador).not.toHaveBeenCalled();
  });

  it('si el servidor no deja leerla, la hoja lo dice y la ficha sigue en pie', async () => {
    const { EvidenciaNoSeAbrio } = jest.requireActual<typeof import('../../../lider-mentores/api/cumplimientoDelLiderApi')>(
      '../../../lider-mentores/api/cumplimientoDelLiderApi',
    );
    mockLeer.mockRejectedValue(new EvidenciaNoSeAbrio('sin_permiso', 'Prohibido'));
    const r = await montar();
    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Ritual de la mañana');

    expect(textos(r)).toContain('HOJA: Ritual de la mañana');
    expect(textos(r)).toContain('Tu cuenta no puede abrir esta evidencia.');
    expect(textos(r)).not.toContain('Abriendo…');
    expect(textos(r)).toContain('Audioterapia semanal');
    expect(abrirEnElNavegador).not.toHaveBeenCalled();
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

  it('abierta desde la info del grupo es la misma ficha: lee la semana del grupo y la hoja abre la misma evidencia', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=2' });
    const alumno = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-9', null);
    const r = await montar(alumno, 'g-9');
    expect(mockUsarSemana).toHaveBeenCalledWith('g-9', 'a-1');

    await tocar(r, 'Detalle de hábitos');
    await tocar(r, 'Ver evidencia de Ritual de la mañana');
    expect(mockLeer).toHaveBeenCalledWith('e-foto', null);
    expect(abrirEnElNavegador).not.toHaveBeenCalled();
  });
});

describe('la ficha del mentor no vuelve a sacar la evidencia al navegador', () => {
  const fuente = readFileSync(join(__dirname, '..', 'AlumnoScreen.tsx'), 'utf8');

  it('no usa Linking ni pide el enlace por su cuenta: lo hace la hoja de la evidencia', () => {
    expect(fuente).not.toMatch(/Linking/);
    expect(fuente).not.toMatch(/import[^;]*urlDeEvidencia/);
    expect(fuente).toMatch(/<EvidenciaDeObligacion/);
  });

  it('conserva «Ver publicación» del post diario', () => {
    expect(fuente).toMatch(/<VerPublicacion publicacionId=\{o\.publicacionId\}/);
  });
});
