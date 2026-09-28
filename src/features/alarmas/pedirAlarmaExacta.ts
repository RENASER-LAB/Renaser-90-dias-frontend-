import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

import { abrirAjusteNativoDeAlarmaExacta, estadoDeAlarmaExacta, type EstadoDeAlarmaExacta } from './alarmaExactaNativa';
import { abrirAlarmasYRecordatorios, type AbridorDeAjustes, type PantallaAbierta } from './permisoDeAlarmaExacta';

/**
 * Pedir «Alarmas y recordatorios» al guardar el PRIMER recordatorio (D-217, 2026-09-28).
 *
 * Una sola vez por persona en este teléfono, y solo si el sistema dice que está negado: preguntarlo en
 * cada guardado sería insistir, y Yo → Alarmas muestra el estado real siempre. Hasta ahora no se podía
 * saber (`permisoDeAlarmaExacta.ts`), así que no se pedía en ningún guardado.
 */
const CLAVE_YA_SE_PIDIO = 'renaser.alarmas.exactaPedida.';

export async function hayQuePedirAlarmaExactaAlGuardar(
  userId: string,
  estado: EstadoDeAlarmaExacta = estadoDeAlarmaExacta(),
): Promise<boolean> {
  if (estado !== 'denegado') return false;
  try {
    return (await AsyncStorage.getItem(CLAVE_YA_SE_PIDIO + userId)) === null;
  } catch {
    return false;
  }
}

export async function anotarQueSePidioAlarmaExacta(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_YA_SE_PIDIO + userId, new Date().toISOString());
  } catch {
    // Si no se puede anotar, a lo sumo se vuelve a preguntar una vez.
  }
}

/**
 * Abre «Alarmas y recordatorios» directo en Renaser (módulo nativo) y, si el APK no lo trae, la lista del
 * sistema o los ajustes de la app, como antes.
 */
export async function abrirPermisoDeAlarmasExactas(
  linking: AbridorDeAjustes = Linking,
  nativo: () => boolean = abrirAjusteNativoDeAlarmaExacta,
): Promise<PantallaAbierta> {
  if (nativo()) return 'alarmas_y_recordatorios';
  return abrirAlarmasYRecordatorios(linking);
}

/**
 * Textos cortos (dueño, 28/09: «mucho texto marea al usuario»). El pedido va una sola vez; después, al
 * guardar, solo la línea discreta.
 */
export const TEXTO_PEDIDO_ALARMA_EXACTA = 'Permite «Alarmas y recordatorios» para que suenen a la hora exacta.';
export const LINEA_ALARMA_EXACTA_PENDIENTE = 'Pueden sonar tarde: actívalo en Yo → Alarmas.';

/** La línea discreta al guardar: solo si ya se pidió una vez y sigue negado. */
export async function hayQueRecordarAlarmaExacta(
  userId: string,
  estado: EstadoDeAlarmaExacta = estadoDeAlarmaExacta(),
): Promise<boolean> {
  if (estado !== 'denegado') return false;
  try {
    return (await AsyncStorage.getItem(CLAVE_YA_SE_PIDIO + userId)) !== null;
  } catch {
    return false;
  }
}
