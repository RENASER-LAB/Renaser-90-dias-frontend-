import type { DestinoDeFoto } from '../../habits/utils/destinoDeFoto';

/**
 * Los textos de RESPALDO que el backend manda antes de cada evento para las versiones viejas de la app (D-153 y D-171): «Propuesta: …», «Foto para
 * registrar '…': …» y, para los rituales, «Para registrar '…' cuenta como te sientes: …». Esta versión dibuja la tarjeta, así que los quita del texto.
 * Sin dependencias (ni red ni React): también los usa la voz (`voz.ts`) para no leerlos en voz alta.
 */

/**
 * Para comparar un texto del backend con otro: sin tildes, en minúsculas y con los espacios juntos. Los respaldos de abajo se escribieron SIN tildes
 * («subela», «boton», «camara», «accion») y el backend los va a corregir (#63): la comparación tiene que servir con las dos formas.
 */
export function plano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u00b4`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const escaparParaRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Dónde manda el respaldo a registrar: antes decía «Hoy» y ahora «Training»; la forma larga «la pestaña …» también vale. */
// Spec 045 (D5): el servidor nuevo dice «desde Entrenar»; uno anterior, «desde Training».
const DESDE_DONDE = '(?:la pestana )?(?:hoy|training|entrenar)';

/** ¿Esta línea tiene la forma de un respaldo del backend, sea de cuál evento sea? Sirve para no leerlo en voz alta y para no repetirlo. */
export function esLineaDeRespaldo(linea: string): boolean {
  const l = plano(linea);
  return (
    l.startsWith('propuesta: ') ||
    /^foto para registrar (?:tu accion )?'.+': si no ves el boton de la camara/.test(l) ||
    /^para registrar '.+' cuenta como te sientes: si no ves el boton para escribir/.test(l)
  );
}

/**
 * Quita las líneas que cumplen `esRespaldo` estén donde estén —al final, en medio, varias seguidas—, sin tocar nada más. Cada respaldo es UNA línea
 * (el backend lo manda como «\n\nPropuesta: …»), así que se compara línea por línea. Si no hay ninguna devuelve el mismo texto, sin retocarlo.
 */
function quitarLineas(texto: string, esRespaldo: (lineaPlana: string) => boolean): string {
  let quito = false;
  const quedan = texto.split('\n').filter(linea => {
    if (!esRespaldo(plano(linea))) return true;
    quito = true;
    return false;
  });
  if (!quito) return texto;
  return quedan
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');
}

/**
 * El backend manda cada propuesta dos veces: primero como texto ("Propuesta: …", para versiones
 * viejas de la app que no conocen el evento) y enseguida como evento. Esta versión dibuja la
 * tarjeta, así que saca el texto para que el resumen no aparezca repetido.
 *
 * **Lo saca estén donde estén** (issue #105): antes solo si estaba al FINAL del mensaje, y con dos respaldos seguidos —el de la foto o el del ritual y
 * después el de la propuesta— el de la propuesta quedaba como texto encima de la tarjeta. Ahora se quita la línea completa «Propuesta: <resumen>» (sin
 * importar tildes ni mayúsculas) de cualquier lugar. Lo que no es EXACTAMENTE esa línea no se toca: mejor repetido que borrar algo que dijo el asistente.
 */
export function quitarTextoDeRespaldo(texto: string, resumen: string): string {
  const respaldo = plano(`Propuesta: ${resumen}`);
  return quitarLineas(texto, linea => linea === respaldo);
}

/**
 * Igual que la propuesta, el pedido de la tarjeta llega antes como texto para la app vieja (D-171 del backend). Hay tres formas, y las tres se
 * quitan (issue #105): la de una FOTO de hábito («Foto para registrar '<título>': si no ves el botón de la cámara, súbela desde Training.»), la de una
 * foto de una ACCIÓN del día («Foto para registrar tu acción '<título>': …») y la de un RITUAL, que se registra escribiendo («Para registrar
 * '<título>' cuenta como te sientes: si no ves el botón para escribir, hazlo desde Training.»; ese nadie lo quitaba).
 *
 * Vale «desde Hoy» y «desde Training», con o sin tildes, y esté donde esté la línea y aunque vengan varias seguidas. Solo se quita la del título que
 * pide el evento: si el título no coincide, no se toca nada. `destino` ya no distingue una forma de otra (el backend cambió el texto de ambas): se
 * acepta por compatibilidad.
 */
export function quitarRespaldoDeFoto(texto: string, titulo: string, _destino: DestinoDeFoto = 'habito'): string {
  const t = escaparParaRegex(plano(titulo));
  const deFoto = new RegExp(`^foto para registrar (?:tu accion )?'${t}': si no ves el boton de la camara, subela desde ${DESDE_DONDE}\\.?$`);
  const deRitual = new RegExp(`^para registrar '${t}' cuenta como te sientes: si no ves el boton para escribir, hazlo desde ${DESDE_DONDE}\\.?$`);
  return quitarLineas(texto, linea => deFoto.test(linea) || deRitual.test(linea));
}

/**
 * Al releer el historial, lo guardado es el texto tal cual salió, con los respaldos adentro y SIN tarjeta (la propuesta ya venció o se resolvió).
 * Una vez salió el mismo «Propuesta: …» dos veces en la misma burbuja (issue #105): se deja UNA sola vez cada línea de respaldo; el resto del mensaje no se toca.
 */
export function sinRespaldosRepetidos(texto: string): string {
  const vistas = new Set<string>();
  let quito = false;
  const quedan = texto.split('\n').filter(linea => {
    if (!esLineaDeRespaldo(linea)) return true;
    const clave = plano(linea);
    if (!vistas.has(clave)) {
      vistas.add(clave);
      return true;
    }
    quito = true;
    return false;
  });
  if (!quito) return texto;
  return quedan
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '');
}
