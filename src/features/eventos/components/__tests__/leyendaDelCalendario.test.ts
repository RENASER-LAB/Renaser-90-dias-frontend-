/**
 * La leyenda bajo el mes de Comunidad → Eventos → Calendario (2026-11-03). Decía «Hay evento» (cortado en un teléfono angosto) y
 * «Vas». El dueño: «El lenguaje se fue, hay que ponerle allí, por ejemplo, Actividad programada / Confirmé asistencia».
 *
 * Y la barra de crear publicación del Muro: bajo «¿Qué conquistaste hoy, <nombre>?» decía «Publicación sin límite de caracteres ›»;
 * el dueño pidió «Queremos leerte y acompañarte».
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { CalendarioDelMes, LEYENDA_ACTIVIDAD_PROGRAMADA, LEYENDA_ASISTENCIA_CONFIRMADA } from '../CalendarioDelMes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

const EVENTO = {
  id: 'ev-1', titulo: 'Sesión', descripcion: null, portadaUrl: null, iniciaEn: '2026-11-05T15:00:00Z', duracionMinutos: 60, zona: 'America/Lima',
  tipoUbicacion: 'LINK', valorUbicacion: 'https://meet.google.com/abc', tipoEvento: 'ESPONTANEO', reglasDeAviso: null, notificarAlCrear: false,
  recurrente: false, creadoPor: null, audiencia: null, rolesDestino: [],
} as unknown as Evento;
const ocurrencia = (asistencia: Ocurrencia['asistencia'], id = 'ev-1'): Ocurrencia => ({
  evento: { ...EVENTO, id }, inicioOcurrencia: EVENTO.iniciaEn, iniciaEn: EVENTO.iniciaEn, duracionMinutos: 60, titulo: 'Sesión', asistencia,
});

function montar(porDia: Record<string, Ocurrencia[]> = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(CalendarioDelMes, {
        mes: { anio: 2026, mes: 11 },
        hoyIso: '2026-11-03',
        porDia,
        diaElegido: '2026-11-03',
        zona: 'America/Lima',
        cargando: false,
        fallo: false,
        onCambiarMes: () => undefined,
        onHoy: () => undefined,
        onElegirDia: () => undefined,
        onReintentar: () => undefined,
        onAbrir: () => undefined,
      }),
    );
  });
  montadas.push(r);
  return r;
}
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Text').map(n => React.Children.toArray(n.props.children).filter(x => typeof x === 'string').join(''));
const textoDe = (r: ReactTestRenderer, palabras: string) => r.root.findAll(n => (n.type as unknown) === 'Text' && String(n.props.children) === palabras)[0];

describe('la leyenda del calendario', () => {
  it('dice «Actividad programada» (punto dorado) y «Confirmé asistencia» (punto verde), no «Hay evento» ni «Vas»', () => {
    const t = textos(montar());
    expect(t).toContain('Actividad programada');
    expect(t).toContain('Confirmé asistencia');
    expect(LEYENDA_ACTIVIDAD_PROGRAMADA).toBe('Actividad programada');
    expect(LEYENDA_ASISTENCIA_CONFIRMADA).toBe('Confirmé asistencia');
    expect(t).not.toContain('Hay evento');
    expect(t).not.toContain('Vas');
  });

  it('cabe en un renglón y, si no, baja a dos: las piezas envuelven y ningún texto se corta ni se recorta con «…»', () => {
    const r = montar();
    const a = textoDe(r, 'Actividad programada');
    const b = textoDe(r, 'Confirmé asistencia');
    for (const texto of [a, b]) {
      expect(texto.props.numberOfLines).toBeUndefined();
      expect(texto.props.ellipsizeMode).toBeUndefined();
      expect(StyleSheet.flatten(texto.props.style).flexShrink).toBe(1);
    }
    // El contenedor de las dos piezas envuelve (dos renglones si no caben) y cada pieza es un punto con su palabra.
    const [contenedor] = r.root.findAll(n => (n.type as unknown) === 'View' && StyleSheet.flatten(n.props.style)?.flexWrap === 'wrap');
    expect(StyleSheet.flatten(contenedor.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(contenedor.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children))).toEqual([
      'Actividad programada',
      'Confirmé asistencia',
    ]);
    const piezas = contenedor.findAll(n => (n.type as unknown) === 'View' && StyleSheet.flatten(n.props.style)?.flexShrink === 1);
    expect(piezas).toHaveLength(2);
  });

  it('la letra de la leyenda es de 14', () => {
    expect(StyleSheet.flatten(textoDe(montar(), 'Actividad programada').props.style).fontSize).toBe(14);
  });
});

describe('lo que oye el lector de pantalla en los días', () => {
  const etiquetaDe = (r: ReactTestRenderer, empieza: string): string => {
    const [dia] = r.root.findAll((n: ReactTestInstance) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(empieza));
    return dia.props.accessibilityLabel as string;
  };

  it('un día con una actividad: «1 actividad programada»; con asistencia confirmada suma «confirmaste asistencia»', () => {
    const r = montar({ '2026-11-05': [ocurrencia(null)], '2026-11-06': [ocurrencia('GOING', 'ev-2')] });
    expect(etiquetaDe(r, 'Jueves 5 de noviembre')).toMatch(/1 actividad programada$/);
    expect(etiquetaDe(r, 'Viernes 6 de noviembre')).toMatch(/1 actividad programada, confirmaste asistencia$/);
  });

  it('varios: «2 actividades programadas»; ninguno: «sin actividad programada»', () => {
    const r = montar({ '2026-11-05': [ocurrencia(null), ocurrencia(null, 'ev-2')] });
    expect(etiquetaDe(r, 'Jueves 5 de noviembre')).toMatch(/2 actividades programadas$/);
    expect(etiquetaDe(r, 'Sábado 7 de noviembre')).toMatch(/sin actividad programada$/);
  });

  it('ya no dice «evento» ni «vas» en los días', () => {
    const r = montar({ '2026-11-06': [ocurrencia('GOING')] });
    const etiquetas = r.root
      .findAll((n: ReactTestInstance) => typeof n.props.accessibilityLabel === 'string' && /actividad/.test(n.props.accessibilityLabel))
      .map((n: ReactTestInstance) => n.props.accessibilityLabel as string);
    expect(etiquetas.length).toBeGreaterThan(20);
    for (const e of etiquetas) {
      expect(e).not.toMatch(/\bevento/);
      expect(e).not.toMatch(/, vas\b/);
    }
  });
});

describe('la barra de crear publicación del Muro', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf8');

  it('dice «Queremos leerte y acompañarte ›» bajo «¿Qué conquistaste hoy, …?»', () => {
    expect(fuente).toContain('¿Qué conquistaste hoy, {primerNombreUsuario}?');
    expect(fuente).toMatch(/Queremos leerte y acompañarte ›/);
  });

  it('ya no dice «Publicación sin límite de caracteres»', () => {
    expect(fuente).not.toMatch(/<Text[^>]*>\s*Publicación sin límite de caracteres/);
  });
});
