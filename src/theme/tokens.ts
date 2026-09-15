export type Palette = {
  canvas: string;
  bg: string;
  cardBg: string;
  cardBgAlt: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textStrong: string;
  textSoft: string;
  micro: string;
  gold: string;
  /* Acento dorado seguro para TEXTO e ICONOS. `gold` se mantiene para superficies
     (rellenos, barras, sombras, bordes), donde puede ser mas claro sin penalizar la
     lectura. Separarlos es lo que permite subir el contraste en claro sin apagar la marca. */
  goldInk: string;
  goldGrad: [string, string, string];
  onGold: string;
  tabInactive: string;
  ring1: string;
  ring2: string;
  ring3: string;
  /* Estado semantico. Antes eran literales repartidos por las pantallas ('#E06A66',
     '#70d2a0', '#4E9F76'...), elegidos mirando el tema oscuro y reutilizados igual en el
     claro, donde TODOS caian por debajo de AA (medido: 1.79-3.19 sobre #FDFCFA). */
  success: string;
  successWash: string;
  danger: string;
  dangerWash: string;
  /* Lavado dorado para superficies suaves; sustituye a los 'rgba(212,160,23,0.0x)' sueltos,
     que ademas usaban un dorado (#D4A017) que no esta en la paleta. */
  goldWash: string;
  chevron: string;
  placeholderA: string;
  placeholderB: string;
};

export const light: Palette = {
  canvas: '#E8E5E0',
  bg: '#FCFBF9',
  cardBg: '#FDFCFA',
  cardBgAlt: '#FFFFFF',
  border: '#E2DCD2',
  borderStrong: '#D6C9B0',
  divider: '#EDE7DC',
  text: '#1E1B18',
  textStrong: '#11100D',
  textSoft: '#4A453D',
  micro: '#856C35',
  gold: '#B2924F',
  goldInk: '#856C35',
  /* Casi plano a propósito (2026-09-14). Antes era ['#D8BE85', '#C2A263', '#A8873F']: un
     degradado de tres paradas con mucho recorrido, el "botón premium" que traen todas las
     plantillas. Ahora las tres paradas viven alrededor del dorado de marca, así que el botón se
     lee SÓLIDO con apenas un gesto de profundidad. Se toca acá y no en las pantallas porque son
     14 usos en 6 archivos: un valor, cero JSX, cero riesgo.
     De paso corrige un problema real de contraste: el texto (`onGold`) daba ~8:1 sobre la parada
     clara y ~5.3:1 sobre la oscura — el mismo botón, dos legibilidades. Ahora es ~6:1 parejo. */
  goldGrad: ['#BC9C58', '#B2924F', '#A68746'],
  onGold: '#1A1509',
  tabInactive: '#736C60',
  success: '#2E7D52',
  successWash: 'rgba(46,125,82,0.10)',
  danger: '#C0392B',
  dangerWash: 'rgba(192,57,43,0.08)',
  goldWash: 'rgba(178,146,79,0.10)',
  ring1: 'rgba(178,146,79,0.10)',
  ring2: 'rgba(178,146,79,0.14)',
  ring3: 'rgba(178,146,79,0.20)',
  chevron: '#847A68',
  placeholderA: '#EFEAE1',
  placeholderB: '#F7F3EC',
};

export const dark: Palette = {
  canvas: '#0A0908',
  bg: '#0C0B09',
  cardBg: '#161513',
  cardBgAlt: '#201F1C',
  border: 'rgba(198,164,92,0.20)',
  borderStrong: 'rgba(198,164,92,0.38)',
  divider: 'rgba(255,255,255,0.08)',
  text: '#F6F4EE',
  textStrong: '#FFFFFF',
  textSoft: '#C5BEB3',
  micro: '#D4AF37',
  gold: '#C6A45C',
  goldInk: '#C6A45C',
  /* Mismo criterio que en claro: alrededor de `gold` (#C6A45C), no un barrido de claro a oscuro. */
  goldGrad: ['#D0AE66', '#C6A45C', '#BC9A52'],
  onGold: '#1A1509',
  tabInactive: '#968E82',
  success: '#70D2A0',
  successWash: 'rgba(112,210,160,0.12)',
  danger: '#E06A66',
  dangerWash: 'rgba(224,106,102,0.12)',
  goldWash: 'rgba(198,164,92,0.12)',
  ring1: 'rgba(198,164,92,0.08)',
  ring2: 'rgba(198,164,92,0.14)',
  ring3: 'rgba(198,164,92,0.22)',
  chevron: '#8F8678',
  placeholderA: '#14130F',
  placeholderB: '#1B1915',
};

/**
 * La escala tipográfica. **Las CLAVES son contrato**: las leen las 38 pantallas vía `t.hero`,
 * `t.body`… Se pueden cambiar los valores; no se puede renombrar ni quitar una clave sin tocar
 * todo lo que la usa.
 *
 * ## Qué cambió el 2026-09-14, y por qué
 *
 * La jerarquía estaba construida **casi entera sobre el espaciado de letras**: `hero` a 34 px con
 * `letterSpacing: 8`, `screenTitle` con 2.5, `sectionTitle` con 1.8, `micro` con 1.6. Todo en la
 * misma familia (Jost) y casi todo en el mismo peso (`400Regular`). El resultado es que un título
 * no se veía *importante*, se veía *estirado* — y es exactamente la huella del template genérico:
 * cuando lo único que distingue a un titular es que tiene las letras separadas, la pantalla se lee
 * como una plantilla, no como una marca.
 *
 * Tres correcciones, en orden de impacto:
 *
 * 1. **Una serif editorial para los títulos de display** (`hero`, `screenTitle`). Es lo que da el
 *    aire de revista de la referencia que pidió el dueño. Fraunces y no Playfair a propósito:
 *    Playfair es *la* serif por defecto de todo rediseño, y volvía a caer en lo genérico.
 * 2. **Tracking negativo en los tamaños grandes.** Un titular de 38 px con las letras separadas se
 *    deshace; junto, pesa. Es la regla contraria a la de los rótulos chicos, que sí necesitan aire
 *    (`micro`, `sectionTitle`) — pero menos del que tenían.
 * 3. **Cifras tabulares en `metric`.** Los números que cambian —día de programa, puntos, racha—
 *    saltaban de ancho al pasar de 9 a 10, y con ellos saltaba todo lo que tuvieran al lado.
 *
 * ## Lo que NO cambió, y por qué
 *
 * **Todo el texto de lectura sigue en Jost 400/500/700**, como manda `AGENTS.md` §4. La serif entra
 * sólo en display (≥ 24 px); nada que se lea en párrafo la toca. Los tamaños mínimos de §4 se
 * respetan: párrafo 15, ayuda 13, micro 10.5.
 */
import type { TextStyle } from 'react-native';

/** Ancho de dígito fijo. Tipado acá para no pelear con el tipo `FontVariant[]` en cada uso. */
const CIFRAS_TABULARES: TextStyle['fontVariant'] = ['tabular-nums'];

export const type = {
  /** Display grande: portada, números de hito, el saludo del login. */
  hero: { fontFamily: 'Fraunces_700Bold', fontSize: 38, letterSpacing: -1.2, lineHeight: 42 },
  /** Título de pantalla. */
  screenTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, letterSpacing: -0.4, lineHeight: 31 },
  /** Rótulo de sección. Sigue en versalitas espaciadas, pero con la mitad del tracking de antes. */
  sectionTitle: { fontFamily: 'Jost_500Medium', fontSize: 12, letterSpacing: 1.2 },
  sectionSub: { fontFamily: 'Jost_400Regular', fontSize: 13, letterSpacing: 0.2, lineHeight: 19 },
  micro: { fontFamily: 'Jost_500Medium', fontSize: 10.5, letterSpacing: 1.1 },
  cardTitle: { fontFamily: 'Jost_500Medium', fontSize: 16, letterSpacing: -0.1 },
  body: { fontFamily: 'Jost_400Regular', fontSize: 15, lineHeight: 22 },
  small: { fontFamily: 'Jost_400Regular', fontSize: 13, lineHeight: 19 },
  /** Cifras. Jost y no la serif: Fraunces no garantiza figuras tabulares. */
  metric: { fontFamily: 'Jost_500Medium', fontSize: 28, letterSpacing: -0.5, fontVariant: CIFRAS_TABULARES },
  tab: { fontFamily: 'Jost_500Medium', fontSize: 11, letterSpacing: 0 },
} satisfies Record<string, TextStyle>;

/**
 * Espaciado y radios.
 *
 * `radius` dejó de ser uno solo: un contenedor y lo que vive adentro no pueden tener la misma
 * curva — cuando la tienen, el interior se ve pegado al borde. La regla es **curva más suave
 * afuera, más cerrada adentro** (`radius` 20 para tarjetas y hojas, `radiusSm` 12 para píldoras,
 * campos y botones dentro de una tarjeta).
 *
 * `gapLg` es nuevo y existe para lo que la referencia del dueño hace mejor que esta app: **dejar
 * respirar**. Entre bloques distintos de una pantalla, 16 px es poco.
 */
export const space = { screenX: 24, cardPad: 18, gap: 16, gapLg: 28, radius: 20, radiusSm: 12 };