/**
 * El permiso «Alarmas y recordatorios» (`SCHEDULE_EXACT_ALARM`) de Android.
 *
 * **Por qué hace falta pedirlo a mano (e2e del 2026-09-26, emulador Android SDK 37).** `app.json` lo
 * declara desde el 2026-09-18 (`habits/notificaciones/__tests__/alarmaExacta.test.ts`), pero desde
 * Android 14 declararlo ya no alcanza: el sistema no lo concede solo a una app nueva
 * (`adb shell appops get com.renaser.app SCHEDULE_EXACT_ALARM` → `default`). Sin él,
 * `expo-notifications` programa la alarma INEXACTA y `dumpsys alarm` mostró la de «Voy» con
 * `window=+40m59s`: podía sonar 40 minutos tarde, con la clase ya empezada. Lo mismo Despertar y los
 * recordatorios de hábitos. La persona lo tiene que prender en los ajustes del teléfono.
 *
 * **No se puede saber si está concedido** sin un módulo nativo nuevo: `expo-notifications` consulta
 * `canScheduleExactAlarms()` por dentro pero no lo expone, y React Native tampoco. Por eso el aviso
 * de Yo → Alarmas está siempre (en Android 12 o más nuevo) y no se muestra al marcar «Voy» ni al
 * prender Despertar: ahí aparecería cada vez, aunque ya lo hubiera dado.
 *
 * **Tampoco se puede abrir directo en Renaser:** esa pantalla del sistema necesita `package:` como
 * dato del intent, y `Linking.sendIntent` solo manda extras. Sin el dato, Android abre la lista de
 * «Alarmas y recordatorios» y la persona toca Renaser. Si ni eso abre, se van los ajustes de la app.
 *
 * NO se cambia a `USE_EXACT_ALARM`: Google Play lo reserva a apps cuya función principal es reloj o
 * calendario.
 */

export const ACCION_ALARMAS_Y_RECORDATORIOS = 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM';

/** Android 12 (SDK 31) es el primero que exige el permiso; por debajo la alarma ya era exacta. */
export const SDK_QUE_LO_EXIGE = 31;

export function hayQueRevisarAlarmaExacta(sistema: string, version: string | number): boolean {
  return sistema === 'android' && Number(version) >= SDK_QUE_LO_EXIGE;
}

/** Lo mínimo de `Linking` que hace falta; se inyecta para probarlo sin React Native. */
export interface AbridorDeAjustes {
  sendIntent: (accion: string) => Promise<void>;
  openSettings: () => Promise<void>;
}

/** Qué pantalla se abrió: la lista de «Alarmas y recordatorios», los ajustes de la app, o ninguna. */
export type PantallaAbierta = 'alarmas_y_recordatorios' | 'ajustes_de_la_app' | 'ninguna';

export async function abrirAlarmasYRecordatorios(linking: AbridorDeAjustes): Promise<PantallaAbierta> {
  try {
    await linking.sendIntent(ACCION_ALARMAS_Y_RECORDATORIOS);
    return 'alarmas_y_recordatorios';
  } catch {
    try {
      await linking.openSettings();
      return 'ajustes_de_la_app';
    } catch {
      return 'ninguna';
    }
  }
}
