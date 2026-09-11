import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CampoRadar } from '../config/configRadar';

/**
 * Lo escrito en el Código Renaser de esta hora, guardado en el teléfono mientras se escribe.
 *
 * ## Por qué
 *
 * El formulario es innegociable para el aprendiz y son doce por día. Si el envío falla por falta
 * de red —o si el teléfono se queda sin batería, o alguien mata la app— las cinco respuestas se
 * perdían enteras y había que reescribirlas. Con doce oportunidades diarias de que eso pase
 * durante siete días, no es un caso de borde: es cuestión de tiempo.
 *
 * Mismo criterio que el borrador de la Ficha Inicial y el de la Pastilla Renacer: AsyncStorage y
 * no SecureStore, porque es un borrador de formulario y no una credencial.
 *
 * ## La clave lleva usuario, día y hora
 *
 * Por **usuario**, porque en un mismo teléfono pasan varias cuentas y el borrador de una no debe
 * aparecer en la sesión de otra.
 *
 * Por **día y hora**, porque el Código Renaser es una foto de UNA franja. Lo que alguien escribió
 * a las 10:00 no es una respuesta a medias de las 11:00: presentárselo ahí sugeriría que sigue
 * valiendo, que es justo lo contrario de lo que la herramienta mide. Al cambiar de franja el
 * formulario nace vacío y el borrador viejo queda huérfano — lo barre {@link limpiarBorradoresViejos}.
 */

export interface BorradorRadar {
  respuestas: Record<CampoRadar, string>;
  energia: number | null;
  guardadoEn: string;
}

const PREFIJO = 'renaser.radar.borrador.';

/** `usuario|AAAA-MM-DD|HH` — una franja concreta de una persona concreta. */
export function claveDeBorrador(usuarioId: string, momento: Date): string {
  const mes = String(momento.getMonth() + 1).padStart(2, '0');
  const dia = String(momento.getDate()).padStart(2, '0');
  const hora = String(momento.getHours()).padStart(2, '0');
  return `${PREFIJO}${usuarioId}|${momento.getFullYear()}-${mes}-${dia}|${hora}`;
}

/** Ninguna operación de almacenamiento puede tumbar la app — degrada a "no hay borrador". */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

export function guardarBorrador(
  usuarioId: string,
  momento: Date,
  borrador: Omit<BorradorRadar, 'guardadoEn'>,
): Promise<void> {
  return sinRomper(async () => {
    const vacio =
      borrador.energia === null && Object.values(borrador.respuestas).every(v => v.trim().length === 0);
    // Un formulario en blanco no es un borrador: guardarlo llenaría el almacenamiento de ruido y
    // obligaría a distinguir "no escribió nada" de "no hay nada guardado".
    if (vacio) {
      await AsyncStorage.removeItem(claveDeBorrador(usuarioId, momento));
      return;
    }
    const contenido: BorradorRadar = { ...borrador, guardadoEn: new Date().toISOString() };
    await AsyncStorage.setItem(claveDeBorrador(usuarioId, momento), JSON.stringify(contenido));
  }, undefined);
}

/** `null` si no hay borrador para esa franja, o si el JSON quedó corrupto. */
export function leerBorrador(usuarioId: string, momento: Date): Promise<BorradorRadar | null> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(claveDeBorrador(usuarioId, momento));
    if (!crudo) return null;
    try {
      const leido = JSON.parse(crudo) as BorradorRadar;
      // Una forma inesperada se descarta en vez de propagarse a la pantalla como `undefined`.
      return leido && typeof leido === 'object' && leido.respuestas ? leido : null;
    } catch {
      return null;
    }
  }, null);
}

export function borrarBorrador(usuarioId: string, momento: Date): Promise<void> {
  return sinRomper(() => AsyncStorage.removeItem(claveDeBorrador(usuarioId, momento)), undefined);
}

/**
 * Barre los borradores de franjas que ya pasaron.
 *
 * Sin esto, doce claves por día durante siete días dejarían 84 restos por persona en el teléfono,
 * para siempre. Se conserva solo la franja en curso: cualquier otra es de una hora que ya cerró y
 * no se va a volver a abrir.
 */
export function limpiarBorradoresViejos(usuarioId: string, momento: Date): Promise<void> {
  return sinRomper(async () => {
    const claves = await AsyncStorage.getAllKeys();
    const actual = claveDeBorrador(usuarioId, momento);
    const viejas = claves.filter(k => k.startsWith(`${PREFIJO}${usuarioId}|`) && k !== actual);
    if (viejas.length > 0) await AsyncStorage.multiRemove(viejas);
  }, undefined);
}
