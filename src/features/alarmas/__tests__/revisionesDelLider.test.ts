import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockAcompana = true;
jest.mock('../../mentor/hooks/useEsMentor', () => ({ useEsMentor: () => mockAcompana }));
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

import { guardarTema, TEMAS, temasVisibles } from '../api/preferenciasDeNotificacion';
import { InterruptoresDeAvisos } from '../components/InterruptoresDeAvisos';
import { destinoDeRuta } from '../../mentor/api/avisosApi';
import { ROL_MENTOR } from '../../mentor/types/mentor.types';

/**
 * «Revisiones de tu líder» (spec 005, US4, T045): el aviso de las 20:00 que recibe el mentor cuando su líder
 * revisó a alguien de su grupo. El interruptor está en Yo → Notificaciones, **solo para quien acompaña un
 * grupo**, guarda el tema `REVISION_DEL_LIDER` y, contra un backend que todavía no lo conoce, no se ofrece.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockAcompana = true;
});

const TODAS = [
  'MENSAJE_CHAT', 'RECORDATORIO_EVENTO', 'LOGRO_DESBLOQUEADO', 'HITO_PROGRAMA', 'RESUMEN_SEMANAL', 'REVISION_DEL_LIDER',
].map(type => ({ type, enabled: true }));

const prefs = (tipos: string[], apagados: string[] = []) =>
  Object.fromEntries(tipos.map(t => [t, !apagados.includes(t)]));

describe('el interruptor «Revisiones de tu líder»', () => {
  it('lo ve quien acompaña un grupo, al final de la lista', () => {
    const temas = temasVisibles(prefs(TODAS.map(p => p.type)), { acompanaUnGrupo: true });
    expect(temas.map(t => t.nombre)).toEqual([
      'Mensajes',
      'Eventos y clases',
      'Logros',
      'Resumen semanal',
      'Revisiones de tu líder',
    ]);
  });

  it('quien no acompaña un grupo no lo ve, aunque el servidor lo liste (y sin decirlo, tampoco)', () => {
    const todas = prefs(TODAS.map(p => p.type));
    expect(temasVisibles(todas, { acompanaUnGrupo: false }).map(t => t.clave)).not.toContain('revisiones');
    expect(temasVisibles(todas).map(t => t.clave)).not.toContain('revisiones');
  });

  it('contra un backend que todavía no conoce el tipo, no se ofrece ni a un mentor', () => {
    const sinElTipo = prefs(['MENSAJE_CHAT', 'RESUMEN_SEMANAL']);
    expect(temasVisibles(sinElTipo, { acompanaUnGrupo: true }).map(t => t.clave)).toEqual(['mensajes', 'resumen']);
  });

  it('refleja lo que el servidor tiene guardado: apagado se ve apagado', () => {
    const apagado = temasVisibles(prefs(['REVISION_DEL_LIDER'], ['REVISION_DEL_LIDER']), { acompanaUnGrupo: true });
    expect(apagado).toHaveLength(1);
    expect(apagado[0]).toMatchObject({ clave: 'revisiones', encendido: false });
  });

  it('se guarda como `REVISION_DEL_LIDER` y solo ese tipo', async () => {
    mockApiFetch.mockResolvedValueOnce({ preferences: [{ type: 'REVISION_DEL_LIDER', enabled: false }] });
    const tema = TEMAS.find(t => t.clave === 'revisiones')!;
    expect(tema.tipos).toEqual(['REVISION_DEL_LIDER']);
    await guardarTema(tema, false);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/notification-preferences', {
      method: 'PATCH',
      body: { preferences: [{ type: 'REVISION_DEL_LIDER', enabled: false }] },
    });
  });

  it('los demás interruptores no cambian de lugar ni de nombre', () => {
    expect(TEMAS.slice(0, 4).map(t => t.nombre)).toEqual(['Mensajes', 'Eventos y clases', 'Logros', 'Resumen semanal']);
  });
});

describe('quién acompaña un grupo en la app', () => {
  it('el mentor, la guía de aprendiz y el líder (el servidor decide a quién le llega el aviso)', () => {
    for (const rol of ['MENTOR', 'TRAINEE_GUIDE', 'GUIA_APRENDIZ', 'MENTOR_LEAD', 'LIDER_MENTORES']) {
      expect((ROL_MENTOR as readonly string[]).includes(rol)).toBe(true);
    }
    expect((ROL_MENTOR as readonly string[]).includes('TRAINEE')).toBe(false);
  });
});

describe('tocar el aviso «Tu líder revisó a tu grupo»', () => {
  it('abre «Mi grupo» en su semáforo: la ruta es `/mentor/groups/{g}/semaforo`', () => {
    expect(destinoDeRuta('/mentor/groups/g-7/semaforo')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-7' });
  });
});

describe('Yo → Notificaciones', () => {
  async function verNotificaciones(): Promise<string> {
    mockApiFetch.mockResolvedValue({ preferences: TODAS });
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(InterruptoresDeAvisos));
    });
    return r.root
      .findAll(n => (n.type as unknown) === 'Text')
      .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
      .join(' | ');
  }

  it('un mentor ve el interruptor con su explicación', async () => {
    const texto = await verNotificaciones();
    expect(texto).toContain('Revisiones de tu líder');
    expect(texto).toContain('Un aviso a las 8 de la noche si tu líder revisó a alguien de tu grupo');
  });

  it('un aprendiz no lo ve, y los de siempre siguen ahí', async () => {
    mockAcompana = false;
    const texto = await verNotificaciones();
    expect(texto).not.toContain('Revisiones de tu líder');
    expect(texto).toContain('Resumen semanal');
  });
});
