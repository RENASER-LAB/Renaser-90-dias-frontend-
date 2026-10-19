import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { EvidenciaLeida } from '../../api/cumplimientoDelLiderApi';
import type { DiaDeLaPersona as DiaDatos, ObligacionDeLaPersona, PublicacionDelMuro } from '../../types/cumplimientoDelLider.types';

/**
 * Abrir lo que respalda un cumplimiento (spec 005, US2): la foto, el texto, el audio y el video de un hábito,
 * con lo que la persona escribió debajo; la publicación del Muro del post diario; y la foto de una acción del
 * día. El enlace de un archivo se pide AL ABRIR (FR-012), una evidencia que ya no está lo dice y la ficha
 * sigue, y un hábito cumplido sin nada que ver no ofrece un botón que no abre nada.
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
jest.mock('../ReproductorDeAudio', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ReproductorDeAudio: ({ uri }: { uri: string }) => R.createElement(Text, null, `AUDIO ${uri}`) };
});
jest.mock('../../../academy/components/LeccionVideoPlayer', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LeccionVideoPlayer: ({ videoUrl }: { videoUrl: string }) => R.createElement(Text, null, `VIDEO ${videoUrl}`) };
});

const mockLeer = jest.fn<(id: string, tipo: string | null) => Promise<EvidenciaLeida>>();
const mockPublicacion = jest.fn<(id: string) => Promise<PublicacionDelMuro>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => {
  const actual = jest.requireActual<typeof import('../../api/cumplimientoDelLiderApi')>('../../api/cumplimientoDelLiderApi');
  return {
    EvidenciaNoSeAbrio: actual.EvidenciaNoSeAbrio,
    leerEvidencia: (id: string, tipo: string | null) => mockLeer(id, tipo),
    obtenerPublicacion: (id: string) => mockPublicacion(id),
  };
});
const mockIrAPestana = jest.fn<(nombre: string, params?: Record<string, unknown>) => boolean>();
jest.mock('../../../../navigation/navegacionRef', () => ({
  irAPestana: (nombre: string, params?: Record<string, unknown>) => mockIrAPestana(nombre, params),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { EvidenciaNoSeAbrio } from '../../api/cumplimientoDelLiderApi';
import { DiaDeLaPersona } from '../DiaDeLaPersona';
import { EvidenciaDeObligacion } from '../EvidenciaDeObligacion';
import { VerPublicacion } from '../VisorDePublicacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function montar(elemento: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento);
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
  mockLeer.mockReset();
  mockPublicacion.mockReset();
  mockIrAPestana.mockReset();
});

const FOTO = { id: 'e1', tipo: 'FOTO', subidaEn: null };

describe('la evidencia de un hábito', () => {
  it('el enlace NO se pide al dibujar la fila: solo al abrir la hoja (vence a los diez minutos)', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    const r = await montar(React.createElement(EvidenciaDeObligacion, { titulo: 'Ritual de la mañana', evidencias: [FOTO] }));
    expect(mockLeer).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Ver evidencia');
    await tocar(r, 'Ver evidencia de Ritual de la mañana');
    expect(mockLeer).toHaveBeenCalledWith('e1', 'FOTO');
  });

  it('una foto se ve dentro de la hoja, con su texto debajo («lo que escribió»)', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    const r = await montar(
      React.createElement(EvidenciaDeObligacion, { titulo: 'Ritual de la mañana', evidencias: [FOTO], respuestaTexto: 'Me sentí con energía' }),
    );
    await tocar(r, 'Ver evidencia');
    const foto = r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')[0];
    expect(foto.props.source.uri).toBe('https://s3/foto.jpg?firma=1');
    // La caché no depende de la firma: la misma foto no se baja de nuevo cada vez.
    expect(foto.props.source.cacheKey).toBe('https://s3/foto.jpg');
    expect(textos(r)).toContain('HOJA: Ritual de la mañana');
    expect(textos(r)).toContain('Lo que escribió');
    expect(textos(r)).toContain('Me sentí con energía');
  });

  it('un texto (la Audioterapia) se lee en la hoja', async () => {
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'Lo que escuché me hizo pensar en mi familia.' });
    const r = await montar(
      React.createElement(EvidenciaDeObligacion, {
        titulo: 'Audioterapia semanal',
        evidencias: [{ id: 'e2', tipo: 'TEXTO', subidaEn: null }],
      }),
    );
    await tocar(r, 'Ver evidencia');
    expect(textos(r)).toContain('Lo que escuché me hizo pensar en mi familia.');
  });

  it('un audio suena con su reproductor y un video corre en el de las lecciones, sin descargar nada', async () => {
    mockLeer.mockResolvedValueOnce({ tipo: 'AUDIO', url: 'https://s3/a.m4a' });
    const audio = await montar(
      React.createElement(EvidenciaDeObligacion, { titulo: 'Gratitud', evidencias: [{ id: 'a', tipo: 'AUDIO', subidaEn: null }] }),
    );
    await tocar(audio, 'Ver evidencia');
    expect(textos(audio)).toContain('AUDIO https://s3/a.m4a');

    mockLeer.mockResolvedValueOnce({ tipo: 'VIDEO', url: 'https://s3/v.mp4' });
    const video = await montar(
      React.createElement(EvidenciaDeObligacion, { titulo: 'Ejercicio', evidencias: [{ id: 'v', tipo: 'VIDEO', subidaEn: null }] }),
    );
    await tocar(video, 'Ver evidencia');
    expect(textos(video)).toContain('VIDEO https://s3/v.mp4');
  });

  it('con solo el «¿Qué sentiste?» (la Pastilla) la hoja lo lee aunque no haya archivo', async () => {
    const r = await montar(
      React.createElement(EvidenciaDeObligacion, { titulo: 'Pastilla Renacer', evidencias: [], respuestaTexto: 'Respuesta 1: sí\nRespuesta 2: no' }),
    );
    await tocar(r, 'Ver evidencia');
    expect(mockLeer).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Respuesta 1: sí\nRespuesta 2: no');
  });

  it('una evidencia que ya no existe dice «Ya no está disponible», sin «Reintentar», y la hoja sigue', async () => {
    mockLeer.mockRejectedValue(new EvidenciaNoSeAbrio('no_disponible', 'No existe'));
    const r = await montar(React.createElement(EvidenciaDeObligacion, { titulo: 'Agua', evidencias: [FOTO], respuestaTexto: 'Bien' }));
    await tocar(r, 'Ver evidencia');
    expect(textos(r)).toContain('Ya no está disponible.');
    expect(textos(r)).not.toContain('Reintentar');
    expect(textos(r)).toContain('Bien');
  });

  it('un fallo de red ofrece «Reintentar» y reintentar vuelve a pedir el enlace', async () => {
    mockLeer.mockRejectedValueOnce(new EvidenciaNoSeAbrio('sin_red', 'Sin red'));
    const r = await montar(React.createElement(EvidenciaDeObligacion, { titulo: 'Agua', evidencias: [FOTO] }));
    await tocar(r, 'Ver evidencia');
    expect(textos(r)).toContain('Reintentar');
    mockLeer.mockResolvedValueOnce({ tipo: 'FOTO', url: 'https://s3/otra.jpg' });
    const botonReintentar = r.root.findAll(n => n.props.accessibilityLabel === 'Reintentar' && typeof n.props.onPress === 'function')[0];
    await act(async () => {
      botonReintentar.props.onPress();
    });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')).toHaveLength(1);
  });

  it('varias evidencias de un mismo hábito se rotulan una por una', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/f.jpg' });
    const r = await montar(
      React.createElement(EvidenciaDeObligacion, {
        titulo: 'Ritual',
        evidencias: [FOTO, { id: 'e9', tipo: 'FOTO', subidaEn: null }],
      }),
    );
    await tocar(r, 'Ver evidencia');
    expect(textos(r)).toContain('Foto 1 de 2');
    expect(textos(r)).toContain('Foto 2 de 2');
  });
});

describe('la publicación del post diario', () => {
  it('«Ver publicación» pide la publicación AL ABRIR y muestra el autor, el texto y la foto', async () => {
    mockPublicacion.mockResolvedValue({
      id: 'pub1',
      autor: 'Ana Pérez',
      avatarUrl: null,
      texto: 'Hoy corrí 5 km',
      creadaEn: null,
      fotos: [{ url: 'https://s3/foto.jpg?firma=2' }],
    });
    const r = await montar(React.createElement(VerPublicacion, { publicacionId: 'pub1', titulo: 'Post diario en comunidad' }));
    expect(mockPublicacion).not.toHaveBeenCalled();
    await tocar(r, 'Ver la publicación de Post diario en comunidad');
    expect(mockPublicacion).toHaveBeenCalledWith('pub1');
    expect(textos(r)).toContain('HOJA: Publicación en el Muro');
    expect(textos(r)).toContain('Ana Pérez');
    expect(textos(r)).toContain('Hoy corrí 5 km');
    expect(r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')).toHaveLength(1);
  });

  it('una publicación que ya no existe lo dice y no tumba la ficha', async () => {
    mockPublicacion.mockRejectedValue(new ApiError(404, 'No existe'));
    const r = await montar(React.createElement(VerPublicacion, { publicacionId: 'pub1', titulo: 'Post diario' }));
    await tocar(r, 'Ver la publicación');
    expect(textos(r)).toContain('Ya no está disponible.');
  });

  it('si el servidor no la deja leer desde acá (403) se ofrece abrirla en el Muro', async () => {
    mockPublicacion.mockRejectedValue(new ApiError(403, 'No'));
    mockIrAPestana.mockReturnValue(true);
    const r = await montar(React.createElement(VerPublicacion, { publicacionId: 'pub7', titulo: 'Post diario' }));
    await tocar(r, 'Ver la publicación');
    expect(textos(r)).toContain('Tu cuenta no puede abrir esta evidencia.');
    await tocar(r, 'Abrir en el Muro');
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirPublicacionId: 'pub7' });
    // La hoja se cierra para que el Muro quede a la vista.
    expect(textos(r)).not.toContain('HOJA: Publicación en el Muro');
  });
});

function obligacion(cambios: Partial<ObligacionDeLaPersona> = {}): ObligacionDeLaPersona {
  return {
    registroId: 'r1',
    titulo: 'Ritual de la mañana',
    estado: 'COMPLETADO',
    requiereEvidencia: false,
    entrega: 'NO_REQUERIDA',
    entregadaEn: null,
    revision: null,
    evidenciaId: null,
    respuestaTexto: null,
    evidencias: [],
    publicacionId: null,
    ...cambios,
  };
}

function dia(obligaciones: ObligacionDeLaPersona[], acciones: DiaDatos['acciones'] = []): DiaDatos {
  return { fecha: '2026-10-18', diaDePrograma: 50, motivo: null, obligaciones, acciones };
}

function verDia(d: DiaDatos): Promise<ReactTestRenderer> {
  return montar(React.createElement(DiaDeLaPersona, { dia: d, abierto: true, alAlternar: () => undefined }));
}

describe('cada hábito del día ofrece lo que de verdad hay para ver', () => {
  it('cumplido sin evidencia (porque no la exige): «Cumplido · sin evidencia» y NINGÚN botón', async () => {
    const r = await verDia(dia([obligacion()]));
    expect(textos(r)).toContain('Cumplido · sin evidencia');
    expect(tocables(r).map(n => n.props.accessibilityLabel as string).filter(e => /Ver /.test(e))).toEqual([]);
  });

  it('con foto, con respuestas o con publicación, el botón que corresponde', async () => {
    const r = await verDia(
      dia([
        obligacion({ registroId: 'a', titulo: 'Con foto', requiereEvidencia: true, entrega: 'ENTREGADA', evidencias: [FOTO] }),
        obligacion({ registroId: 'b', titulo: 'Pastilla Renacer', respuestaTexto: 'Todo bien' }),
        obligacion({ registroId: 'c', titulo: 'Post diario en comunidad', entrega: 'ENTREGADA', publicacionId: 'pub1' }),
      ]),
    );
    const etiquetas = tocables(r).map(n => n.props.accessibilityLabel as string);
    expect(etiquetas).toContain('Ver evidencia de Con foto');
    expect(etiquetas).toContain('Ver evidencia de Pastilla Renacer');
    expect(etiquetas).toContain('Ver la publicación de Post diario en comunidad');
    expect(textos(r)).toContain('Publicado en el Muro');
  });

  it('la foto de una acción del día se abre como cualquier evidencia', async () => {
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/roca.jpg' });
    const r = await verDia(
      dia([], [{ id: 'ac1', titulo: 'Llamar a 3 clientes', estado: 'COMPLETADA', evidenciaId: 'e5' }]),
    );
    expect(textos(r)).toContain('Acciones de los objetivos');
    expect(textos(r)).toContain('Cumplida');
    await tocar(r, 'Ver evidencia de Llamar a 3 clientes');
    // No se conoce el tipo de la foto de una acción: la lectura lo averigua.
    expect(mockLeer).toHaveBeenCalledWith('e5', null);
  });
});
