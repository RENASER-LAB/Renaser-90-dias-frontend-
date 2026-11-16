/**
 * Spec 044: el paso «¿Para quién es?» del formulario y «Para quién es» / «Te invitó…» del detalle. Se montan de verdad; la red y lo pesado son
 * dobles.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));
const mockAlertas: Array<{ titulo: string; botones: Array<{ text: string; onPress?: () => void }> }> = [];
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, _m: string, botones: Array<{ text: string; onPress?: () => void }>) => mockAlertas.push({ titulo, botones }) },
}));
jest.mock('../../../habits/components/HoraPickerModal', () => ({ HoraPickerModal: () => null }));
jest.mock('../../../academy/components/CursoPortada', () => ({ CursoPortada: () => null }));
jest.mock('../../utils/portadaDelEvento', () => ({ elegirPortada: async () => null }));
jest.mock('../../../../components/LogoDeMarca', () => ({ LogoDeMarca: () => null }));
jest.mock('../../../formaciones/components/RotuloDeFormacion', () => ({ RotuloDeFormacion: () => null }));
jest.mock('../asistencia/EspacioSobreFlotantes', () => ({ EspacioSobreFlotantes: () => null }));
jest.mock('../asistencia/HojaQuienRespondio', () => ({ HojaQuienRespondio: () => null }));
jest.mock('../asistencia/TarjetaDeAsistencia', () => ({ TarjetaDeAsistencia: () => null }));
jest.mock('../audiencia/ElegirPersonasHoja', () => ({ ElegirPersonasHoja: () => null }));
jest.mock('../../hooks/useAhora', () => ({ useAhora: () => Date.parse('2026-11-06T15:00:00Z') }));
jest.mock('../../hooks/useAsistenciaDelEvento', () => ({ useAsistenciaDelEvento: () => ({ lista: null }) }));
jest.mock('../../hooks/useDisponibilidadDeMeet', () => ({ useDisponibilidadDeMeet: () => ({ sabido: true, disponibilidad: { disponible: true, motivo: null } }) }));
let mockLlega = { total: 6 as number | null, contando: false, fallo: false };
jest.mock('../../hooks/useVistaPreviaDeAudiencia', () => ({ useVistaPreviaDeAudiencia: () => mockLlega }));
let mockFresco: unknown = null;
jest.mock('../../hooks/useMeetDelEvento', () => ({
  useMeetDelEvento: () => ({ evento: mockFresco, lectura: 'lista', reintentando: false, fallo: false, reintentar: async () => true }),
}));

import { SIN_OPCIONES } from '../../api/audienciaSchemas';
import type { OpcionesDeAudiencia } from '../../types/audiencia.types';
import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { formularioVacio } from '../../utils/formularioDeEvento';
import { DetalleDelEvento } from '../DetalleDelEvento';
import { FormularioDelEvento } from '../FormularioDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AHORA = Date.parse('2026-11-06T15:00:00Z');
const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});
beforeEach(() => {
  mockLlega = { total: 6, contando: false, fallo: false };
  mockFresco = null;
});

function montar(elemento: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  montadas.push(r);
  return r;
}

const propio = (n: ReactTestInstance) =>
  React.Children.toArray(n.props.children as React.ReactNode)
    .filter(x => typeof x === 'string' || typeof x === 'number')
    .join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(propio);
const hay = (r: ReactTestRenderer, texto: string) => textos(r).some(t => t.includes(texto));
const conEtiqueta = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

const delMentor: OpcionesDeAudiencia = {
  ...SIN_OPCIONES,
  puedeCrear: true,
  partes: ['PERSON', 'MY_LEARNERS', 'TRAFFIC_LIGHT'],
  tiposDeEvento: ['SESION_ESPECIAL', 'ESPONTANEO'],
  porDefecto: 'MY_LEARNERS',
  colores: { GREEN: 4, YELLOW: 2, RED: 4 },
  misAlumnos: 10,
};

function formulario(opciones: OpcionesDeAudiencia, onGuardar = jest.fn()) {
  return montar(
    React.createElement(FormularioDelEvento, {
      inicial: { ...formularioVacio(AHORA, 'America/Lima'), titulo: 'Repaso' },
      original: null,
      error: null,
      guardando: false,
      onVolver: () => undefined,
      onGuardar,
      opciones,
    }),
  );
}

describe('«¿Para quién es?» en el formulario', () => {
  // spec 044 FR-033, FR-034
  it('el mentor ve solo sus opciones, abre en «Mis alumnos» y ve a cuántos llega', () => {
    const r = formulario(delMentor);

    expect(hay(r, '¿Para quién es?')).toBe(true);
    expect(conEtiqueta(r, 'Mis alumnos')?.props.accessibilityState).toEqual({ checked: true });
    expect(conEtiqueta(r, 'Personas')).toBeDefined();
    expect(conEtiqueta(r, 'Por semáforo')).toBeDefined();
    expect(conEtiqueta(r, 'Personal')).toBeUndefined();
    expect(conEtiqueta(r, 'Mentores')).toBeUndefined();
    expect(conEtiqueta(r, 'Todos')).toBeUndefined();
    expect(hay(r, 'Llega a 6 alumnos')).toBe(true);
    expect(hay(r, 'Tus alumnos no ven por qué los elegiste.')).toBe(true);
  });

  // spec 044 FR-007, FR-033
  it('el tipo solo ofrece «Sesión especial» y «Encuentro espontáneo»; el semáforo dice palabra, ayuda y cifra', () => {
    const r = formulario(delMentor);
    expect(hay(r, 'Mentoría del Alquimista')).toBe(false);
    expect(hay(r, 'Semana de Manifestación')).toBe(false);

    act(() => conEtiqueta(r, 'Por semáforo')!.props.onPress());

    expect(conEtiqueta(r, 'Rojo, Necesitan tu ayuda, 4')).toBeDefined();
    expect(conEtiqueta(r, 'Verde, Van bien, 4')).toBeDefined();
    expect(hay(r, 'Tus alumnos por semáforo')).toBe(true);
  });

  // spec 044 FR-036
  it('FR-036: los chips y las filas miden 48 o más', () => {
    const r = formulario(delMentor);
    act(() => conEtiqueta(r, 'Por semáforo')!.props.onPress());
    const altos = [conEtiqueta(r, 'Mis alumnos'), conEtiqueta(r, 'Rojo, Necesitan tu ayuda, 4')].map(n => {
      const caja = n!.findAll(x => x.props.style !== undefined)[0];
      return StyleSheet.flatten(caja.props.style).minHeight as number;
    });
    altos.forEach(alto => expect(alto).toBeGreaterThanOrEqual(48));
  });

  // spec 044 FR-033
  it('al guardar viaja lo elegido', () => {
    const onGuardar = jest.fn();
    const r = formulario(delMentor, onGuardar);
    act(() => conEtiqueta(r, 'Crear evento')?.props.onPress?.());
    const boton = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.etiqueta === 'Crear evento')[0];
    act(() => boton.props.onPress());
    const audiencia = onGuardar.mock.calls[0]?.[2] as { misAlumnos: boolean };
    expect(audiencia.misAlumnos).toBe(true);
  });

  // spec 044 FR-028
  it('sin partes del servidor (interruptor apagado o servidor anterior) el formulario es el de siempre', () => {
    const r = formulario({ ...SIN_OPCIONES, puedeCrear: false });
    expect(hay(r, '¿Para quién es?')).toBe(false);
    expect(hay(r, 'Avisar a todos al guardarlo')).toBe(true);
  });
});

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1', titulo: 'Sesión de rescate', descripcion: null, portadaUrl: null, iniciaEn: '2026-11-12T01:00:00Z', duracionMinutos: 60,
    zona: 'America/Lima', tipoUbicacion: 'MEET', valorUbicacion: 'https://meet.google.com/abc-defg-hij', tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null, notificarAlCrear: false, recurrente: false, creadoPor: 'lider', audiencia: 'SELECTION', rolesDestino: [], ...parcial,
  };
}

function detalle(e: Evento, onCancelar: (alcance: string) => void = () => undefined, puedeGestionar = false) {
  const oc: Ocurrencia = { evento: e, inicioOcurrencia: e.iniciaEn, iniciaEn: e.iniciaEn, duracionMinutos: 60, titulo: e.titulo, asistencia: null };
  return montar(
    React.createElement(DetalleDelEvento, {
      oc,
      puedeGestionar,
      enviando: false,
      onVolver: () => undefined,
      onResponder: () => undefined,
      onEditar: () => undefined,
      onCancelar,
    }),
  );
}

describe('el detalle', () => {
  // spec 044 FR-016, FR-019, FR-035
  it('el invitado ve «Te invitó…» y nada de la audiencia', () => {
    mockFresco = evento({ organizador: { id: 'lider', nombre: 'Rocío Díaz', fotoUrl: null, rol: 'Líder de mentores', grupo: null } });
    const r = detalle(evento());

    expect(hay(r, 'Te invitó Rocío, líder de mentores')).toBe(true);
    expect(hay(r, 'Para quién es')).toBe(false);
    expect(hay(r, 'Administrar')).toBe(false);
    expect(textos(r).join(' ').toLowerCase()).not.toMatch(/rojo|semáforo/);
  });

  // spec 044 FR-035, FR-018, FR-006
  it('quien lo creó (o lo gestiona) ve «Para quién es» con sus cifras y puede administrarlo', () => {
    mockFresco = evento({
      audienciaElegida: {
        total: 17,
        partes: [
          { tipo: 'TRAFFIC_LIGHT', id: null, nombre: null, color: 'RED', cuantos: 15, resueltoEn: '2026-11-06T15:00:00Z', personas: [] },
          { tipo: 'PERSON', id: null, nombre: null, color: null, cuantos: 2, resueltoEn: null,
            personas: [{ id: 'a', nombre: 'Rosa Quispe', fotoUrl: null, rol: null, grupo: null }, { id: 'b', nombre: 'Jorge Torres', fotoUrl: null, rol: null, grupo: null }] },
          { tipo: 'STAFF', id: null, nombre: null, color: null, cuantos: 1, resueltoEn: null,
            personas: [{ id: 'c', nombre: 'Elena Alquimista', fotoUrl: null, rol: null, grupo: null }] },
        ],
      },
    });
    const r = detalle(evento());

    expect(hay(r, 'Para quién es')).toBe(true);
    expect(hay(r, 'Solo lo ves tú')).toBe(true);
    expect(hay(r, 'Rojo')).toBe(true);
    expect(hay(r, 'Según el semáforo del 6 de noviembre')).toBe(true);
    expect(hay(r, 'Personas')).toBe(true);
    expect(hay(r, 'Rosa Quispe, Jorge Torres')).toBe(true);
    expect(hay(r, 'Personal')).toBe(true);
    expect(hay(r, 'Elena Alquimista')).toBe(true);
    expect(hay(r, 'Llega a 17 personas')).toBe(true);
    expect(hay(r, 'Administrar')).toBe(true);
  });
});

describe('Eventos del líder (spec 053)', () => {
  const delLider: OpcionesDeAudiencia = {
    ...delMentor,
    partes: ['PERSON', 'GROUP', 'MENTORS', 'TRAFFIC_LIGHT', 'STAFF'],
    tiposDeEvento: ['SESION_PERSONALIZADA'],
    porDefecto: null,
  };

  // spec 053 FR-003
  it('el líder no elige tipo: ve «Sesión personalizada» fija y lo que guarda lleva ese tipo', () => {
    const guardar = jest.fn();
    const r = formulario(delLider, guardar);

    expect(hay(r, 'Sesión personalizada')).toBe(true);
    expect(hay(r, 'Sesión especial')).toBe(false);
    expect(hay(r, 'Encuentro espontáneo')).toBe(false);
    expect(r.root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.checked !== undefined && n.props.accessibilityLabel === 'Tipo: Sesión personalizada')).toHaveLength(0);

    act(() => conEtiqueta(r, 'Crear evento')!.props.onPress());
    expect(guardar).toHaveBeenCalledTimes(1);
    expect((guardar.mock.calls[0][0] as { tipoEvento: string }).tipoEvento).toBe('SESION_PERSONALIZADA');
  });

  // spec 053 FR-003
  it('el mentor sigue eligiendo entre sus dos tipos', () => {
    const r = formulario(delMentor);
    expect(hay(r, 'Sesión especial')).toBe(true);
    expect(hay(r, 'Encuentro espontáneo')).toBe(true);
    expect(hay(r, 'Sesión personalizada')).toBe(false);
  });

  // spec 053 FR-006
  it('«Por semáforo» dice que es el de ayer', () => {
    const r = formulario(delLider);
    act(() => conEtiqueta(r, 'Por semáforo')!.props.onPress());
    expect(hay(r, 'Según el semáforo de ayer.')).toBe(true);
    expect(hay(r, '· hoy')).toBe(false);
  });

  // spec 053 FR-007, FR-008
  it('«Repetir» sale apagado; al prenderlo marca el día de la fecha, sugiere 4 semanas y lo dice en palabras', () => {
    const r = formulario(delLider);
    expect(conEtiqueta(r, 'sábado')).toBeUndefined();

    act(() => {
      const sw = r.root.findAll(n => n.props.accessibilityLabel === 'Repetir' && typeof n.props.onPress === 'function')[0];
      sw?.props.onPress();
    });

    // mañana de AHORA (6 de noviembre de 2026) es sábado 7.
    expect(conEtiqueta(r, 'sábado')?.props.accessibilityState).toEqual({ checked: true });
    expect(hay(r, 'Se repite sábado, 4 semanas, hasta el 4 de diciembre.')).toBe(true);
  });
});

describe('Cancelar una serie (spec 053, FR-014)', () => {
  beforeEach(() => {
    mockAlertas.length = 0;
  });

  // spec 053 FR-014
  it('en un evento que se repite pregunta «¿Solo esta sesión o esta y las siguientes?» y entrega cada alcance', () => {
    const e = evento({ recurrente: true, creadoPor: 'yo' });
    mockFresco = e;
    const alcances: string[] = [];
    const r = detalle(e, a => alcances.push(a), true);

    act(() => conEtiqueta(r, 'Cancelar esta sesión')!.props.onPress());

    expect(mockAlertas[0].titulo).toBe('¿Solo esta sesión o esta y las siguientes?');
    expect(mockAlertas[0].botones.map(b => b.text)).toEqual(['Solo esta sesión', 'Esta y las siguientes', 'No, dejarlo']);
    mockAlertas[0].botones[0].onPress?.();
    mockAlertas[0].botones[1].onPress?.();
    expect(alcances).toEqual(['esta', 'siguientes']);
  });

  // spec 053 FR-014
  it('«Cancelar todas las fechas» sigue ahí y un evento suelto no pregunta por «las siguientes»', () => {
    const serie = evento({ recurrente: true });
    mockFresco = serie;
    expect(hay(detalle(serie, () => undefined, true), 'Cancelar todas las fechas')).toBe(true);
    const suelto = evento({ recurrente: false });
    mockFresco = suelto;
    const r = detalle(suelto, () => undefined, true);
    expect(conEtiqueta(r, 'Cancelar esta sesión')).toBeUndefined();
    expect(hay(r, 'Cancelar evento')).toBe(true);
  });
});
