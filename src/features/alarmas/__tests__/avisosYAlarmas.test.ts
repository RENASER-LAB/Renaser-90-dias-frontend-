import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones as { method?: string; body?: unknown }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import appJson from '../../../../app.json';
import { guardarTema, obtenerPreferencias, TEMAS, temasVisibles } from '../api/preferenciasDeNotificacion';
import { leerPreferencias, PREFERENCIAS_POR_DEFECTO } from '../preferenciasDeAlarmas';
import { ARCHIVO_CAMPANA, canalDeAlarma } from '../sonidoDeAlarma';

beforeEach(() => {
  mockApiFetch.mockReset();
});

const TODAS = [
  'RECORDATORIO_HABITO', 'MENSAJE_CHAT', 'LOGRO_DESBLOQUEADO', 'HITO_PROGRAMA', 'RESUMEN_SEMANAL', 'RECORDATORIO_EVENTO',
];

describe('interruptores de Notificaciones (E-4)', () => {
  it('muestra «Mensajes», «Eventos y clases», «Logros» y «Resumen semanal»; nunca un tema «Hábitos» (decisión del dueño)', async () => {
    mockApiFetch.mockResolvedValueOnce({ preferences: TODAS.map(type => ({ type, enabled: true })) });
    const temas = temasVisibles(await obtenerPreferencias());
    // D-221 (2026-09-29): «Mensajes» apaga el aviso de cada mensaje de chat (`MENSAJE_CHAT`).
    expect(temas.map(t => t.nombre)).toEqual(['Mensajes', 'Eventos y clases', 'Logros', 'Resumen semanal']);
    expect(TEMAS.some(t => /h[áa]bito/i.test(t.nombre))).toBe(false);
  });

  it('«Mensajes» se guarda como MENSAJE_CHAT y refleja lo que dice el servidor', () => {
    const temas = temasVisibles({ MENSAJE_CHAT: false, RESUMEN_SEMANAL: true });
    expect(Object.fromEntries(temas.map(t => [t.clave, t.encendido]))).toEqual({ mensajes: false, resumen: true });
    expect(TEMAS.find(t => t.clave === 'mensajes')!.tipos).toEqual(['MENSAJE_CHAT']);
  });

  it('refleja lo que el servidor tiene guardado: un tema con un tipo apagado se ve apagado', () => {
    const temas = temasVisibles({ RECORDATORIO_EVENTO: false, LOGRO_DESBLOQUEADO: true, HITO_PROGRAMA: false, RESUMEN_SEMANAL: true });
    expect(Object.fromEntries(temas.map(t => [t.clave, t.encendido]))).toEqual({ eventos: false, logros: false, resumen: true });
  });

  it('contra un backend sin RECORDATORIO_EVENTO no ofrece el interruptor de eventos', () => {
    const temas = temasVisibles({ LOGRO_DESBLOQUEADO: true, HITO_PROGRAMA: true, RESUMEN_SEMANAL: true });
    expect(temas.map(t => t.clave)).toEqual(['logros', 'resumen']);
  });

  it('guardar manda SOLO los tipos del tema tocado y devuelve lo que respondió el servidor', async () => {
    mockApiFetch.mockResolvedValueOnce({ preferences: [{ type: 'LOGRO_DESBLOQUEADO', enabled: false }, { type: 'HITO_PROGRAMA', enabled: false }] });
    const logros = TEMAS.find(t => t.clave === 'logros')!;
    const resultado = await guardarTema(logros, false);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/notification-preferences', {
      method: 'PATCH',
      body: { preferences: [{ type: 'LOGRO_DESBLOQUEADO', enabled: false }, { type: 'HITO_PROGRAMA', enabled: false }] },
    });
    expect(resultado).toEqual({ LOGRO_DESBLOQUEADO: false, HITO_PROGRAMA: false });
  });
});

describe('alarmas: sonido y canales (E-9, E-10)', () => {
  it('el canal de hábitos con el sonido del teléfono conserva su id de siempre', () => {
    expect(canalDeAlarma('habitos', 'sistema')).toMatchObject({ id: 'recordatorios-habitos', sonidoDelAviso: true });
    expect(canalDeAlarma('habitos', 'sistema').sonidoDelCanal).toBeUndefined();
  });

  it('eventos va por su propio canal, uno por sonido (en Android el sonido es del canal)', () => {
    expect(canalDeAlarma('eventos', 'sistema').id).toBe('recordatorios-eventos');
    expect(canalDeAlarma('eventos', 'campana')).toMatchObject({ id: 'recordatorios-eventos-campana', sonidoDelCanal: ARCHIVO_CAMPANA });
    expect(canalDeAlarma('eventos', 'vibrar')).toMatchObject({ sonidoDelCanal: null, sonidoDelAviso: false });
  });

  it('el archivo de la campana está empaquetado por el plugin de notificaciones en app.json', () => {
    const plugin = (appJson.expo.plugins as unknown[]).find(
      p => Array.isArray(p) && p[0] === 'expo-notifications',
    ) as [string, { sounds: string[] }] | undefined;
    expect(plugin?.[1].sounds.some(s => s.endsWith(`/${ARCHIVO_CAMPANA}`))).toBe(true);
  });

  it('lo guardado raro vuelve al valor por defecto', () => {
    expect(leerPreferencias(null)).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(leerPreferencias('{roto')).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(leerPreferencias('{"eventosActivas":false,"sonido":"trompeta"}')).toEqual({ eventosActivas: false, sonido: 'sistema' });
  });
});
