import { describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones as { method?: string; body?: unknown }),
}));

import { guardarTema, TEMAS, temasVisibles } from '../api/preferenciasDeNotificacion';

/**
 * «Análisis de tu 80/20» (spec 031, FR-024): el interruptor de Yo → Notificaciones del aviso «tu análisis está listo». Guarda el tipo
 * `ANALISIS_80_20`, va al final de la lista para todos los que hacen su programa y, contra un servidor que todavía no lo conoce, no
 * se ofrece. El aviso nunca lleva el análisis: su texto es fijo.
 */

const prefs = (tipos: string[], apagados: string[] = []) => Object.fromEntries(tipos.map(t => [t, !apagados.includes(t)]));

describe('el interruptor «Análisis de tu 80/20»', () => {
  it('se ofrece a quien el servidor se lo lista, sin importar si acompaña un grupo', () => {
    const todas = prefs(['MENSAJE_CHAT', 'RECORDATORIO_EVENTO', 'LOGRO_DESBLOQUEADO', 'RESUMEN_SEMANAL', 'ANALISIS_80_20']);
    expect(temasVisibles(todas, { acompanaUnGrupo: false }).map(t => t.clave)).toContain('analisis');
    expect(temasVisibles(todas, { acompanaUnGrupo: true }).map(t => t.clave)).toContain('analisis');
  });

  it('contra un servidor que no conoce el tipo no se ofrece', () => {
    expect(temasVisibles(prefs(['MENSAJE_CHAT', 'RESUMEN_SEMANAL'])).map(t => t.clave)).not.toContain('analisis');
  });

  it('refleja lo guardado: apagado se ve apagado', () => {
    const tema = temasVisibles(prefs(['ANALISIS_80_20'], ['ANALISIS_80_20']))[0];
    expect(tema).toMatchObject({ clave: 'analisis', nombre: 'Análisis de tu 80/20', encendido: false });
  });

  it('se guarda como `ANALISIS_80_20` y solo ese tipo', async () => {
    mockApiFetch.mockResolvedValueOnce({ preferences: [{ type: 'ANALISIS_80_20', enabled: false }] });
    const tema = TEMAS.find(t => t.clave === 'analisis')!;
    expect(tema.tipos).toEqual(['ANALISIS_80_20']);
    await guardarTema(tema, false);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/notification-preferences', {
      method: 'PATCH',
      body: { preferences: [{ type: 'ANALISIS_80_20', enabled: false }] },
    });
  });

  it('los otros cinco interruptores no cambian de lugar ni de nombre', () => {
    expect(TEMAS.slice(0, 5).map(t => t.nombre)).toEqual(['Mensajes', 'Eventos y clases', 'Logros', 'Resumen semanal', 'Revisiones de tu líder']);
  });
});
