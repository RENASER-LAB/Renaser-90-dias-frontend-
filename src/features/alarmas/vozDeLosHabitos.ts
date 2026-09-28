import tabla from './vocesDeLasAlarmas.json';

/**
 * La voz de cada hábito del catálogo (decisión del dueño del 2026-09-27, con la voz Dora: «que diga
 * el nombre del hábito nomás y que sea rápido como está»).
 *
 * ## De dónde sale
 *
 * `vocesDeLasAlarmas.json` es la ÚNICA fuente: lo lee esta app para elegir el audio y lo lee
 * `scripts/sonidos/generar-sonidos.sh` para generarlo. Cada fila es un hábito del catálogo del
 * backend (los 18 activos de `V4__catalogo_habitos_default.sql`), con su id, su título del catálogo,
 * una `clave` (el archivo es `voz_habito_<clave>.mp3`) y lo que dice. Dos rituales de la mañana
 * comparten audio: dicen lo mismo.
 *
 * ## Por qué por id Y por título
 *
 * Por id porque el título se puede renombrar y los ids del catálogo son fijos (V4 conservó los de
 * producción). Y además por título porque justamente dos hábitos se pueden renombrar (`JUGO VERDE` y
 * `AGUA TIBIA CON LIMÓN`, ver `habits/utils/renombreDeHabito.ts`): si la persona le puso otro nombre,
 * la voz diría el viejo, así que ahí suena la frase genérica «Tu hábito está por empezar». Lo mismo si
 * un día el catálogo cambia un título y este archivo no se actualizó: mejor la frase genérica que un
 * nombre que no es.
 *
 * Los hábitos propios (nombre libre) no tienen voz propia: la app no genera voz en el teléfono (sería
 * otra voz, la del sistema), así que dicen la frase genérica, también con Dora.
 */

export interface HabitoConVoz {
  /** El id del hábito del catálogo (`habitos.id`). */
  id: string;
  /** El título con el que se programa el aviso: el que ve la persona, renombrado o no. */
  titulo: string;
}

export interface VozDeHabito {
  clave: string;
  /** El archivo empaquetado (`assets/sonidos/`, y en Android `res/raw/`). */
  archivo: string;
  /** Lo que dice, sin el punto final. Es también el nombre del canal en los ajustes de Android. */
  dice: string;
}

interface FilaDeLaTabla {
  habitoId: string;
  tituloDelCatalogo: string;
  clave: string;
  dice: string;
}

function vozDeLaFila(fila: FilaDeLaTabla): VozDeHabito {
  return { clave: fila.clave, archivo: `voz_habito_${fila.clave}.mp3`, dice: fila.dice.replace(/\.$/, '') };
}

const FILAS: ReadonlyArray<FilaDeLaTabla> = tabla.habitos;
const POR_HABITO = new Map(FILAS.map(fila => [fila.habitoId, fila]));

/** Las voces de los hábitos, una por archivo (sin repetir las que comparten clave). */
export const VOCES_DE_HABITOS: ReadonlyArray<VozDeHabito> = [
  ...new Map(FILAS.map(fila => [fila.clave, vozDeLaFila(fila)])).values(),
];

/** La frase genérica de cada tipo de alarma, también con Dora y la campanita. */
export const ARCHIVO_VOZ_GENERICA = {
  habitos: tabla.genericas.habitos.archivo,
  eventos: tabla.genericas.eventos.archivo,
  objetivos: tabla.genericas.objetivos.archivo,
} as const;

/** Mayúsculas, tildes y espacios de más no cuentan: `DÍA SIN CELULAR` es `Día sin celular`. */
export function mismoTitulo(a: string, b: string): boolean {
  const normal = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return normal(a) === normal(b);
}

/** La voz propia de ese hábito, o `null` si no tiene (propio, renombrado o desconocido). */
export function vozDelHabito(habito: HabitoConVoz | undefined): VozDeHabito | null {
  if (!habito) return null;
  const fila = POR_HABITO.get(habito.id);
  return fila && mismoTitulo(fila.tituloDelCatalogo, habito.titulo) ? vozDeLaFila(fila) : null;
}

const DESPERTAR = FILAS.find(fila => fila.clave === 'despertar');

/**
 * Con qué hábito se escucha la «Voz» en Yo → Alarmas: Despertar, que tiene todo el mundo desde el
 * día 1 y es la alarma de esa misma pantalla.
 */
export const HABITO_DE_MUESTRA: HabitoConVoz | undefined = DESPERTAR
  ? { id: DESPERTAR.habitoId, titulo: DESPERTAR.tituloDelCatalogo }
  : undefined;
