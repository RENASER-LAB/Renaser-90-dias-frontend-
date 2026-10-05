/**
 * La aritmética de la cabecera del login y de «Solicitar acceso» (2026-10-05): cuánto mide, qué
 * parte de la imagen del fénix se ve y cómo se funde con el fondo.
 *
 * Vive separada del componente por lo mismo que `campoBajoElTeclado`: es lo único de la cabecera
 * que se puede probar sin un teléfono, y es donde un número mal puesto deja al fénix sin cabeza o
 * sin cola.
 *
 * > **Corregido 2026-10-05 (mismo día).** La primera versión terminaba la imagen en una onda
 * > SÓLIDA del color del fondo, a la altura de las alas, y se perdía la cola. El dueño, viéndolo en
 * > el emulador: «que sea transparente, y que no cubra toda la imagen porque no veo la cola». Ahora
 * > la cabecera es más alta, la imagen sube un poco y se funde con un degradado largo; la onda
 * > dibujada se quitó (la imagen ya trae sus propias ondas doradas finas abajo).
 */

/** Alto sobre ancho de la imagen de la cabecera (1024 × 1536, vertical). */
export const PROPORCION_DE_LA_IMAGEN = 1536 / 1024;

/**
 * Dónde están las partes del fénix, como fracción del alto de la imagen. Si se cambia la imagen
 * por otra con el sujeto en otro lugar, se ajustan estos dos números y nada más.
 */
export const CABEZA_EN_LA_IMAGEN = 0.24;
export const COLA_EN_LA_IMAGEN = 0.8;

/** `alta`: el login. `baja`: «Solicitar acceso» y los pasos que siguen (código, recuperación…). */
export type VarianteDeCabecera = 'alta' | 'baja';

interface Medidas {
  /** Fracción de la pantalla (contando la barra de estado), normal y en pantalla corta. */
  fraccion: { normal: number; corta: number };
  minimo: number;
  maximo: number;
  /** Desde qué fracción del alto de la cabecera empieza el degradado (antes, la imagen limpia). */
  inicioDelDegradado: number;
  /** Cuánto se mete el título dentro de la cabecera: queda sobre el final del degradado. */
  solapeDelTitulo: number;
}

const MEDIDAS: Record<VarianteDeCabecera, Medidas> = {
  /* ~54 %: es lo que deja ver el fénix entero (alas, cuerpo y cola) y todavía entra el formulario
     sin desplazar en un Pixel 6 (título, dos campos y «¿Olvidaste…?» por encima del botón). */
  alta: { fraccion: { normal: 0.54, corta: 0.46 }, minimo: 280, maximo: 600, inicioDelDegradado: 0.5, solapeDelTitulo: 36 },
  /* ~30 %: cabeza y alas; el formulario del alta es largo y necesita el lugar. */
  baja: { fraccion: { normal: 0.3, corta: 0.26 }, minimo: 180, maximo: 340, inicioDelDegradado: 0.42, solapeDelTitulo: 24 },
};

/** Una pantalla «corta» (como en `useResponsive`): ahí el formulario necesita el alto. */
const PANTALLA_CORTA = 720;

/** Aire mínimo entre la barra de estado y la cabeza del fénix: nunca queda debajo de la hora. */
const AIRE_SOBRE_LA_CABEZA = 48;

/** Dónde termina la cola en la cabecera alta: casi al final, donde el degradado ya la está fundiendo. */
const COLA_EN_LA_CABECERA = 0.92;

/**
 * El alto de la cabecera, CONTANDO la franja de la barra de estado: la imagen va a sangre, detrás
 * de la hora y la batería, así que el porcentaje es de la pantalla entera.
 */
export function altoDeLaCabecera(altoDeLaVentana: number, variante: VarianteDeCabecera): number {
  const { fraccion, minimo, maximo } = MEDIDAS[variante];
  const f = altoDeLaVentana < PANTALLA_CORTA ? fraccion.corta : fraccion.normal;
  return Math.round(Math.min(maximo, Math.max(minimo, altoDeLaVentana * f)));
}

export function solapeDelTitulo(variante: VarianteDeCabecera): number {
  return MEDIDAS[variante].solapeDelTitulo;
}

export function inicioDelDegradado(alto: number, variante: VarianteDeCabecera): number {
  return Math.round(alto * MEDIDAS[variante].inicioDelDegradado);
}

/**
 * Cuánto se sube la imagen (en dp) dentro de la cabecera. La imagen se dibuja a su proporción
 * exacta (ancho de la pantalla × 1.5) y se corre hacia arriba esta cantidad; lo que sobra abajo
 * queda fuera de la cabecera.
 *
 * - **Alta (login):** la cola termina cerca del final de la cabecera, donde el degradado la funde,
 *   así se ve el fénix entero. La punta de las alas puede quedar detrás de la barra de estado.
 * - **Baja (alta de cuenta):** la cabeza queda en el centro de lo que se ve limpio (entre la barra
 *   de estado y donde el degradado ya tapa), con las alas alrededor.
 *
 * En los dos casos, nunca tanto como para que la cabeza quede debajo de la hora (pasa en pantallas
 * cortas: ahí se resigna la punta de la cola) ni tan poco que quede un hueco arriba.
 */
export function corrimientoDeLaImagen(medidas: {
  ancho: number;
  alto: number;
  /** Lo que tapa la barra de estado arriba (`insets.top`). */
  margenSuperior: number;
  variante: VarianteDeCabecera;
}): number {
  const { ancho, alto, margenSuperior, variante } = medidas;
  const altoDeLaImagen = ancho * PROPORCION_DE_LA_IMAGEN;
  const cabeza = CABEZA_EN_LA_IMAGEN * altoDeLaImagen;
  const deseado =
    variante === 'alta'
      ? COLA_EN_LA_IMAGEN * altoDeLaImagen - COLA_EN_LA_CABECERA * alto
      : cabeza - centroDeLoQueSeVeLimpio(alto, margenSuperior, variante);
  const maximoPorLaCabeza = cabeza - (margenSuperior + AIRE_SOBRE_LA_CABEZA);
  const maximoSinHueco = altoDeLaImagen - alto;
  return Math.round(Math.max(0, Math.min(deseado, maximoPorLaCabeza, maximoSinHueco)));
}

/**
 * El centro de la franja donde la imagen se ve sin velo: desde la barra de estado hasta un poco
 * después de donde empieza el degradado (ahí todavía tapa menos de un 15 %).
 */
function centroDeLoQueSeVeLimpio(alto: number, margenSuperior: number, variante: VarianteDeCabecera): number {
  const inicio = inicioDelDegradado(alto, variante);
  const limite = inicio + (alto - inicio) * 0.4;
  return (margenSuperior + limite) / 2;
}

/**
 * Las paradas del degradado que funde la imagen con el fondo: posición (0 arriba, 1 abajo) y
 * opacidad del color del fondo en ese punto.
 *
 * **Por qué así (`emil-design-eng`: nada que se note como un borde):** un degradado lineal de dos
 * paradas se ve como una BANDA — el ojo encuentra la línea donde empieza y la línea donde termina,
 * porque ahí la pendiente cambia de golpe. Con una curva suave en las dos puntas (`smoothstep`) no
 * hay línea de inicio ni de llegada. Además la curva va «tarde» (se eleva a 1.35 antes del
 * `smoothstep`): la primera mitad casi no tapa nada —ahí está la cola, que el dueño quiere ver— y
 * el fondo se cierra recién al final, detrás del título. Nueve paradas alcanzan para que el
 * gradiente lineal entre parada y parada no deje escalones visibles.
 */
export function paradasDelDegradado(cantidad = 9): { posiciones: number[]; opacidades: number[] } {
  const posiciones: number[] = [];
  const opacidades: number[] = [];
  for (let i = 0; i < cantidad; i++) {
    const t = i / (cantidad - 1);
    const x = Math.pow(t, 1.35);
    posiciones.push(redondear(t));
    opacidades.push(redondear(x * x * (3 - 2 * x)));
  }
  return { posiciones, opacidades };
}

/** Un color `#RRGGBB` con la opacidad dada, como `#RRGGBBAA` (lo que acepta `LinearGradient`). */
export function conOpacidad(colorHex: string, opacidad: number): string {
  const base = colorHex.slice(0, 7);
  const alfa = Math.round(Math.min(1, Math.max(0, opacidad)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${base}${alfa}`;
}

function redondear(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

/**
 * Una curva de nivel cerrada para la ilustración de respaldo (líneas topográficas): un círculo
 * deformado por dos ondulaciones lentas. Con el mismo `fase` en todas las curvas de un grupo, las
 * curvas quedan «paralelas», como en un mapa de relieve.
 */
export function curvaDeNivel(cx: number, cy: number, radio: number, fase: number, puntos = 72): string {
  const tramos: string[] = [];
  for (let i = 0; i <= puntos; i++) {
    const angulo = (i / puntos) * Math.PI * 2;
    const r = radio * (1 + 0.09 * Math.sin(3 * angulo + fase) + 0.05 * Math.sin(5 * angulo + fase * 1.7));
    const px = Math.round((cx + r * Math.cos(angulo)) * 100) / 100;
    const py = Math.round((cy + r * 0.72 * Math.sin(angulo)) * 100) / 100;
    tramos.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
  }
  return `${tramos.join(' ')} Z`;
}
