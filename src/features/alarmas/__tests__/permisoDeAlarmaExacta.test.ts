import { describe, expect, it, jest } from '@jest/globals';

import appJson from '../../../../app.json';
import {
  ACCION_ALARMAS_Y_RECORDATORIOS,
  abrirAlarmasYRecordatorios,
  hayQueRevisarAlarmaExacta,
  type AbridorDeAjustes,
} from '../permisoDeAlarmaExacta';

function abridor(falla: { intent?: boolean; ajustes?: boolean } = {}) {
  const sendIntent = jest.fn(async (_accion: string) => {
    if (falla.intent) throw new Error('Could not launch Intent');
  });
  const openSettings = jest.fn(async () => {
    if (falla.ajustes) throw new Error('Could not open the Settings');
  });
  const linking: AbridorDeAjustes = { sendIntent, openSettings };
  return { linking, sendIntent, openSettings };
}

describe('aviso de «Alarmas y recordatorios» (e2e del 2026-09-26: la alarma de «Voy» con window=+40m)', () => {
  it('se muestra en Android 12 o más nuevo, incluido el 14+ que no lo concede solo', () => {
    expect(hayQueRevisarAlarmaExacta('android', 31)).toBe(true);
    expect(hayQueRevisarAlarmaExacta('android', 34)).toBe(true);
    expect(hayQueRevisarAlarmaExacta('android', 37)).toBe(true);
  });

  it('no en Android 11 o menos (ya era exacta), ni en iOS ni en web', () => {
    expect(hayQueRevisarAlarmaExacta('android', 30)).toBe(false);
    expect(hayQueRevisarAlarmaExacta('ios', '18.0')).toBe(false);
    expect(hayQueRevisarAlarmaExacta('web', '')).toBe(false);
  });

  it('abre la pantalla del sistema de «Alarmas y recordatorios»', async () => {
    const { linking, sendIntent, openSettings } = abridor();
    await expect(abrirAlarmasYRecordatorios(linking)).resolves.toBe('alarmas_y_recordatorios');
    expect(sendIntent).toHaveBeenCalledWith('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
    expect(ACCION_ALARMAS_Y_RECORDATORIOS).toBe('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
    expect(openSettings).not.toHaveBeenCalled();
  });

  it('si el teléfono no tiene esa pantalla, abre los ajustes de la app', async () => {
    const { linking } = abridor({ intent: true });
    await expect(abrirAlarmasYRecordatorios(linking)).resolves.toBe('ajustes_de_la_app');
  });

  it('si no abre nada, lo dice en vez de romper', async () => {
    const { linking } = abridor({ intent: true, ajustes: true });
    await expect(abrirAlarmasYRecordatorios(linking)).resolves.toBe('ninguna');
  });

  it('sigue pidiendo SCHEDULE_EXACT_ALARM y no USE_EXACT_ALARM', () => {
    const permisos: string[] = appJson.expo.android.permissions ?? [];
    expect(permisos).toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(permisos).not.toContain('android.permission.USE_EXACT_ALARM');
  });
});
