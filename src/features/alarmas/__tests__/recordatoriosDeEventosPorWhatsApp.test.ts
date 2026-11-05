import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../mentor/hooks/useEsMentor', () => ({ useEsMentor: () => false }));
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined } }));

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones as { method?: string; body?: unknown }),
}));

const mockLeerWhatsapp = jest.fn<() => Promise<string | null>>();
jest.mock('../../yo/api/whatsappDelPerfilApi', () => ({ leerWhatsappDelPerfil: () => mockLeerWhatsapp() }));

import { guardarTema, TEMAS, temasVisibles } from '../api/preferenciasDeNotificacion';
import { InterruptoresDeAvisos } from '../components/InterruptoresDeAvisos';
import { lineaDelWhatsapp, numeroEnmascarado, numeroInternacional } from '../utils/whatsappDeLosAvisos';

/**
 * «Recordatorios de eventos por WhatsApp» (spec 041, FR-012 y FR-041): la baja del WhatsApp de los eventos como un interruptor más de Yo → Notificaciones.
 * Encendido de fábrica (sin fila en el servidor cuenta encendido), solo si el servidor lo lista, con a qué número se escribe (el de la ficha, enmascarado) o
 * dónde ponerlo, y apagarlo no toca el aviso de la app ni el mensaje del chat («Eventos y clases»).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOMBRE = 'Recordatorios de eventos por WhatsApp';
const DEL_SERVIDOR = ['MENSAJE_CHAT', 'RECORDATORIO_EVENTO', 'LOGRO_DESBLOQUEADO', 'HITO_PROGRAMA', 'RESUMEN_SEMANAL', 'RECORDATORIO_EVENTO_WHATSAPP'];
const lista = (tipos: string[] = DEL_SERVIDOR, apagados: string[] = []) => tipos.map(type => ({ type, enabled: !apagados.includes(type) }));
const prefs = (tipos: string[], apagados: string[] = []) => Object.fromEntries(tipos.map(t => [t, !apagados.includes(t)]));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockLeerWhatsapp.mockReset();
});

describe('el interruptor «Recordatorios de eventos por WhatsApp»', () => {
  // spec 041 FR-041
  it('va al final de la lista, sin mover los de siempre', () => {
    expect(TEMAS[TEMAS.length - 1]).toMatchObject({ clave: 'whatsapp', nombre: NOMBRE, tipos: ['RECORDATORIO_EVENTO_WHATSAPP'] });
    expect(TEMAS.slice(0, 5).map(t => t.nombre)).toEqual(['Mensajes', 'Eventos y clases', 'Logros', 'Resumen semanal', 'Revisiones de tu líder']);
  });

  // spec 041 FR-041
  it('solo se ofrece si el servidor lo lista: contra uno anterior no aparece', () => {
    expect(temasVisibles(prefs(DEL_SERVIDOR)).map(t => t.clave)).toContain('whatsapp');
    expect(temasVisibles(prefs(DEL_SERVIDOR.filter(t => t !== 'RECORDATORIO_EVENTO_WHATSAPP'))).map(t => t.clave)).not.toContain('whatsapp');
  });

  // spec 041 FR-012
  it('viene encendido de fábrica (el servidor cuenta encendido lo que no tiene fila) y refleja lo apagado', () => {
    expect(temasVisibles(prefs(DEL_SERVIDOR)).find(t => t.clave === 'whatsapp')).toMatchObject({ encendido: true });
    expect(temasVisibles(prefs(DEL_SERVIDOR, ['RECORDATORIO_EVENTO_WHATSAPP'])).find(t => t.clave === 'whatsapp')).toMatchObject({ encendido: false });
  });

  // spec 041 FR-012
  it('se guarda como `RECORDATORIO_EVENTO_WHATSAPP` y solo ese tipo: el aviso de la app («Eventos y clases») no se toca', async () => {
    mockApiFetch.mockResolvedValueOnce({ preferences: lista(DEL_SERVIDOR, ['RECORDATORIO_EVENTO_WHATSAPP']) });
    await guardarTema(TEMAS.find(t => t.clave === 'whatsapp')!, false);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/notification-preferences', {
      method: 'PATCH',
      body: { preferences: [{ type: 'RECORDATORIO_EVENTO_WHATSAPP', enabled: false }] },
    });
    expect(TEMAS.find(t => t.clave === 'eventos')!.tipos).toEqual(['RECORDATORIO_EVENTO']);
  });
});

describe('a qué número se le escribe', () => {
  // spec 041 FR-028, FR-041
  it('se muestra enmascarado como «+51 9•• ••• •21», nunca entero', () => {
    expect(numeroEnmascarado('+51 987654321')).toBe('+51 9•• ••• •21');
    expect(numeroEnmascarado('  +51 987 654 321 ')).toBe('+51 9•• ••• •21');
    expect(numeroEnmascarado('+1 (415) 555-2671')).toBe('+14 1•• ••• •71');
    expect(numeroEnmascarado('+51 987654321')).not.toContain('87654');
  });

  // spec 041 FR-013
  it('lo que no tiene forma de número internacional no es un número: el servidor tampoco le escribe', () => {
    for (const malo of [null, undefined, '', '987654321', '+51 98765', '+51 98765432a', 'pendiente', '+0 987654321']) {
      expect(numeroInternacional(malo)).toBeNull();
      expect(numeroEnmascarado(malo)).toBeNull();
    }
    expect(numeroInternacional('+51 987654321')).toBe('+51987654321');
  });

  // spec 041 FR-041
  it('con número dice cuál; sin número dice dónde ponerlo; mientras se lee o si falla no dice nada', () => {
    expect(lineaDelWhatsapp('listo', '+51 987654321')).toBe('Te escribimos al +51 9•• ••• •21.');
    expect(lineaDelWhatsapp('listo', null)).toBe('Agrega tu WhatsApp en Editar perfil.');
    expect(lineaDelWhatsapp('listo', 'pendiente')).toBe('Agrega tu WhatsApp en Editar perfil.');
    expect(lineaDelWhatsapp('cargando', '+51 987654321')).toBeNull();
    expect(lineaDelWhatsapp('error', null)).toBeNull();
  });
});

describe('Yo → Notificaciones', () => {
  async function ver(servidor: unknown = { preferences: lista() }): Promise<{ renderizado: ReactTestRenderer; texto: string }> {
    mockApiFetch.mockResolvedValue(servidor);
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(InterruptoresDeAvisos));
    });
    return { renderizado: r, texto: textoDe(r) };
  }

  function textoDe(r: ReactTestRenderer): string {
    return r.root
      .findAll(n => (n.type as unknown) === 'Text')
      .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
      .join(' | ');
  }

  // spec 041 FR-041
  it('la fila dice su nombre, qué avisos son y a qué número se escribe', async () => {
    mockLeerWhatsapp.mockResolvedValue('+51 987654321');

    const { texto } = await ver();

    expect(texto).toContain(NOMBRE);
    expect(texto).toContain('Un día, una hora, 30 y 10 minutos antes de los eventos a los que dijiste «Voy»');
    expect(texto).toContain('Te escribimos al +51 9•• ••• •21.');
    expect(texto).not.toContain('987654321');
  });

  // spec 041 FR-041
  it('sin WhatsApp en la ficha, la fila dice «Agrega tu WhatsApp en Editar perfil»', async () => {
    mockLeerWhatsapp.mockResolvedValue(null);

    const { texto } = await ver();

    expect(texto).toContain('Agrega tu WhatsApp en Editar perfil.');
  });

  // spec 041 FR-041
  it('si no se puede leer la ficha no se afirma nada del número, y la fila sigue ahí', async () => {
    mockLeerWhatsapp.mockRejectedValue(new Error('sin red'));

    const { texto } = await ver();

    expect(texto).toContain(NOMBRE);
    expect(texto).not.toContain('Te escribimos al');
    expect(texto).not.toContain('Agrega tu WhatsApp');
  });

  // spec 041 FR-041, FR-043
  it('contra un servidor anterior (sin el tipo) la fila no se ofrece y no se lee la ficha', async () => {
    const { texto } = await ver({ preferences: lista(DEL_SERVIDOR.filter(t => t !== 'RECORDATORIO_EVENTO_WHATSAPP')) });

    expect(texto).not.toContain(NOMBRE);
    expect(texto).toContain('Eventos y clases');
    expect(mockLeerWhatsapp).not.toHaveBeenCalled();
  });

  // spec 041 FR-012
  it('apagarlo guarda solo ese tipo y deja «Eventos y clases» encendido', async () => {
    mockLeerWhatsapp.mockResolvedValue('+51 987654321');
    const { renderizado } = await ver();
    mockApiFetch.mockResolvedValue({ preferences: lista(DEL_SERVIDOR, ['RECORDATORIO_EVENTO_WHATSAPP']) });

    const interruptor = renderizado.root.findAll(n => n.props.etiqueta === NOMBRE && typeof n.props.onCambiar === 'function')[0]!;
    await act(async () => {
      interruptor.props.onCambiar(false);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/notification-preferences', {
      method: 'PATCH',
      body: { preferences: [{ type: 'RECORDATORIO_EVENTO_WHATSAPP', enabled: false }] },
    });
    const eventos = renderizado.root.findAll(n => n.props.etiqueta === 'Eventos y clases' && typeof n.props.onCambiar === 'function')[0]!;
    expect(eventos.props.valor).toBe(true);
  });

  // spec 041 FR-041
  it('la ficha se lee una sola vez, no en cada toque', async () => {
    mockLeerWhatsapp.mockResolvedValue('+51 987654321');
    const { renderizado } = await ver();
    mockApiFetch.mockResolvedValue({ preferences: lista(DEL_SERVIDOR, ['MENSAJE_CHAT']) });
    const mensajes = renderizado.root.findAll(n => n.props.etiqueta === 'Mensajes' && typeof n.props.onCambiar === 'function')[0]!;

    await act(async () => {
      mensajes.props.onCambiar(false);
    });

    expect(mockLeerWhatsapp).toHaveBeenCalledTimes(1);
  });
});
