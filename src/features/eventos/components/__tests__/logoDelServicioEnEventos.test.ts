/**
 * El logo del servicio junto al «dónde» de un evento (2026-10-05, `LogoDeMarca` con los SVG de
 * svgl): Google Meet, Zoom o Google Drive llevan su logo; un enlace sin marca sigue con `play` y una
 * dirección con `users`, como antes. El logo es decorativo: el nombre ya está escrito al lado y la
 * etiqueta accesible de la tarjeta no cambia.
 *
 * Contra el código anterior fallan las que buscan `LogoDeMarca`: la tarjeta dibujaba `play` para
 * cualquier link y el detalle solo decía «Es por Google Meet.».
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../academy/components/CursoPortada', () => ({ CursoPortada: () => null }));

import { Icon } from '../../../../components/Icon';
import { LogoDeMarca } from '../../../../components/LogoDeMarca';
import type { Evento, Ocurrencia, TipoUbicacion } from '../../types/eventos.types';
import { marcaDelLink, nombreDelLink } from '../../utils/linkDelEvento';
import { CalendarioDelMes } from '../CalendarioDelMes';
import { DetalleDelEvento } from '../DetalleDelEvento';
import { TarjetasDeEventos } from '../TarjetasDeEventos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ZONA = 'America/Lima';
// 2026-10-05 10:00 en Lima; los eventos son al día siguiente.
const AHORA = Date.parse('2026-10-05T15:00:00Z');

function ocurrencia(id: string, tipoUbicacion: TipoUbicacion, valorUbicacion: string | null): Ocurrencia {
  const evento: Evento = {
    id,
    titulo: `Evento ${id}`,
    descripcion: null,
    portadaUrl: null,
    iniciaEn: '2026-10-06T00:00:00Z',
    duracionMinutos: 60,
    zona: ZONA,
    tipoUbicacion,
    valorUbicacion,
    tipoEvento: 'ESPONTANEO',
    reglasDeAviso: null,
    notificarAlCrear: false,
    recurrente: false,
    creadoPor: null,
    audiencia: null,
    rolesDestino: [],
  };
  return {
    evento,
    inicioOcurrencia: '2026-10-06T00:00:00Z',
    iniciaEn: '2026-10-06T00:00:00Z',
    duracionMinutos: 60,
    titulo: evento.titulo,
    asistencia: null,
  };
}

// Se desmonta todo al terminar cada prueba: el detalle usa `useAhora`, cuyo `setInterval` de 30 s
// seguía vivo y volvía a dibujar con el entorno de Jest ya cerrado; Jest salía con código 1 aunque
// las pruebas pasaran (E-570).
const dibujados: ReactTestRenderer[] = [];

afterEach(() => {
  act(() => dibujados.splice(0).forEach(r => r.unmount()));
});

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  dibujados.push(raiz);
  return raiz;
}

const logos = (raiz: ReactTestRenderer) => raiz.root.findAll(n => n.type === LogoDeMarca).map(l => l.props);

describe('marcaDelLink', () => {
  it('Meet, Zoom y Drive tienen logo; el resto, no', () => {
    expect(marcaDelLink('https://meet.google.com/abc-defg-hij')).toBe('googleMeet');
    expect(marcaDelLink('https://us02web.zoom.us/j/123?pwd=x')).toBe('zoom');
    expect(marcaDelLink('https://zoom.us/j/1')).toBe('zoom');
    expect(marcaDelLink('https://drive.google.com/file/d/1/view')).toBe('googleDrive');
    expect(marcaDelLink('https://docs.google.com/document/d/1')).toBe('googleDrive');
    expect(marcaDelLink('https://ejemplo.com/clase')).toBeNull();
    // Un dominio que solo se PARECE no se lleva el logo de nadie.
    expect(marcaDelLink('https://meet.google.com.ejemplo.com/x')).toBeNull();
    expect(marcaDelLink('https://falsozoom.us/j/1')).toBeNull();
  });

  it('el logo y el nombre escrito dicen el mismo servicio', () => {
    const nombres = { googleMeet: 'Google Meet', zoom: 'Zoom', googleDrive: 'Google Drive' } as const;
    for (const link of ['https://meet.google.com/x', 'https://a.zoom.us/j/1', 'https://drive.google.com/x', 'https://ejemplo.com']) {
      const marca = marcaDelLink(link);
      expect(nombreDelLink(link)).toBe(marca ? nombres[marca as keyof typeof nombres] : 'Enlace');
    }
  });
});

describe('Tarjetas de eventos', () => {
  it('cada evento con su logo, y los que no tienen marca con el ícono de siempre', () => {
    const raiz = dibujar(
      React.createElement(TarjetasDeEventos, {
        ocurrencias: [
          ocurrencia('meet', 'MEET', 'https://meet.google.com/abc-defg-hij'),
          ocurrencia('zoom', 'ZOOM', 'https://us02web.zoom.us/j/123'),
          ocurrencia('drive', 'LINK', 'https://drive.google.com/file/d/1/view'),
          ocurrencia('web', 'LINK', 'https://ejemplo.com/clase'),
          ocurrencia('casa', 'ADDRESS', 'Av. Larco 123, Miraflores'),
        ],
        zona: ZONA,
        ahoraMs: AHORA,
        onAbrir: () => undefined,
      })
    );
    expect(logos(raiz)).toEqual([
      { marca: 'googleMeet', size: 18, decorativo: true },
      { marca: 'zoom', size: 18, decorativo: true },
      { marca: 'googleDrive', size: 18, decorativo: true },
    ]);
    const iconosDelDonde = raiz.root.findAll(n => n.type === Icon && n.props.size === 18).map(i => i.props.name);
    expect(iconosDelDonde).toEqual(['play', 'users']);
  });

  it('la etiqueta accesible de la tarjeta no cambia: sigue nombrando el servicio', () => {
    const raiz = dibujar(
      React.createElement(TarjetasDeEventos, {
        ocurrencias: [ocurrencia('meet', 'MEET', 'https://meet.google.com/abc-defg-hij')],
        zona: ZONA,
        ahoraMs: AHORA,
        onAbrir: () => undefined,
      })
    );
    const tarjeta = raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityRole === 'button')[0];
    expect(tarjeta.props.accessibilityLabel).toContain('Google Meet.');
  });
});

describe('Detalle del evento', () => {
  const detalle = (oc: Ocurrencia) =>
    dibujar(
      React.createElement(DetalleDelEvento, {
        oc,
        puedeGestionar: false,
        enviando: false,
        onVolver: () => undefined,
        onResponder: () => undefined,
        onEditar: () => undefined,
        onCancelar: () => undefined,
      })
    );

  it('«Es por Zoom.» con el logo de Zoom al lado', () => {
    const raiz = detalle(ocurrencia('zoom', 'ZOOM', 'https://us02web.zoom.us/j/123'));
    expect(logos(raiz)).toEqual([{ marca: 'zoom', size: 20, decorativo: true }]);
  });

  it('un enlace sin marca no lleva logo', () => {
    expect(logos(detalle(ocurrencia('web', 'LINK', 'https://ejemplo.com/clase')))).toEqual([]);
  });
});

describe('Calendario: los eventos del día elegido', () => {
  it('Meet con su logo; la dirección, sin logo', () => {
    const raiz = dibujar(
      React.createElement(CalendarioDelMes, {
        mes: { anio: 2026, mes: 10 },
        hoyIso: '2026-10-05',
        porDia: {
          '2026-10-05': [
            ocurrencia('meet', 'MEET', 'https://meet.google.com/abc-defg-hij'),
            ocurrencia('casa', 'ADDRESS', 'Av. Larco 123, Miraflores'),
          ],
        },
        diaElegido: '2026-10-05',
        zona: ZONA,
        cargando: false,
        fallo: false,
        onCambiarMes: () => undefined,
        onHoy: () => undefined,
        onElegirDia: () => undefined,
        onReintentar: () => undefined,
        onAbrir: () => undefined,
      })
    );
    expect(logos(raiz)).toEqual([{ marca: 'googleMeet', size: 16, decorativo: true }]);
  });
});
