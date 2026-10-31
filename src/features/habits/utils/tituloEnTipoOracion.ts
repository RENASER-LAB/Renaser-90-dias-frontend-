import { tituloVisible, type HabitoRenombrable } from './renombreDeHabito';

/**
 * Los nombres de los hábitos de Training «no tan mayúsculas» (2026-10-31, pedido del dueño). El catálogo del servidor trae casi
 * todos los títulos en MAYÚSCULAS («AGUA TIBIA CON LIMÓN», «RITUAL TIERRA - AGUA - FUEGO (mañana)»); acá se muestran en tipo
 * oración («Agua tibia con limón», «Ritual tierra - agua - fuego (mañana)»).
 *
 * **Solo cambia lo que se MUESTRA.** Lo que se guarda, lo que se manda al servidor y el texto de las alarmas siguen con el título
 * del catálogo tal cual: esta función se llama al dibujar, nunca al enviar.
 *
 * ## Cuándo cambia un título
 *
 * - **Solo si «llega TODO en mayúsculas».** Un título que ya tiene alguna minúscula (el que la persona puso con «Cambiar nombre»,
 *   «Clase diaria», «Pastilla Renacer») se deja tal cual.
 * - **Lo que va entre paréntesis no cuenta para decidirlo.** El catálogo escribe el momento en minúsculas dentro del paréntesis
 *   («RITUAL TIERRA - AGUA - FUEGO (mañana)»), y por eso el título «tiene minúsculas» aunque todo lo demás grite. Se mira lo de
 *   afuera; lo de adentro se deja como viene (y si también viene en mayúsculas, «(ROMPO EL AYUNO)», se pasa a minúsculas).
 * - **Siglas y nombres propios.** «SER» (el acompañante) y unas pocas siglas más siguen en mayúsculas; «RENASER» queda «Renaser» y
 *   «RENACER» (la «Pastilla Renacer») «Renacer», también a mitad de frase.
 * - La primera letra va en mayúscula. Los espacios y los signos no se tocan.
 */

/** Siglas que se quedan en mayúsculas. Se agregan acá, una por una, cuando aparezca alguna en el catálogo. */
const SIGLAS = new Set(['SER', 'IA', 'TV', 'USD']);

/** Nombres propios: se escriben con la inicial en mayúscula aunque vayan a mitad de frase. */
const NOMBRES_PROPIOS: Readonly<Record<string, string>> = { RENASER: 'Renaser', RENACER: 'Renacer' };

const GRUPO_ENTRE_PARENTESIS = /\([^)]*\)/g;
const TIENE_LETRAS = /\p{L}/u;
const TIENE_MINUSCULAS = /\p{Ll}/u;

/** Un fragmento ya en minúsculas, con las siglas y los nombres propios de vuelta. */
function aMinusculasConSiglas(fragmento: string): string {
  return fragmento.toLowerCase().replace(/\p{L}+/gu, palabra => {
    const mayuscula = palabra.toUpperCase();
    if (SIGLAS.has(mayuscula)) return mayuscula;
    return NOMBRES_PROPIOS[mayuscula] ?? palabra;
  });
}

/** Un título que llega todo en mayúsculas, en tipo oración; cualquier otro, tal cual. */
export function tituloEnTipoOracion<T extends string | null | undefined>(titulo: T): T {
  if (typeof titulo !== 'string') return titulo;

  // Lo que decide es el texto de afuera de los paréntesis; si no hay letras afuera («(MAÑANA)»), el de adentro.
  const fuera = titulo.replace(GRUPO_ENTRE_PARENTESIS, ' ');
  const base = TIENE_LETRAS.test(fuera) ? fuera : titulo;
  if (!TIENE_LETRAS.test(base) || TIENE_MINUSCULAS.test(base)) return titulo;

  const convertido = titulo
    .split(/(\([^)]*\))/)
    .map(parte => {
      const esGrupo = parte.startsWith('(') && parte.endsWith(')');
      // Un paréntesis con minúsculas ya viene bien escrito: se deja.
      if (esGrupo && TIENE_MINUSCULAS.test(parte)) return parte;
      return aMinusculasConSiglas(parte);
    })
    .join('');

  // La inicial en mayúscula.
  return convertido.replace(/\p{L}/u, letra => letra.toUpperCase()) as T;
}

/**
 * El nombre de un hábito del catálogo para MOSTRARLO en Training: el que puso la persona (tal cual, aunque lo haya escrito en
 * mayúsculas) o, si no puso ninguno, el del catálogo en tipo oración.
 */
export function tituloParaMostrar(habito: HabitoRenombrable, titulos: Readonly<Record<string, string>>): string {
  const visible = tituloVisible(habito, titulos);
  return visible === habito.title ? tituloEnTipoOracion(visible) : visible;
}
