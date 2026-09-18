/**
 * El permiso que decide si un recordatorio suena a la hora o cuando Android quiera.
 *
 * **El bug (2026-09-18).** Un hábito puesto a las 06:30 llegaba 06:44, y los tres avisos —el de 30
 * min antes, el de 10 y el de la hora— aparecían juntos en vez de por separado.
 *
 * La causa no estaba en el cálculo de la hora, que era correcto, sino en cómo Android programa la
 * alarma. `expo-notifications` elige entre dos, en `ExpoSchedulingDelegate.setupAlarm`:
 *
 *     if (SDK_INT < S || alarmManager.canScheduleExactAlarms()) setExactAndAllowWhileIdle(...)
 *     else                                                      setAndAllowWhileIdle(...)
 *
 * La segunda es INEXACTA: el sistema puede posponerla y la entrega en lote con otras. De
 * madrugada, con el teléfono quieto en Doze —justo el caso de una alarma para despertarse—, ese
 * lote sale recién en la siguiente ventana de mantenimiento.
 *
 * La app apunta a `targetSdk 36`, así que la rama la decide `canScheduleExactAlarms()`, y eso
 * devuelve `false` mientras el permiso no esté declarado. No lo declaraba nadie: ni `app.json`, ni
 * el manifiesto propio de `expo-notifications`, que solo trae `POST_NOTIFICATIONS` y
 * `RECEIVE_BOOT_COMPLETED`. O sea que TODOS los recordatorios eran inexactos.
 *
 * **Por qué `SCHEDULE_EXACT_ALARM` y no `USE_EXACT_ALARM`.** El segundo se concede solo y sería más
 * cómodo, pero la política de Google Play lo reserva a apps cuya función PRINCIPAL es reloj
 * despertador, temporizador o calendario. Renaser es un programa de 90 días que además avisa, así
 * que pedirlo es arriesgar la ficha de la tienda. `SCHEDULE_EXACT_ALARM` no tiene esa restricción.
 *
 * El permiso solo hace falta desde Android 12 (SDK 31); por debajo la alarma ya era exacta sin
 * pedir nada. La app apunta muy por encima de eso, y el `targetSdk` no vive en `app.json` —lo fija
 * el SDK de Expo—, así que no se afirma acá: se deja dicho para quien alguna vez lo baje.
 *
 * Esta prueba existe porque el permiso es una línea de configuración que no rompe nada al
 * desaparecer: sin ella, quitarlo devolvería las alarmas a "cuando Android quiera" y el síntoma
 * tardaría semanas en volver a reportarse.
 */
import { describe, expect, it } from '@jest/globals';

import appJson from '../../../../../app.json';

const PERMISOS: string[] = appJson.expo.android.permissions ?? [];

describe('alarma exacta en Android', () => {
  it('declara SCHEDULE_EXACT_ALARM, sin el cual todo recordatorio es postergable', () => {
    expect(PERMISOS).toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });

  it('no pide USE_EXACT_ALARM, que la politica de Play reserva a apps de reloj', () => {
    expect(PERMISOS).not.toContain('android.permission.USE_EXACT_ALARM');
  });

  it('no lo declara dos veces: una lista con repetidos esconde ediciones a medias', () => {
    expect(new Set(PERMISOS).size).toBe(PERMISOS.length);
  });
});
