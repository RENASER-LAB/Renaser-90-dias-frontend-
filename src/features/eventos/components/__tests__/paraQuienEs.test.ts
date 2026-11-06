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
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
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
    expect(hay(r, 'Tus alumnos por semáforo · hoy')).toBe(true);
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

function detalle(e: Evento) {
  const oc: Ocurrencia = { evento: e, inicioOcurrencia: e.iniciaEn, iniciaEn: e.iniciaEn, duracionMinutos: 60, titulo: e.titulo, asistencia: null };
  return montar(
    React.createElement(DetalleDelEvento, {
      oc,
      puedeGestionar: false,
      enviando: false,
      onVolver: () => undefined,
      onResponder: () => undefined,
      onEditar: () => undefined,
      onCancelar: () => undefined,
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
        ],
      },
    });
    const r = detalle(evento());

    expect(hay(r, 'Para quién es')).toBe(true);
    expect(hay(r, 'Solo lo ves tú')).toBe(true);
    expect(hay(r, 'Rojo')).toBe(true);
    expect(hay(r, 'Según el semáforo del 6 de noviembre')).toBe(true);
    expect(hay(r, 'Rosa Quispe, Jorge Torres')).toBe(true);
    expect(hay(r, 'Llega a 17 personas')).toBe(true);
    expect(hay(r, 'Administrar')).toBe(true);
  });
});
