import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cómo quiere la persona que el teléfono le recuerde sus cuotas (spec 032, decisión del dueño del 2026-11-01: «que le salga en Yo los
 * recordatorios»). Es **del teléfono y por cuenta**, como las de eventos y acciones: son alarmas locales, así que si cambia de teléfono el
 * nuevo no hereda lo elegido (y tampoco tiene alarmas puestas). No viaja al servidor.
 *
 * Por defecto, encendido: 3 días antes y el mismo día, a las 09:00 (decisión del dueño). Se puede elegir uno o varios avisos —3 días antes,
 * 1 día antes, el mismo día— y la hora.
 */
export type AntelacionDePago = 3 | 1 | 0;

/** De la más lejana a la más cercana: así se muestran y así se guardan. */
export const ANTELACIONES_DE_PAGO: readonly AntelacionDePago[] = [3, 1, 0];

export interface PreferenciasDePagos {
  /** Apagado: no se programa ninguna alarma de pago y se quitan las que había. */
  activos: boolean;
  /** Cuántos días antes del vencimiento suena: 3, 1 o 0 (el mismo día). Una o varias. */
  antelaciones: AntelacionDePago[];
  /** `HH:mm` en 24 h: la hora a la que suena, el día que toque. */
  hora: string;
}

export const PREFERENCIAS_DE_PAGOS_POR_DEFECTO: PreferenciasDePagos = { activos: true, antelaciones: [3, 0], hora: '09:00' };

const CLAVE = 'renaser.pagos.preferencias.';

export function esHoraDePago(valor: unknown): valor is string {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function esAntelacion(valor: unknown): valor is AntelacionDePago {
  return valor === 3 || valor === 1 || valor === 0;
}

/** Sin repetidos y en orden (3, 1, 0). */
export function ordenarAntelaciones(lista: readonly AntelacionDePago[]): AntelacionDePago[] {
  return ANTELACIONES_DE_PAGO.filter(a => lista.includes(a));
}

/**
 * Lee lo guardado. Cualquier cosa rara (vacío, JSON roto, un valor que ya no existe) cae al valor por defecto, campo por campo. Una lista de
 * avisos vacía es válida: «encendido sin ningún aviso» no avisa nada y la pantalla lo dice.
 */
export function leerPreferenciasDePagos(crudo: string | null): PreferenciasDePagos {
  if (!crudo) return PREFERENCIAS_DE_PAGOS_POR_DEFECTO;
  try {
    const leido = JSON.parse(crudo) as Partial<Record<keyof PreferenciasDePagos, unknown>> | null;
    const avisos = Array.isArray(leido?.antelaciones) ? leido.antelaciones.filter(esAntelacion) : null;
    return {
      activos: typeof leido?.activos === 'boolean' ? leido.activos : PREFERENCIAS_DE_PAGOS_POR_DEFECTO.activos,
      antelaciones: avisos ? ordenarAntelaciones(avisos) : PREFERENCIAS_DE_PAGOS_POR_DEFECTO.antelaciones,
      hora: esHoraDePago(leido?.hora) ? leido.hora : PREFERENCIAS_DE_PAGOS_POR_DEFECTO.hora,
    };
  } catch {
    return PREFERENCIAS_DE_PAGOS_POR_DEFECTO;
  }
}

export async function preferenciasDePagos(userId: string): Promise<PreferenciasDePagos> {
  try {
    return leerPreferenciasDePagos(await AsyncStorage.getItem(CLAVE + userId));
  } catch {
    return PREFERENCIAS_DE_PAGOS_POR_DEFECTO;
  }
}

export async function guardarPreferenciasDePagos(userId: string, preferencias: PreferenciasDePagos): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE + userId, JSON.stringify(preferencias));
  } catch {
    // Guardar una preferencia no puede tumbar la pantalla: en el peor caso vuelve al valor por defecto.
  }
}

/** Una línea para decir lo elegido: «Apagados», «3 días antes y el mismo día · 09:00», «Sin ningún aviso». */
export function resumenDeLosRecordatoriosDePago(p: PreferenciasDePagos): string {
  if (!p.activos) return 'Apagados en este teléfono';
  if (p.antelaciones.length === 0) return 'Sin ningún aviso elegido';
  const frases = p.antelaciones.map(a => (a === 3 ? '3 días antes' : a === 1 ? '1 día antes' : 'el mismo día'));
  const unidas = frases.length === 1 ? frases[0] : `${frases.slice(0, -1).join(', ')} y ${frases[frases.length - 1]}`;
  return `${unidas.charAt(0).toUpperCase()}${unidas.slice(1)} · ${p.hora}`;
}
