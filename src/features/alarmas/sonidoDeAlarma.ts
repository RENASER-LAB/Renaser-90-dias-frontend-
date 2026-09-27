/**
 * El sonido de una alarma local y el canal de Android por el que sale (E-9 y E-10 de la
 * retroalimentación del 26/09).
 *
 * ## Por qué un canal por tipo Y por sonido
 *
 * En Android 8+ el sonido **es del canal, no de la notificación**, y un canal no se puede cambiar
 * después de creado: `setNotificationChannelAsync` sobre un id existente respeta el sonido viejo.
 * Así que «elegir el sonido» es elegir por qué canal sale la alarma. Cada tipo (hábitos, eventos)
 * tiene su canal por sonido, y la persona puede silenciar cada uno desde los ajustes del teléfono
 * (E-9: «para silenciarlos por separado»).
 *
 * El canal de hábitos con el sonido del teléfono conserva su id de siempre (`recordatorios-habitos`):
 * las alarmas ya programadas en los teléfonos siguen saliendo por ahí y nada cambia para quien no
 * toque la sección Alarmas.
 *
 * ## El sonido propio
 *
 * `campana_renaser.wav` va empaquetado en la app por el plugin de `expo-notifications`
 * (`app.json`). **Hace falta un APK nuevo**: sin el archivo dentro, Android no tiene qué sonar.
 * Como la app no se actualiza por aire, este código y el archivo llegan siempre juntos.
 */

export type SonidoDeAlarma = 'sistema' | 'campana' | 'vibrar';
export type TipoDeAlarma = 'habitos' | 'eventos';

export const SONIDOS: ReadonlyArray<{ clave: SonidoDeAlarma; nombre: string; detalle: string }> = [
  { clave: 'sistema', nombre: 'El del teléfono', detalle: 'El sonido de siempre de tus avisos' },
  { clave: 'campana', nombre: 'Campana Renaser', detalle: 'Una campana suave' },
  { clave: 'vibrar', nombre: 'Solo vibrar', detalle: 'Sin sonido' },
];

/** El archivo empaquetado por el plugin. Mismo nombre en `app.json` y en el canal. */
export const ARCHIVO_CAMPANA = 'campana_renaser.wav';

export const SONIDO_POR_DEFECTO: SonidoDeAlarma = 'sistema';

export function esSonido(valor: unknown): valor is SonidoDeAlarma {
  return valor === 'sistema' || valor === 'campana' || valor === 'vibrar';
}

const NOMBRE_DEL_TIPO: Record<TipoDeAlarma, string> = {
  habitos: 'Recordatorios de hábitos',
  eventos: 'Eventos y clases',
};

/** Id de canal de siempre, por tipo. El de hábitos NO cambia (ver arriba). */
const CANAL_BASE: Record<TipoDeAlarma, string> = {
  habitos: 'recordatorios-habitos',
  eventos: 'recordatorios-eventos',
};

export interface CanalDeAlarma {
  id: string;
  nombre: string;
  /** Lo que va en el canal: `undefined` = el del sistema; `null` = sin sonido; texto = archivo propio. */
  sonidoDelCanal: string | null | undefined;
  /** Lo que va en el contenido de la notificación (iOS y Android viejos). */
  sonidoDelAviso: boolean | string;
}

export function canalDeAlarma(tipo: TipoDeAlarma, sonido: SonidoDeAlarma): CanalDeAlarma {
  const base = CANAL_BASE[tipo];
  const nombre = NOMBRE_DEL_TIPO[tipo];
  if (sonido === 'campana') {
    return { id: `${base}-campana`, nombre: `${nombre} (campana)`, sonidoDelCanal: ARCHIVO_CAMPANA, sonidoDelAviso: ARCHIVO_CAMPANA };
  }
  if (sonido === 'vibrar') {
    return { id: `${base}-vibrar`, nombre: `${nombre} (solo vibrar)`, sonidoDelCanal: null, sonidoDelAviso: false };
  }
  // SIN `sound` en el canal: en Android ese campo es el NOMBRE DE UN ARCHIVO, y omitirlo es lo que
  // deja el sonido del sistema (ver `asegurarCanal` en `recordatoriosDeHabito.ts`).
  return { id: base, nombre, sonidoDelCanal: undefined, sonidoDelAviso: true };
}
