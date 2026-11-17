import { readFileSync } from 'fs';
import { join } from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import type { EvidenciaLeida } from '../../../lider-mentores/api/cumplimientoDelLiderApi';
import type { ObligacionDeLaPersona } from '../../../lider-mentores/types/cumplimientoDelLider.types';
import { habitoDelDia } from '../../utils/habitosDelDia';
import { hayTocable, montar, porTestID, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
/* La hoja de verdad es un `Modal` con gestos: acá basta con que muestre su contenido cuando está abierta. */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, subtitulo, children }: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, { testID: 'hoja' }, R.createElement(Text, null, `HOJA: ${titulo}`), R.createElement(Text, null, `SUB: ${subtitulo ?? ''}`), children) : null,
  };
});
jest.mock('expo-image', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { Image: (props: object) => R.createElement('FotoDeExpo', props) };
});
jest.mock('../../../lider-mentores/components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../../lider-mentores/components/VisorDePublicacion', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { VerPublicacion: ({ publicacionId, etiqueta }: { publicacionId: string; etiqueta?: string }) => R.createElement(Text, null, `${etiqueta ?? 'Ver publicación'} → ${publicacionId}`) };
});
jest.mock('../../../pasos/components/LineaDeLaMedicion', () => ({ LineaDeLaMedicionCruda: () => null }));

const mockLeer = jest.fn<(id: string, tipo: string | null) => Promise<EvidenciaLeida>>();
jest.mock('../../../lider-mentores/api/cumplimientoDelLiderApi', () => {
  const actual = jest.requireActual<typeof import('../../../lider-mentores/api/cumplimientoDelLiderApi')>('../../../lider-mentores/api/cumplimientoDelLiderApi');
  return { EvidenciaNoSeAbrio: actual.EvidenciaNoSeAbrio, leerEvidencia: (id: string, tipo: string | null) => mockLeer(id, tipo), obtenerPublicacion: jest.fn() };
});

import { EvidenciaDeObligacion } from '../../../lider-mentores/components/EvidenciaDeObligacion';
import { HabitoDelDia } from '../HabitoDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: ObligacionDeLaPersona = {
  registroId: 'r1',
  titulo: 'Ritual de la mañana',
  estado: 'COMPLETADO',
  requiereEvidencia: true,
  entrega: 'ENTREGADA',
  entregadaEn: '2026-11-12T13:30:00Z',
  revision: null,
  evidenciaId: 'e-foto',
  respuestaTexto: null,
  evidencias: [{ id: 'e-foto', tipo: 'FOTO', subidaEn: null }],
  publicacionId: null,
  pilar: 'CUERPO',
  medicion: null,
};
const fila = (o: Partial<ObligacionDeLaPersona>, ver = jest.fn<(id: string) => void>()) =>
  montar(React.createElement(HabitoDelDia, { habito: habitoDelDia({ ...base, ...o }, 'America/Lima'), onVerEvidencia: ver }));

beforeEach(() => {
  mockLeer.mockReset();
});

describe('el ojo de la evidencia en cada hábito', () => {
  it('aparece solo si el hábito cumplido tiene evidencia', async () => { // spec 055 FR-019
    expect(hayTocable(await fila({}), 'Ver la evidencia de Ritual de la mañana')).toBe(true);
    expect(hayTocable(await fila({ evidencias: [], evidenciaId: null }), 'Ver la evidencia')).toBe(false);
    expect(hayTocable(await fila({ estado: 'PENDIENTE' }), 'Ver la evidencia')).toBe(false);
    expect(hayTocable(await fila({ estado: 'EXPIRADO' }), 'Ver la evidencia')).toBe(false);
  });

  it('un cumplido con solo la publicación del Muro (el post diario) también tiene evidencia', async () => { // spec 055 FR-019
    expect(hayTocable(await fila({ evidencias: [], evidenciaId: null, publicacionId: 'p-1' }), 'Ver la evidencia')).toBe(true);
  });

  it('el ojo avisa qué hábito se quiere ver, con un solo toque', async () => { // spec 055 FR-020
    const ver = jest.fn<(id: string) => void>();
    const r = await fila({}, ver);
    await tocar(r, 'Ver la evidencia');
    expect(ver).toHaveBeenCalledTimes(1);
    expect(ver).toHaveBeenCalledWith('r1');
  });

  it('el estado va con su forma (✓, ✕ o círculo punteado) y la hora a la derecha en la zona del aprendiz', async () => { // spec 055 FR-014
    const r = await fila({});
    expect(porTestID(r, 'estado-cumplido')).toHaveLength(1);
    expect(todoElTexto(r)).toContain('08:30');
    expect(porTestID(await fila({ estado: 'FALLIDO' }), 'estado-vencido')).toHaveLength(1);
    expect(porTestID(await fila({ estado: 'PENDIENTE' }), 'estado-pendiente')).toHaveLength(1);
  });
});

describe('la hoja de la evidencia', () => {
  const hoja = (extra: object = {}) =>
    montar(
      React.createElement(EvidenciaDeObligacion, {
        titulo: 'Ritual de la mañana',
        evidencias: [{ id: 'e-foto', tipo: 'FOTO', subidaEn: null }],
        abierta: true,
        alCerrar: jest.fn(),
        subtitulo: '08:30 · Cuerpo',
        ...extra,
      }),
    );

  it('abre desde abajo con la foto, la hora y el pilar, sin botón «Ver evidencia» propio', async () => { // spec 055 FR-020
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    const r = await hoja();
    expect(todoElTexto(r)).toContain('HOJA: Ritual de la mañana');
    expect(todoElTexto(r)).toContain('SUB: 08:30 · Cuerpo');
    expect(mockLeer).toHaveBeenCalledWith('e-foto', 'FOTO');
    expect(r.root.findAll(n => (n.type as unknown) === 'FotoDeExpo')[0].props.source.uri).toBe('https://s3/foto.jpg?firma=1');
    expect(hayTocable(r, 'Ver evidencia de')).toBe(false);
  });

  it('con varias evidencias dice «1 de N» y muestra lo que escribió el aprendiz', async () => { // spec 055 FR-020
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'Hola' });
    const r = await hoja({
      evidencias: [
        { id: 'e1', tipo: 'TEXTO', subidaEn: null },
        { id: 'e2', tipo: 'FOTO', subidaEn: null },
      ],
      respuestaTexto: 'Me sentí con mucha energía',
    });
    expect(todoElTexto(r)).toMatch(/1 de 2/);
    expect(todoElTexto(r)).toContain('Me sentí con mucha energía');
  });

  it('anterior y siguiente pasan a otro hábito del día sin cerrar la hoja; sin a dónde ir quedan apagados', async () => { // spec 055 FR-021
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'x' });
    const alSiguiente = jest.fn();
    const r = await hoja({ navegacion: { alSiguiente } });
    expect(tocarEstado(r, 'Anterior')).toBe(true); // deshabilitado
    expect(tocarEstado(r, 'Siguiente')).toBe(false);
    await tocar(r, 'Siguiente');
    expect(alSiguiente).toHaveBeenCalledTimes(1);
    expect(todoElTexto(r)).toContain('HOJA: Ritual de la mañana');
  });

  it('si la evidencia se publicó en el Muro, ofrece «Ver en el Muro»', async () => { // spec 055 FR-021
    mockLeer.mockResolvedValue({ tipo: 'TEXTO', texto: 'x' });
    expect(todoElTexto(await hoja({ publicacionId: 'p-9' }))).toContain('Ver en el Muro → p-9');
    expect(todoElTexto(await hoja())).not.toContain('Ver en el Muro');
  });

  it('cerrarla (deslizando, con el gesto de volver del sistema o con la ✕) llama al cierre y la ficha queda en el mismo día', async () => { // spec 055 FR-022
    const fuente = readFileSync(join(__dirname, '..', '..', 'screens', 'AlumnoScreen.tsx'), 'utf8');
    expect(fuente).toMatch(/alCerrar=\{\(\) => setEvidenciaAbierta\(null\)\}/);
    /* La hoja es `HojaDesdeAbajo`, que cierra con el atrás del sistema (`onRequestClose`), el fondo y la ✕: ver su propia prueba. */
    const hojaFuente = readFileSync(join(__dirname, '..', '..', '..', 'lider-mentores', 'components', 'EvidenciaDeObligacion.tsx'), 'utf8');
    expect(hojaFuente).toMatch(/<HojaDesdeAbajo[\s\S]*alCerrar=\{cerrar\}/);
  });

  it('el uso de siempre (líder y Administración) sigue igual: botón «Ver evidencia» y hoja propia', async () => { // spec 055 FR-020
    mockLeer.mockResolvedValue({ tipo: 'FOTO', url: 'https://s3/foto.jpg' });
    const r = await montar(React.createElement(EvidenciaDeObligacion, { titulo: 'Caminata', evidencias: [{ id: 'e1', tipo: 'FOTO', subidaEn: null }] }));
    expect(mockLeer).not.toHaveBeenCalled();
    await tocar(r, 'Ver evidencia de Caminata');
    expect(todoElTexto(r)).toContain('HOJA: Caminata');
    expect(todoElTexto(r)).toContain('SUB: Evidencia');
  });
});

import type { ReactTestRenderer } from 'react-test-renderer';
/** `true` si ese botón de navegación está deshabilitado. */
function tocarEstado(r: ReactTestRenderer, parte: string): boolean {
  const nodo = r.root.findAll(n => typeof n.props.onPress !== 'undefined' || n.props.accessibilityState).find(n => n.props.accessibilityLabel === parte);
  return Boolean(nodo?.props.accessibilityState?.disabled);
}
