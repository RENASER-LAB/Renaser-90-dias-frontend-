/**
 * El último botón de «Pasar lista», de la lista cerrada y del detalle del evento no puede quedar debajo
 * de los flotantes de SER: el orbe (`RenasiaLauncher`) y la burbuja «✳ SER» del arranque guiado
 * (`SparkieOverlay`), que van contra el borde de la PANTALLA. Con la barra de pestañas escondida
 * («Cerrar la lista» bajo la burbuja, captura del 2026-10-06) el relleno de Comunidad no alcanzaba.
 *
 * Contra el código anterior fallan las tres pantallas: no había ningún espacio después del último botón.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');
  return { SafeAreaInsetsContext: createContext({ top: 0, right: 0, bottom: 24, left: 0 }) };
});

import { ALTO_TAB_BAR, DIAMETRO, ESPACIO_PARA_LANZADOR, SEPARACION } from '../../../renasia/components/lugarDelLanzador';
import type { ListaDeAsistencia, PersonaDeLaLista } from '../../types/asistencia.types';
import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { COLA_VACIA } from '../../utils/colaDeMarcas';
import { alturaSobreFlotantes, rellenoExtraAlPie } from '../asistencia/EspacioSobreFlotantes';
import { ListaCerrada } from '../asistencia/ListaCerrada';
import { PasarLista } from '../asistencia/PasarLista';
import { DetalleDelEvento } from '../DetalleDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const INSET = 24;
/** Borde de arriba de los flotantes, medido desde el borde de abajo de la pantalla. */
const TECHO_DE_LOS_FLOTANTES = INSET + ALTO_TAB_BAR + SEPARACION + DIAMETRO;

const evento: Evento = {
  id: 'ev', titulo: 'Mentoría del Alquimista', descripcion: null, portadaUrl: null, iniciaEn: '2026-10-06T01:00:00Z',
  duracionMinutos: 60, zona: 'America/Lima', tipoUbicacion: 'ADDRESS', valorUbicacion: 'Sala 1', tipoEvento: 'ESPONTANEO',
  reglasDeAviso: null, notificarAlCrear: false, recurrente: false, creadoPor: null, audiencia: null, rolesDestino: [],
};
const oc: Ocurrencia = {
  evento, inicioOcurrencia: evento.iniciaEn, iniciaEn: evento.iniciaEn, duracionMinutos: 60, titulo: evento.titulo, asistencia: null,
};
const ana: PersonaDeLaLista = {
  id: 'a', nombre: 'Ana Ríos', avatarUrl: null, respuesta: 'GOING', respondidaEn: null, llegada: 'A_TIEMPO', marcadaEn: '2026-10-06T01:02:00Z',
};
const lista = (abierta: boolean): ListaDeAsistencia => ({
  inicioOcurrencia: evento.iniciaEn, abreEn: '2026-10-06T00:30:00Z', cierraEn: '2026-10-06T14:00:00Z', abierta,
  cerrada: abierta ? null : { en: '2026-10-06T02:06:00Z', porId: 'k', porNombre: 'Kelin Rojas' }, personas: [ana],
});
const AHORA = Date.parse('2026-10-06T01:20:00Z');

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz;
}


function espacioDespuesDe(raiz: ReactTestRenderer, ultimoBoton: string): number {
  const nodos: ReactTestInstance[] = raiz.root.findAll(() => true); // en orden de documento
  const boton = nodos.findIndex(n => n.type === Text && n.props.children === ultimoBoton);
  const espacio = nodos.findIndex(n => n.props.testID === 'espacio-sobre-flotantes');
  expect(boton).toBeGreaterThan(-1);
  expect(espacio).toBeGreaterThan(boton);
  const alto = nodos[espacio].props.style.height as number;
  act(() => raiz.unmount());
  return alto;
}

describe('el pie no queda debajo de los flotantes de SER (D-256)', () => {
  it('el espacio más el relleno de Comunidad llegan por encima de los flotantes, con la barra escondida', () => {
    expect(rellenoExtraAlPie(INSET) + ESPACIO_PARA_LANZADOR).toBeGreaterThanOrEqual(TECHO_DE_LOS_FLOTANTES);
    expect(alturaSobreFlotantes(INSET)).toBeGreaterThan(TECHO_DE_LOS_FLOTANTES);
  });

  it('«Pasar lista»: después de «Cerrar la lista»', () => {
    const raiz = dibujar(
      React.createElement(PasarLista, {
        oc, lista: lista(true), pendientes: COLA_VACIA, hayPendientes: false, ocupada: false, ahoraMs: AHORA,
        onVolver: () => undefined, onMarcar: () => undefined, onCerrar: () => undefined,
      }),
    );
    expect(espacioDespuesDe(raiz, 'Cerrar la lista')).toBe(rellenoExtraAlPie(INSET));
  });

  it('lista cerrada: después de «Corregir» y «Compartir»', () => {
    const raiz = dibujar(
      React.createElement(ListaCerrada, {
        oc, lista: lista(false), momento: 'cerrada', ahoraMs: AHORA, ocupada: false,
        onVolver: () => undefined, onCorregir: () => undefined, onCompartir: () => undefined,
      }),
    );
    expect(espacioDespuesDe(raiz, 'Compartir')).toBe(rellenoExtraAlPie(INSET));
  });

  it('detalle del evento: después de «Cancelar evento»', () => {
    const raiz = dibujar(
      React.createElement(DetalleDelEvento, {
        oc, puedeGestionar: true, enviando: false, onVolver: () => undefined, onResponder: () => undefined,
        onEditar: () => undefined, onCancelar: () => undefined,
      }),
    );
    expect(espacioDespuesDe(raiz, 'Cancelar evento')).toBe(rellenoExtraAlPie(INSET));
  });
});
