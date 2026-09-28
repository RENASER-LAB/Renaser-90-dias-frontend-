import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  programarRepasoSemanal,
  REPASO_SIN_ALARMA,
} from '../habits/notificaciones/recordatoriosDeHabito';
import {
  preferenciasDeAcciones,
  programarRecordatorioDiario,
} from '../objetivos/notificaciones/recordatoriosDeAcciones';

/**
 * Las alarmas locales son de UNA cuenta (E-413, 28/09).
 *
 * ## El bug
 *
 * Cerrar sesión no tocaba las alarmas del teléfono. Al salir de una cuenta y entrar con otra seguían
 * sonando los hábitos, las acciones, el aviso diario, Despertar, los eventos y el Código Renaser de la
 * anterior (en el emulador: los cinco hábitos de `e2e-admin` a las 12:00 con `e2e-ap-rot2` adentro).
 *
 * ## Qué hace
 *
 * - **`soltarAlarmasDeLaCuenta`** (al cerrar sesión, y al entrar con OTRA cuenta): cancela todo lo
 *   programado y borra lo que el teléfono guarda de esas alarmas (ids, horas, cambios con fecha).
 *   Quedan las PREFERENCIAS de cada persona (sonido, antelaciones, aviso diario de objetivos): son por
 *   usuario y no suenan solas. El repaso de los domingos, que solo se guarda como la id de su alarma,
 *   queda marcado como «pedido, sin alarma» (`REPASO_SIN_ALARMA`) para volver a armarlo.
 * - **`prepararAlarmasPara`** (al entrar o al abrir con sesión): si la última cuenta con alarmas en este
 *   teléfono es otra, suelta las de aquella. Anota quién es la cuenta de ahora.
 * - **`rearmarLoLocalDeLaCuenta`** (con la sesión ya adentro): vuelve a armar lo que solo sabe el
 *   teléfono —el aviso diario de objetivos y el repaso de los domingos— si estaba pedido y no tiene
 *   alarma. Los hábitos los rearma D-217 desde el servidor (`ponerAlDiaLasAlarmas`); las acciones, los
 *   eventos y el Código Renaser, sus sincronizadores al abrir.
 */

const CLAVE_CUENTA = 'renaser.alarmas.cuenta';

/** Lo que el teléfono guarda de alarmas ya programadas: sin la alarma no sirve y confunde al rearmar. */
const PREFIJOS_DE_ALARMAS = [
  'renaser.habitos.recordatorio.',
  'renaser.habitos.hora.',
  'renaser.habitos.diferido.',
  'renaser.eventos.alarmas.',
  'renaser.objetivos.recordatorios.acciones.',
  'renaser.objetivos.recordatorios.diario.',
];
const PREFIJO_REPASO = 'renaser.habitos.repasoSemanal.';

/** Cancela todas las alarmas locales y borra lo guardado de ellas. Idempotente; nunca tira. */
export async function soltarAlarmasDeLaCuenta(): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const N = cargarNotificaciones();
  try {
    await N?.cancelAllScheduledNotificationsAsync();
  } catch {
    // Sin poder cancelar, al menos se borra lo guardado: el rearmado no las vuelve a crear.
  }
  try {
    const claves = await AsyncStorage.getAllKeys();
    const borrar = claves.filter(k => k === CLAVE_CUENTA || PREFIJOS_DE_ALARMAS.some(p => k.startsWith(p)));
    if (borrar.length > 0) await AsyncStorage.multiRemove(borrar);
    // El repaso queda «pedido, sin alarma» para rearmarlo si vuelve esa cuenta.
    for (const clave of claves.filter(k => k.startsWith(PREFIJO_REPASO))) {
      await AsyncStorage.setItem(clave, REPASO_SIN_ALARMA);
    }
  } catch {
    // Lo que no se pudo borrar lo corrige la próxima puesta al día.
  }
}

/** Al entrar: si las alarmas del teléfono son de otra cuenta, se sueltan. */
export async function prepararAlarmasPara(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  try {
    const anterior = await AsyncStorage.getItem(CLAVE_CUENTA);
    if (anterior && anterior !== userId) await soltarAlarmasDeLaCuenta();
    await AsyncStorage.setItem(CLAVE_CUENTA, userId);
  } catch {
    // Sin almacenamiento no hay nada guardado de otra cuenta.
  }
}

/** Con la sesión adentro: el aviso diario y el repaso de los domingos, si estaban pedidos y sin alarma. */
export async function rearmarLoLocalDeLaCuenta(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const N = cargarNotificaciones();
  if (!N) return;
  try {
    // Sin permiso no se arma nada: esto corre solo, y no debe abrir el diálogo del sistema.
    if (!(await N.getPermissionsAsync()).granted) return;
    const diario = await AsyncStorage.getItem(`renaser.objetivos.recordatorios.diario.${userId}`);
    const prefs = await preferenciasDeAcciones(userId);
    if (prefs.diarioActivo && !diario) await programarRecordatorioDiario(userId, prefs.horaDiaria);
    if ((await AsyncStorage.getItem(PREFIJO_REPASO + userId)) === REPASO_SIN_ALARMA) await programarRepasoSemanal(userId);
  } catch {
    // Se vuelve a intentar la próxima vez que se abra la app.
  }
}
