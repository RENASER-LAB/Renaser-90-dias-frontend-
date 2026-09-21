/**
 * Cómo se lee una antelación de recordatorio en pantalla: `10` → `"10 min antes"`, `90` → `"1 h 30
 * antes"`, `0` → `"A la hora"`.
 *
 * ── Por qué existe ──
 *
 * Hasta el 2026-09-14 las antelaciones eran tres fijas con su etiqueta escrita al lado, así que
 * formatear no hacía falta. Desde que la persona puede elegir la suya —7 minutos, 45, dos horas—
 * hay que saber nombrar cualquier número, y eso es una regla con casos de borde (el cero, las
 * horas exactas, el día entero) que merece estar en un sitio y probada.
 *
 * El 2026-09-21 la antelación propia dejó de escribirse en un campo de texto y pasó a elegirse en
 * una rueda de 1 a 60 minutos: el teclado numérico se abría encima del campo y tapaba justo el
 * número que se estaba escribiendo. Por eso el parser de texto se fue y en su lugar hay dos
 * constantes de rango y {@link minutosDeArranqueDeLaRueda}. Las etiquetas siguen igual: el rango
 * de la RUEDA no es el rango de lo que el sistema acepta, y los valores viejos fuera de rango se
 * siguen mostrando y guardando.
 *
 * El conjunto de antelaciones ya viajaba como `number[]` hasta el programador de alarmas, que
 * calcula `(hora - minutos) mod 1440` y por lo tanto **ya aceptaba cualquier valor**: esto no
 * cambia nada aguas abajo, solo deja de esconder lo que el motor siempre supo hacer.
 */

/** Tope: un día. Más que eso no es "un aviso antes", es otro recordatorio. */
export const MAXIMO_MINUTOS_ANTELACION = 1440;

export const MINIMO_MINUTOS_ANTELACION = 1;

const MINUTOS_POR_HORA = 60;

export function etiquetaDeAntelacion(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return 'A la hora';
  const entero = Math.round(minutos);
  if (entero >= MAXIMO_MINUTOS_ANTELACION) return '1 día antes';
  if (entero < MINUTOS_POR_HORA) return `${entero} min antes`;

  const horas = Math.floor(entero / MINUTOS_POR_HORA);
  const resto = entero % MINUTOS_POR_HORA;
  // "2 h antes" y no "2 h 0 antes": el cero sobra y alarga la pastilla sin decir nada.
  return resto === 0 ? `${horas} h antes` : `${horas} h ${resto} antes`;
}

/**
 * Hasta dónde llega la RUEDA de "Otra": una hora.
 *
 * No es el tope de lo que el sistema acepta —{@link MAXIMO_MINUTOS_ANTELACION} sigue siendo un
 * día y el programador de alarmas sigue tomando cualquier valor—, es el tope de lo que la rueda
 * OFRECE. Es el rango que pidió el dueño al cambiar el campo de texto por la rueda (2026-09-21):
 * una rueda de 1440 posiciones no se scrollea, se sufre.
 */
export const MAXIMO_MINUTOS_RUEDA_ANTELACION = 60;

/**
 * Dónde arranca la rueda de "Otra" cuando el hábito todavía no tiene ningún aviso puesto.
 *
 * 15 y no 1: las dos sugeridas son 30 y 10, así que quien abre "Otra" viene justamente a buscar
 * algo que no es ninguna de esas, y 15 lo deja a un empujón corto de casi cualquier destino.
 * Arrancar en 1 sería media vuelta de rueda en el caso más común.
 */
export const MINUTOS_OTRA_POR_DEFECTO = 15;

/**
 * En qué minuto ABRE la rueda de "Otra": en el aviso que ya rige, no en el primero de la lista.
 *
 * Con varios avisos puestos toma el mayor —el que llega antes—, que es el que la fila de pastillas
 * muestra primero y el que la persona tiene en la cabeza al tocar "Otra".
 *
 * **El valor guardado NUNCA se toca acá.** Un hábito que arrastra "1 h 30 antes" de cuando la
 * antelación se escribía a mano cae fuera de la rueda: este clamp mueve dónde abre la rueda (a 60)
 * y nada más — la pastilla de 90 sigue en la fila, sigue encendida y se guarda igual. Recortar el
 * dato para que entre en el control nuevo sería apagarle un recordatorio a alguien por un cambio
 * de UI que no pidió.
 */
export function minutosDeArranqueDeLaRueda(elegidas: readonly number[]): number {
  // El cero queda afuera: "A la hora" es su propia pastilla y no es una antelación que la rueda
  // pueda representar — su valor más chico es 1.
  const positivas = elegidas.filter(m => Number.isFinite(m) && m > 0);
  if (positivas.length === 0) return MINUTOS_OTRA_POR_DEFECTO;
  const mayor = Math.round(Math.max(...positivas));
  return Math.min(Math.max(mayor, MINIMO_MINUTOS_ANTELACION), MAXIMO_MINUTOS_RUEDA_ANTELACION);
}

/**
 * Las antelaciones a mostrar: las fijas más las que la persona haya escrito, sin repetir y de la
 * más temprana a la más tardía.
 *
 * Ordenar de mayor a menor —"30 min antes" antes que "A la hora"— sigue el orden del tiempo real:
 * primero el aviso que llega antes. Es el mismo orden en que el programador las recorre.
 */
export function antelacionesAMostrar(fijas: readonly number[], elegidas: readonly number[]): number[] {
  // El cero se filtra de LAS DOS listas, no solo de las elegidas: "A la hora" se dibuja como una
  // pastilla aparte y colarlo acá lo pondría dos veces. Lo destapó su propio test.
  const positivos = (ms: readonly number[]) => ms.filter(m => Number.isFinite(m) && m > 0);
  const todas = new Set<number>([...positivos(fijas), ...positivos(elegidas)]);
  return [...todas].sort((a, b) => b - a);
}
