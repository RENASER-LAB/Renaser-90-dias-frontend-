import { plazoDelObjetivo } from '../../objetivos/utils/nombreDelObjetivo';

/**
 * Lo que dice la pantalla «Tu programa empieza mañana» (spec 036, D-309, cambio de gerencia del 2026-11-02: «iniciará al día siguiente: el
 * usuario no podrá elegir»). Antes la pantalla era «Elige tu Día 1», con tres fechas a elegir.
 *
 * Todo el texto de la pantalla en un solo lugar, corto a propósito (el dueño pidió poco texto):
 *
 *  - título: «Tu programa empieza mañana»;
 *  - la fecha: «Martes 3 de noviembre» (la pone la pantalla, desde la que manda el servidor);
 *  - una línea con el plazo de SU programa: «Son tus 90 días.», «Son tus 3 meses.», «Es tu año.»;
 *  - el botón: «Entendido».
 */
export const TITULO_EMPIEZA_MANANA = 'Tu programa empieza mañana';
export const BOTON_ENTENDIDO = 'Entendido';

/**
 * «Son tus 90 días.», «Son tus 3 meses.» o «Es tu año.»: el plazo es el de la formación de la persona (`plazoDelObjetivo`: 90 días en la
 * Escuela y la Certificación, 3 meses o 1 año en el Diplomado). Sin duración conocida (el servidor aún no la dijo) vale la de siempre, 90 días.
 */
export function lineaDelPlazo(duracionDias?: number | null, formacion?: string | null): string {
  const plazo = plazoDelObjetivo(duracionDias, formacion);
  return plazo === '1 año' ? 'Es tu año.' : `Son tus ${plazo}.`;
}

/** Lo que se dice cuando el servidor rechazó la fecha que se mostraba (400): pasó la medianoche y «mañana» ya es otro día. */
export const AVISO_FECHA_CAMBIO = 'Pasó la medianoche y tu fecha cambió. Mira la nueva.';
/** Lo que se dice cuando el servidor dice que el programa ya estaba activado con otra fecha (409): se vuelve a comprobar. */
export const AVISO_COMPROBANDO = 'Vamos a comprobar tu programa.';
/** Sin red al activar: el mismo botón «Entendido» vuelve a intentarlo. */
export const AVISO_SIN_RED_AL_ACTIVAR = 'No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.';
/** Sin red al leer la fecha: se ofrece «Reintentar». */
export const AVISO_SIN_RED_AL_LEER = 'No pudimos cargar tu fecha de inicio. Revisa tu conexión.';

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «Martes 3 de noviembre». El servidor manda `yyyy-MM-dd` (`LocalDate`, sin hora). `new Date(iso)` lo interpreta como medianoche UTC y en
 * husos horarios negativos (América) puede mostrar el día ANTERIOR — por eso se arma la fecha local a mano, componente por componente.
 * Mayúscula sólo al principio: `textTransform: 'capitalize'` ponía mayúscula a CADA palabra y mostraba «Martes 6 De Octubre» (corregido 2026-10-05).
 */
export function fechaDelDiaUno(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const texto = `${NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()} de ${NOMBRES_MES[fecha.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
